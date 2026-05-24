import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Mail, Briefcase, Shield, CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default function MemberInfoDialog({ member, tasks, open, onOpenChange }) {
  if (!member) return null;

  const memberTasks = tasks.filter(t => t.assigned_to === member.user_email);
  const completed = memberTasks.filter(t => t.status === 'approved').length;
  const pending = memberTasks.filter(t => t.status === 'pending').length;
  const inProgress = memberTasks.filter(t => t.status === 'in_progress').length;
  const submitted = memberTasks.filter(t => t.status === 'submitted').length;
  const rate = memberTasks.length > 0 ? Math.round((completed / memberTasks.length) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Member Info</DialogTitle>
        </DialogHeader>
        <div className="space-y-5 mt-2">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-bold text-2xl">
                {member.user_name?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold">{member.user_name || member.user_email}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" /> {member.user_email}
              </p>
              <div className="flex gap-2 mt-1">
                <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                  {member.role === 'admin' ? <Shield className="h-3 w-3 mr-1" /> : <Briefcase className="h-3 w-3 mr-1" />}
                  {member.role}
                </Badge>
                <Badge variant="outline" className="text-xs">{member.status}</Badge>
              </div>
            </div>
          </div>

          {/* Task Stats */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Tasks', value: memberTasks.length, color: 'text-foreground' },
              { label: 'Completed', value: completed, color: 'text-green-600' },
              { label: 'In Progress', value: inProgress, color: 'text-blue-600' },
              { label: 'Pending', value: pending, color: 'text-yellow-600' },
              { label: 'Submitted', value: submitted, color: 'text-purple-600' },
              { label: 'Completion Rate', value: `${rate}%`, color: rate >= 70 ? 'text-green-600' : 'text-orange-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Skills */}
          {member.skills?.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {member.skills.map(s => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Joined date */}
          {member.created_date && (
            <p className="text-xs text-muted-foreground">
              Joined {format(new Date(member.created_date), 'MMMM d, yyyy')}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}