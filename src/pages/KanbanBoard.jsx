import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Calendar, User, Paperclip, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import TaskDialog from '@/components/tasks/TaskDialog';
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet';

const COLUMNS = [
  { id: 'pending', label: 'To Do', color: 'bg-yellow-500' },
  { id: 'in_progress', label: 'In Progress', color: 'bg-blue-500' },
  { id: 'submitted', label: 'Submitted', color: 'bg-purple-500' },
  { id: 'approved', label: 'Approved', color: 'bg-green-500' },
  { id: 'rejected', label: 'Rejected', color: 'bg-red-500' },
];

const PRIORITY_COLORS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  low: 'bg-green-100 text-green-700 border-green-200',
};

export default function KanbanBoard() {
  const { activeWorkspace, isAdmin, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', wsId],
    queryFn: () => {
      if (isAdmin) {
        return base44.entities.Task.filter({ workspace_id: wsId });
      }
      return base44.entities.Task.filter({ workspace_id: wsId, assigned_to: currentUser.email });
    },
    enabled: !!wsId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => base44.entities.WorkspaceMember.filter({ workspace_id: wsId, status: 'active' }),
    enabled: !!wsId,
  });

  const updateTask = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('taskId', taskId);
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    if (taskId) {
      updateTask.mutate({ id: taskId, data: { status: newStatus } });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{isAdmin ? 'Kanban Board' : 'My Tasks'}</h1>
          <p className="text-muted-foreground text-sm mt-1">{tasks.length} tasks total</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> New Task
          </Button>
        )}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div
              key={col.id}
              className="min-w-[280px] w-[280px] shrink-0"
              onDragOver={e => e.preventDefault()}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`h-2.5 w-2.5 rounded-full ${col.color}`} />
                <span className="text-sm font-semibold">{col.label}</span>
                <Badge variant="secondary" className="ml-auto text-xs h-5">{colTasks.length}</Badge>
              </div>
              <div className="space-y-2.5 min-h-[200px] p-1">
                {colTasks.map(task => (
                  <Card
                    key={task.id}
                    draggable={isAdmin}
                    onDragStart={e => handleDragStart(e, task.id)}
                    onClick={() => setSelectedTask(task)}
                    className="cursor-pointer hover:shadow-md transition-all group"
                  >
                    <CardContent className="p-3.5">
                      {isAdmin && (
                        <GripVertical className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground mb-1" />
                      )}
                      <p className="text-sm font-medium leading-snug">{task.title}</p>
                      {task.category && (
                        <Badge variant="outline" className="text-[10px] mt-2 h-5">{task.category}</Badge>
                      )}
                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                        {task.assigned_to_name && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {task.assigned_to_name.split(' ')[0]}
                          </span>
                        )}
                        {task.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(task.due_date), 'MMM d')}
                          </span>
                        )}
                        {task.file_urls?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Paperclip className="h-3 w-3" />
                            {task.file_urls.length}
                          </span>
                        )}
                      </div>
                      {task.priority && (
                        <Badge className={`mt-2 text-[10px] h-5 ${PRIORITY_COLORS[task.priority] || ''}`}>
                          {task.priority}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {createOpen && (
        <TaskDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          members={members}
          workspaceId={wsId}
        />
      )}

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