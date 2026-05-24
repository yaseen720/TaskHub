import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, KeyRound, Plus, X, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function WorkspaceSetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Create workspace state
  const [wsName, setWsName] = useState('');
  const [wsDescription, setWsDescription] = useState('');

  // Join workspace state
  const [securityKey, setSecurityKey] = useState('');
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [joinMessage, setJoinMessage] = useState('');

  const generateSecurityKey = () => {
    return 'WS-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateWorkspace = async () => {
    if (!wsName.trim()) return;
    setLoading(true);
    console.log('Starting workspace creation...');
    try {
      const user = await base44.auth.me();
      const key = generateSecurityKey();
      console.log('User identified:', user.email);
      
      const workspace = await base44.entities.Workspace.create({
        name: wsName.trim(),
        description: wsDescription.trim(),
        security_key: key,
        owner_email: user.email,
      });
      console.log('Workspace created:', workspace.id);

      await base44.entities.WorkspaceMember.create({
        workspace_id: workspace.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        role: 'admin',
        status: 'active',
      });
      console.log('Admin membership created');

      toast.success(`Workspace created! Security key: ${key}`, { duration: 8000 });
      localStorage.setItem('taskhub_active_workspace', workspace.id);
      
      console.log('Redirecting to dashboard...');
      navigate('/dashboard');
      window.location.reload();
    } catch (error) {
      console.error('Workspace creation failed:', error);
      toast.error(error.message || 'Failed to create workspace. Check if database tables are created.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWorkspace = async () => {
    if (!securityKey.trim()) return;
    setLoading(true);
    console.log('Attempting to join workspace with key:', securityKey.trim());
    try {
      const user = await base44.auth.me();
      
      // Find workspace by security key
      const workspaces = await base44.entities.Workspace.filter({ security_key: securityKey.trim() });
      
      if (workspaces.length === 0) {
        toast.error('Invalid security key. Please check and try again.');
        setLoading(false);
        return;
      }

      const workspace = workspaces[0];
      console.log('Found workspace:', workspace.id);

      // Check if already a member
      const existing = await base44.entities.WorkspaceMember.filter({
        workspace_id: workspace.id,
        user_email: user.email,
      });
      if (existing.length > 0) {
        toast.info('You are already a member of this workspace!');
        localStorage.setItem('taskhub_active_workspace', workspace.id);
        navigate('/dashboard');
        window.location.reload();
        return;
      }

      // Check if already has a pending request
      const existingReq = await base44.entities.JoinRequest.filter({
        workspace_id: workspace.id,
        user_email: user.email,
        status: 'pending',
      });
      if (existingReq.length > 0) {
        toast.info('You already have a pending request for this workspace.');
        setLoading(false);
        return;
      }

      // Create join request
      await base44.entities.JoinRequest.create({
        workspace_id: workspace.id,
        user_email: user.email,
        user_name: user.full_name || user.email,
        skills: skills,
        message: joinMessage.trim(),
        status: 'pending',
      });

      // Notify the workspace admin
      await base44.entities.Notification.create({
        workspace_id: workspace.id,
        user_email: workspace.owner_email,
        title: 'New Join Request',
        message: `${user.full_name || user.email} wants to join your workspace`,
        type: 'join_request',
      });

      toast.success('Join request sent! The admin will review your request.');
    } catch (error) {
      console.error('Join workspace failed:', error);
      toast.error(error.message || 'Failed to join workspace.');
    } finally {
      setLoading(false);
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary items-center justify-center mb-4">
            <span className="text-primary-foreground font-bold text-xl">TH</span>
          </div>
          <h1 className="text-3xl font-bold">Welcome to TaskHub</h1>
          <p className="text-muted-foreground mt-2">Create a workspace or join an existing one</p>
        </div>

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="create">Create Workspace</TabsTrigger>
            <TabsTrigger value="join">Join Workspace</TabsTrigger>
          </TabsList>

          <TabsContent value="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Create a New Workspace
                </CardTitle>
                <CardDescription>
                  Set up your company workspace and invite team members
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Workspace Name</Label>
                  <Input
                    placeholder="e.g. Acme Inc."
                    value={wsName}
                    onChange={e => setWsName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    placeholder="Brief description of your workspace..."
                    value={wsDescription}
                    onChange={e => setWsDescription(e.target.value)}
                    className="h-20"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleCreateWorkspace}
                  disabled={!wsName.trim() || loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Create Workspace
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="join">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  Join a Workspace
                </CardTitle>
                <CardDescription>
                  Enter the security key provided by your workspace admin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Security Key</Label>
                  <Input
                    placeholder="e.g. WS-ABC123"
                    value={securityKey}
                    onChange={e => setSecurityKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Your Skills</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill..."
                      value={skillInput}
                      onChange={e => setSkillInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button variant="outline" onClick={addSkill}>Add</Button>
                  </div>
                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {skills.map(s => (
                        <Badge key={s} variant="secondary" className="gap-1">
                          {s}
                          <X className="h-3 w-3 cursor-pointer" onClick={() => setSkills(skills.filter(sk => sk !== s))} />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Message (optional)</Label>
                  <Textarea
                    placeholder="Tell the admin a bit about yourself..."
                    value={joinMessage}
                    onChange={e => setJoinMessage(e.target.value)}
                    className="h-20"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleJoinWorkspace}
                  disabled={!securityKey.trim() || loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <KeyRound className="h-4 w-4 mr-2" />}
                  Send Join Request
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}