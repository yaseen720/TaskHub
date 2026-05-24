import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CalendarOff, Plus, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

export default function LeaveRequests() {
  const { activeWorkspace, currentUser, isAdmin } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ start_date: '', end_date: '', reason: '', leave_type: 'personal' });

  const { data: leaves = [] } = useQuery({
    queryKey: ['leaves', wsId],
    queryFn: () => {
      if (isAdmin) return base44.entities.LeaveRequest.filter({ workspace_id: wsId }, '-created_date');
      return base44.entities.LeaveRequest.filter({ workspace_id: wsId, user_email: currentUser.email }, '-created_date');
    },
    enabled: !!wsId,
  });

  const handleCreate = async () => {
    if (!form.start_date || !form.end_date || !form.reason.trim()) return;
    setLoading(true);
    try {
      await base44.entities.LeaveRequest.create({
        workspace_id: wsId,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        ...form,
        status: 'pending',
      });

      // Notify admins
      const members = await base44.entities.WorkspaceMember.filter({ workspace_id: wsId, role: 'admin' });
      for (const admin of members) {
        await base44.entities.Notification.create({
          workspace_id: wsId,
          user_email: admin.user_email,
          title: 'Leave Request',
          message: `${currentUser.full_name} requested leave: ${form.leave_type}`,
          type: 'leave_request',
        });
      }

      toast.success('Leave request submitted');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      setCreateOpen(false);
      setForm({ start_date: '', end_date: '', reason: '', leave_type: 'personal' });
    } catch (error) {
      console.error('Leave request error:', error);
      toast.error(error.message || 'Failed to submit leave request');
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id, approved, userEmail) => {
    try {
      await base44.entities.LeaveRequest.update(id, {
        status: approved ? 'approved' : 'rejected',
        reviewed_by: currentUser.email,
      });
      await base44.entities.Notification.create({
        workspace_id: wsId,
        user_email: userEmail,
        title: approved ? 'Leave Approved' : 'Leave Rejected',
        message: `Your leave request was ${approved ? 'approved' : 'rejected'}`,
        type: 'leave_reviewed',
      });
      toast.success(approved ? 'Leave approved' : 'Leave rejected');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
    } catch (error) {
      console.error('Leave review error:', error);
      toast.error(error.message || 'Failed to process leave request');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Leave Requests</h1>
        {!isAdmin && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Request Leave
          </Button>
        )}
      </div>

      {leaves.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No leave requests" description={isAdmin ? "No leave requests from your team yet" : "Submit a leave request when needed"} />
      ) : (
        <div className="space-y-3">
          {leaves.map(leave => (
            <Card key={leave.id}>
              <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-medium">{leave.user_name || leave.user_email}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {format(new Date(leave.start_date), 'MMM d')} - {format(new Date(leave.end_date), 'MMM d, yyyy')}
                  </p>
                  <p className="text-sm mt-1">{leave.reason}</p>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">{leave.leave_type}</Badge>
                    <Badge className={`text-xs ${STATUS_COLORS[leave.status]}`}>{leave.status}</Badge>
                  </div>
                </div>
                {isAdmin && leave.status === 'pending' && (
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview(leave.id, true, leave.user_email)}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleReview(leave.id, false, leave.user_email)}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Leave</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select value={form.leave_type} onValueChange={v => setForm({ ...form, leave_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sick">Sick</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="vacation">Vacation</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea placeholder="Why do you need leave?" value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading || !form.start_date || !form.end_date || !form.reason.trim()}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}