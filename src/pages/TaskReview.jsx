import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Search, Filter, Eye } from 'lucide-react';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
  missed: 'bg-gray-100 text-gray-700',
};

const STATUS_FILTERS = ['all', 'pending', 'in_progress', 'submitted', 'approved', 'rejected', 'late', 'missed'];

export default function TaskReview() {
  const { activeWorkspace, isAdmin, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);

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

  // Sort by most recent first
  const sorted = [...tasks].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const filtered = sorted.filter(t => {
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase()) || t.assigned_to_name?.toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  const counts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    submitted: tasks.filter(t => t.status === 'submitted').length,
    approved: tasks.filter(t => t.status === 'approved').length,
    rejected: tasks.filter(t => t.status === 'rejected').length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Task Review</h1>
        <p className="text-muted-foreground text-sm mt-1">All tasks — most recent first</p>
      </div>

      {/* Summary badges */}
      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.filter(s => s !== 'all' && s !== 'late' && s !== 'missed').map(s => (
          <div key={s} className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-all ${statusFilter === s ? 'ring-2 ring-primary' : ''} ${STATUS_COLORS[s] || 'bg-gray-100 text-gray-700'}`}
            onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}>
            {s.replace('_', ' ')} · {counts[s] || 0}
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by title or assignee..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map(s => (
            <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'}
              onClick={() => setStatusFilter(s)} className="text-xs h-9 capitalize">
              {s === 'all' ? `All (${tasks.length})` : s.replace('_', ' ')}
            </Button>
          ))}
        </div>
      </div>

      {/* Task Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="text-left p-3 font-semibold">Title</th>
                  <th className="text-left p-3 font-semibold">Assigned To</th>
                  <th className="text-left p-3 font-semibold">Status</th>
                  <th className="text-left p-3 font-semibold">Priority</th>
                  <th className="text-left p-3 font-semibold">Due Date</th>
                  <th className="text-left p-3 font-semibold">Created</th>
                  <th className="text-left p-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">No tasks found</td>
                  </tr>
                )}
                {filtered.map(task => (
                  <tr key={task.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-medium max-w-[200px] truncate">{task.title}</td>
                    <td className="p-3 text-muted-foreground">{task.assigned_to_name || task.assigned_to || '—'}</td>
                    <td className="p-3">
                      <Badge className={`${STATUS_COLORS[task.status]} text-xs`}>{task.status?.replace('_', ' ')}</Badge>
                    </td>
                    <td className="p-3 capitalize text-muted-foreground">{task.priority || '—'}</td>
                    <td className="p-3 text-muted-foreground">
                      {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {task.created_date ? format(new Date(task.created_date), 'MMM d, yyyy') : '—'}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedTask(task)}>
                        <Eye className="h-4 w-4 mr-1" /> View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          isAdmin={isAdmin}
          members={members}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}