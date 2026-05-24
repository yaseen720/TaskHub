import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import StatCard from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { CheckCircle2, Clock, TrendingUp, Users, AlertTriangle, Target } from 'lucide-react';
import { subDays, format, isSameDay, startOfDay } from 'date-fns';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#f97316', '#06b6d4'];

export default function Analytics() {
  const { activeWorkspace } = useWorkspace();
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

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'approved').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && !['approved', 'missed'].includes(t.status)).length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const activeMembers = members.filter(m => m.role === 'employee').length;

  // Tasks over last 14 days
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const date = subDays(new Date(), 13 - i);
    const dayTasks = tasks.filter(t => isSameDay(new Date(t.created_date), date));
    const dayCompleted = tasks.filter(t => t.status === 'approved' && t.submission_date && isSameDay(new Date(t.submission_date), date));
    return {
      date: format(date, 'MMM d'),
      created: dayTasks.length,
      completed: dayCompleted.length,
    };
  });

  // Priority distribution
  const priorityData = ['low', 'medium', 'high', 'urgent'].map(p => ({
    name: p,
    value: tasks.filter(t => t.priority === p).length,
  })).filter(d => d.value > 0);

  // Category distribution
  const categories = {};
  tasks.forEach(t => {
    if (t.category) categories[t.category] = (categories[t.category] || 0) + 1;
  });
  const categoryData = Object.entries(categories).map(([name, value]) => ({ name, value }));

  // Employee performance
  const employeePerf = members.filter(m => m.role === 'employee').map(m => {
    const mTasks = tasks.filter(t => t.assigned_to === m.user_email);
    const mCompleted = mTasks.filter(t => t.status === 'approved').length;
    return {
      name: m.user_name?.split(' ')[0] || m.user_email.split('@')[0],
      total: mTasks.length,
      completed: mCompleted,
      rate: mTasks.length > 0 ? Math.round((mCompleted / mTasks.length) * 100) : 0,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={total} icon={Target} />
        <StatCard title="Completion Rate" value={`${completionRate}%`} icon={TrendingUp} />
        <StatCard title="Overdue" value={overdue} icon={AlertTriangle} />
        <StatCard title="Active Employees" value={activeMembers} icon={Users} />
      </div>

      {/* Tasks over time */}
      <Card>
        <CardHeader><CardTitle className="text-base">Task Activity (Last 14 Days)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={last14}>
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="created" stroke="hsl(243, 75%, 59%)" strokeWidth={2} dot={false} name="Created" />
              <Line type="monotone" dataKey="completed" stroke="hsl(152, 60%, 42%)" strokeWidth={2} dot={false} name="Completed" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority */}
        <Card>
          <CardHeader><CardTitle className="text-base">Priority Distribution</CardTitle></CardHeader>
          <CardContent>
            {priorityData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={priorityData} cx="50%" cy="50%" innerRadius={40} outerRadius={75} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {priorityData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No data</p>}
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" fill="hsl(243, 75%, 59%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <p className="text-center text-muted-foreground py-8 text-sm">No categories yet</p>}
          </CardContent>
        </Card>
      </div>

      {/* Employee performance */}
      <Card>
        <CardHeader><CardTitle className="text-base">Employee Performance</CardTitle></CardHeader>
        <CardContent>
          {employeePerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={employeePerf} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(243, 75%, 59%)" radius={[0, 4, 4, 0]} name="Total" />
                <Bar dataKey="completed" fill="hsl(152, 60%, 42%)" radius={[0, 4, 4, 0]} name="Completed" />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-center text-muted-foreground py-8 text-sm">No employees yet</p>}
        </CardContent>
      </Card>
    </div>
  );
}