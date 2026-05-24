import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function TaskDialog({ open, onOpenChange, members, workspaceId, editTask }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: editTask?.title || '',
    description: editTask?.description || '',
    priority: editTask?.priority || 'medium',
    category: editTask?.category || '',
    assigned_to: editTask?.assigned_to || '',
    due_date: editTask?.due_date || '',
  });
  const [files, setFiles] = useState([]);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.title.trim()) return;
    setLoading(true);

    try {
      let file_urls = editTask?.file_urls || [];
      if (files.length > 0) {
        for (const f of files) {
          const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
          file_urls.push(file_url);
        }
      }

      const assignedMember = members.find(m => m.user_email === form.assigned_to);
      const taskData = {
        workspace_id: workspaceId,
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        category: form.category.trim(),
        assigned_to: form.assigned_to,
        assigned_to_name: assignedMember?.user_name || '',
        due_date: form.due_date || null,
        status: editTask?.status || 'todo',
        file_urls,
      };

      if (editTask) {
        await base44.entities.Task.update(editTask.id, taskData);
        toast.success('Task updated');
      } else {
        await base44.entities.Task.create(taskData);
        
        // Notify assigned employee
        if (form.assigned_to) {
          await base44.entities.Notification.create({
            workspace_id: workspaceId,
            user_email: form.assigned_to,
            title: 'New Task Assigned',
            message: `You have been assigned: "${form.title}"`,
            type: 'task_assigned',
          });
        }
        toast.success('Task created');
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['myTasks'] });
      onOpenChange(false);
    } catch (error) {
      console.error('Task error:', error);
      toast.error(error.message || 'Failed to save task. Check database columns.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editTask ? 'Edit Task' : 'Create New Task'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input placeholder="Task title" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="Task details..." value={form.description} onChange={e => set('description', e.target.value)} className="h-24" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => set('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => set('due_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={form.assigned_to} onValueChange={v => set('assigned_to', v)}>
                <SelectTrigger><SelectValue placeholder="Select member" /></SelectTrigger>
                <SelectContent>
                  {members.filter(m => m.role === 'employee').map(m => (
                    <SelectItem key={m.user_email} value={m.user_email}>
                      {m.user_name || m.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input placeholder="e.g. Design, Dev" value={form.category} onChange={e => set('category', e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input type="file" multiple className="hidden" id="task-files" onChange={e => setFiles([...e.target.files])} />
              <label htmlFor="task-files" className="cursor-pointer flex flex-col items-center gap-1">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Click to upload files</span>
              </label>
              {files.length > 0 && (
                <p className="text-xs text-muted-foreground mt-2">{files.length} file(s) selected</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading || !form.title.trim()}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {editTask ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}