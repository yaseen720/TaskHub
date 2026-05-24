import React, { useState } from 'react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Copy, Save, Loader2, KeyRound, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { activeWorkspace, isAdmin, refreshWorkspaces } = useWorkspace();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(activeWorkspace?.name || '');
  const [description, setDescription] = useState(activeWorkspace?.description || '');

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    await base44.entities.Workspace.update(activeWorkspace.id, {
      name: name.trim(),
      description: description.trim(),
    });
    toast.success('Workspace updated');
    refreshWorkspaces();
    setLoading(false);
  };

  const copyKey = () => {
    navigator.clipboard.writeText(activeWorkspace?.security_key || '');
    toast.success('Security key copied!');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workspace Details
          </CardTitle>
          <CardDescription>Manage your workspace settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Workspace Name</Label>
            <Input value={name} onChange={e => setName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} disabled={!isAdmin} className="h-20" />
          </div>
          {isAdmin && (
            <Button onClick={handleSave} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Changes
            </Button>
          )}
        </CardContent>
      </Card>

      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5" />
              Security Key
            </CardTitle>
            <CardDescription>Share this key with team members so they can join your workspace</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input value={activeWorkspace?.security_key || ''} readOnly className="font-mono" />
              <Button variant="outline" onClick={copyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Workspace ID</CardTitle>
        </CardHeader>
        <CardContent>
          <Input value={activeWorkspace?.id || ''} readOnly className="font-mono text-xs" />
        </CardContent>
      </Card>
    </div>
  );
}