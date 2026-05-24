import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Users, Shield, Briefcase, Mail, UserPlus, Info } from 'lucide-react';
import EmptyState from '@/components/shared/EmptyState';
import AddMemberDialog from '@/components/team/AddMemberDialog';
import MemberInfoDialog from '@/components/team/MemberInfoDialog';

export default function Team() {
  const { activeWorkspace, isAdmin } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const { data: members = [] } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => base44.entities.WorkspaceMember.filter({ workspace_id: wsId }),
    enabled: !!wsId,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', wsId],
    queryFn: () => base44.entities.Task.filter({ workspace_id: wsId }),
    enabled: !!wsId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['members'] });

  if (members.length === 0) {
    return (
      <>
        <EmptyState icon={Users} title="No team members yet" description="Add members or share the workspace security key so employees can request to join."
          actionLabel={isAdmin ? 'Add Member' : undefined}
          onAction={isAdmin ? () => setAddOpen(true) : undefined}
        />
        {isAdmin && <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} workspaceId={wsId} onSuccess={refresh} />}
      </>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team Members</h1>
          <p className="text-muted-foreground text-sm mt-1">{members.length} members</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map(member => {
          const memberTasks = tasks.filter(t => t.assigned_to === member.user_email);
          const completed = memberTasks.filter(t => t.status === 'approved').length;
          return (
            <Card key={member.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-primary font-semibold">
                      {member.user_name?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{member.user_name || member.user_email}</p>
                    <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {member.user_email}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                        {member.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <Briefcase className="h-3 w-3 mr-1" />}
                        {member.role}
                      </Badge>
                      <Badge variant="outline" className="text-xs">{member.status}</Badge>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="shrink-0 h-8 w-8" onClick={() => setSelectedMember(member)}>
                    <Info className="h-4 w-4" />
                  </Button>
                </div>
                {member.skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {member.skills.map(s => (
                      <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t text-xs text-muted-foreground">
                  <span>{memberTasks.length} tasks</span>
                  <span>{completed} completed</span>
                  <span>{memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0}% rate</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {isAdmin && (
        <AddMemberDialog open={addOpen} onOpenChange={setAddOpen} workspaceId={wsId} onSuccess={refresh} />
      )}
      <MemberInfoDialog
        member={selectedMember}
        tasks={tasks}
        open={!!selectedMember}
        onOpenChange={open => !open && setSelectedMember(null)}
      />
    </div>
  );
}