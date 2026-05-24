import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UserPlus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function AddMemberDialog({ open, onOpenChange, workspaceId, onSuccess }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('employee');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(false);

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills([...skills, s]);
    setSkillInput('');
  };

  const handleSubmit = async () => {
    if (!email || !name) return;
    setLoading(true);

    // Check if already a member
    const existing = await base44.entities.WorkspaceMember.filter({ workspace_id: workspaceId, user_email: email });
    if (existing.length > 0) {
      toast.error('This person is already a member of the workspace.');
      setLoading(false);
      return;
    }

    await base44.entities.WorkspaceMember.create({
      workspace_id: workspaceId,
      user_email: email,
      user_name: name,
      role,
      skills,
      status: 'active',
    });

    // Send invite email
    await base44.integrations.Core.SendEmail({
      to: email,
      subject: 'You have been added to a workspace on TaskHub',
      body: `<p>Hi ${name},</p><p>You have been added to a workspace on TaskHub.</p><p>Please log in to get started.</p>`,
    });

    toast.success('Member added and notified via email!');
    setLoading(false);
    onOpenChange(false);
    setName(''); setEmail(''); setRole('employee'); setSkills([]);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Add Team Member</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Full Name *</Label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="John Doe" className="mt-1" />
          </div>
          <div>
            <Label>Email Address *</Label>
            <Input value={email} onChange={e => setEmail(e.target.value)} placeholder="john@example.com" className="mt-1" type="email" />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Skills (optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="e.g. Design"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())} />
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>Add</Button>
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {skills.map(s => (
                  <span key={s} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs">
                    {s}
                    <button onClick={() => setSkills(skills.filter(x => x !== s))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading || !email || !name}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UserPlus className="h-4 w-4 mr-2" />}
            Add Member
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}