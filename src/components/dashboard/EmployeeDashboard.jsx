import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, KanbanSquare } from 'lucide-react';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
  missed: 'bg-gray-100 text-gray-700',
};

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-green-100 text-green-700',
};

export default function EmployeeDashboard() {
  const { activeWorkspace, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;

  const { data: tasks = [] } = useQuery({
    queryKey: ['myTasks', wsId, currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ workspace_id: wsId, assigned_to: currentUser.email }),
    enabled: !!wsId && !!currentUser,
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'approved').length;
  const inProgress = tasks.filter(t => t.status === 'in_progress').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['approved', 'missed'].includes(t.status)).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Consistency heatmap (last 12 weeks)
  const today = new Date();
  const weeks = [];
  for (let w = 11; w >= 0; w--) {
    const weekStart = startOfWeek(new Date(today.getTime() - w * 7 * 24 * 60 * 60 * 1000));
    const weekEnd = endOfWeek(weekStart);
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd });
    weeks.push(days);
  }

  const getActivityForDay = (day) => {
    return tasks.filter(t => {
      if (t.status === 'approved' && t.submission_date) {
        return isSameDay(new Date(t.submission_date), day);
      }
      return false;
    }).length;
  };

  // Upcoming tasks (next 7 days)
  const upcomingTasks = tasks
    .filter(t => t.due_date && !['approved', 'missed'].includes(t.status))
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hi, {currentUser?.full_name?.split(' ')[0]}!</h1>
        <p className="text-muted-foreground text-sm mt-1">Here's your progress overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Tasks" value={totalTasks} icon={KanbanSquare} />
        <StatCard title="Completed" value={completedTasks} icon={CheckCircle2} />
        <StatCard title="In Progress" value={inProgress} icon={Clock} />
        <StatCard title="Overdue" value={overdue} icon={AlertTriangle} />
      </div>

      {/* Performance score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Completion Rate</p>
              <p className="text-4xl font-bold mt-1">{completionRate}%</p>
            </div>
            <div className="h-20 w-20 rounded-full border-4 border-primary flex items-center justify-center">
              <span className="text-xl font-bold text-primary">{completionRate}%</span>
            </div>
          </div>
          <div className="mt-4 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${completionRate}%` }} />
          </div>
        </CardContent>
      </Card>

      {/* Consistency Heatmap */}
      <Card>
        <CardHeader><CardTitle className="text-base">Activity Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-1 overflow-x-auto pb-2">
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-1">
                {week.map((day, di) => {
                  const activity = getActivityForDay(day);
                  const opacity = activity === 0 ? 'bg-muted' : activity === 1 ? 'bg-primary/30' : activity === 2 ? 'bg-primary/60' : 'bg-primary';
                  return (
                    <div
                      key={di}
                      className={`h-3.5 w-3.5 rounded-sm ${opacity}`}
                      title={`${format(day, 'MMM d')}: ${activity} task(s)`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Upcoming tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
          <Link to="/kanban"><Button size="sm" variant="ghost">View All</Button></Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {upcomingTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No upcoming deadlines</p>}
            {upcomingTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Due {format(new Date(task.due_date), 'MMM d, yyyy')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge className={PRIORITY_COLORS[task.priority] || 'bg-gray-100'}>{task.priority}</Badge>
                  <Badge className={STATUS_COLORS[task.status] || 'bg-gray-100'}>{task.status?.replace('_', ' ')}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}