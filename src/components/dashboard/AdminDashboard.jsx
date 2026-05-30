import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, CheckCircle2, Clock, AlertTriangle, KanbanSquare, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
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

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#94a3b8'];

export default function AdminDashboard() {
  const { activeWorkspace, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', wsId],
    queryFn: () => base44.entities.Task.filter({ workspace_id: wsId }),
    enabled: !!wsId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => base44.entities.WorkspaceMember.filter({ workspace_id: wsId, status: 'active' }),
    enabled: !!wsId,
  });

  const { data: joinRequests = [] } = useQuery({
    queryKey: ['joinRequests', wsId],
    queryFn: () => base44.entities.JoinRequest.filter({ workspace_id: wsId, status: 'pending' }),
    enabled: !!wsId,
  });

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'approved').length;
  const pendingSubmissions = tasks.filter(t => t.status === 'submitted').length;
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['approved', 'missed'].includes(t.status)).length;

  // Status distribution for pie chart
  const statusCounts = tasks.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1;
    return acc;
  }, {});
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  // Tasks per member for bar chart
  const memberTaskCounts = members.map(m => ({
    name: m.user_name?.split(' ')[0] || m.user_email?.split('@')[0] || 'Unknown',
    tasks: tasks.filter(t => t.assigned_to === m.user_email).length,
    completed: tasks.filter(t => t.assigned_to === m.user_email && t.status === 'approved').length,
  }));

  // Recent tasks
  const recentTasks = [...tasks].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome back, {currentUser?.full_name?.split(' ')[0]}</h1>
        <p className="text-muted-foreground text-sm mt-1">{activeWorkspace?.name} — Admin Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={totalTasks} icon={KanbanSquare} />
        <StatCard title="Completed" value={completedTasks} icon={CheckCircle2} />
        <StatCard title="Team Members" value={members.length} icon={Users} />
        <StatCard title="Pending Reviews" value={pendingSubmissions} icon={Clock} />
      </div>

      {/* Join requests alert */}
      {joinRequests.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserPlus className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{joinRequests.length} pending join request(s)</span>
            </div>
            <Link to="/join-requests">
              <Button size="sm" variant="outline">Review</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Task Distribution</CardTitle></CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12 text-sm">No tasks yet</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tasks Per Member</CardTitle></CardHeader>
          <CardContent>
            {memberTaskCounts.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={memberTaskCounts}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="hsl(243, 75%, 59%)" radius={[4, 4, 0, 0]} name="Total" />
                  <Bar dataKey="completed" fill="hsl(152, 60%, 42%)" radius={[4, 4, 0, 0]} name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-12 text-sm">No members yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Tasks</CardTitle>
          <Link to="/tasks"><Button size="sm" variant="ghost">View All</Button></Link>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentTasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No tasks created yet</p>}
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{task.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {task.assigned_to_name || task.assigned_to || 'Unassigned'}
                    {task.due_date && ` · Due ${format(new Date(task.due_date), 'MMM d')}`}
                  </p>
                </div>
                <Badge className={STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-700'}>
                  {task.status?.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}