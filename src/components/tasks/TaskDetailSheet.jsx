import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Calendar, User, Upload, Loader2, CheckCircle, XCircle, Send, Mail, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-blue-100 text-blue-700',
  submitted: 'bg-purple-100 text-purple-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  late: 'bg-orange-100 text-orange-700',
  missed: 'bg-gray-100 text-gray-700',
};

export default function TaskDetailSheet({ task, onClose, isAdmin, members, currentUser }) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [submissionText, setSubmissionText] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [reviewComment, setReviewComment] = useState('');

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['myTasks'] });
  };

  const handleSubmitWork = async () => {
    setLoading(true);
    let fileUrls = [];
    for (const f of submissionFiles) {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      fileUrls.push(file_url);
    }

    await base44.entities.Task.update(task.id, {
      status: 'submitted',
      submission_text: submissionText,
      submission_files: fileUrls,
      submission_date: new Date().toISOString(),
    });

    // Notify admin
    const admins = members.filter(m => m.role === 'admin');
    for (const admin of admins) {
      await base44.entities.Notification.create({
        workspace_id: task.workspace_id,
        user_email: admin.user_email,
        title: 'Task Submitted',
        message: `${currentUser.full_name} submitted "${task.title}"`,
        type: 'task_submitted',
      });
    }

    toast.success('Work submitted!');
    invalidate();
    setLoading(false);
    onClose();
  };

  const handleReview = async (approved) => {
    setLoading(true);
    await base44.entities.Task.update(task.id, {
      status: approved ? 'approved' : 'rejected',
      review_comment: reviewComment,
    });

    await base44.entities.Notification.create({
      workspace_id: task.workspace_id,
      user_email: task.assigned_to,
      title: approved ? 'Task Approved!' : 'Task Rejected',
      message: `Your task "${task.title}" was ${approved ? 'approved' : 'rejected'}${reviewComment ? ': ' + reviewComment : ''}`,
      type: 'task_reviewed',
    });

    toast.success(approved ? 'Task approved' : 'Task rejected');
    invalidate();
    setLoading(false);
    onClose();
  };

  const handleShareEmail = async () => {
    if (!task.assigned_to) return;
    setLoading(true);
    await base44.integrations.Core.SendEmail({
      to: task.assigned_to,
      subject: `Task: ${task.title}`,
      body: `<h2>${task.title}</h2>
<p><strong>Priority:</strong> ${task.priority || 'Medium'}</p>
<p><strong>Due:</strong> ${task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'No deadline'}</p>
<p><strong>Status:</strong> ${task.status}</p>
<hr/>
<p>${task.description || 'No description provided.'}</p>`,
    });
    toast.success('Task details sent via email!');
    setLoading(false);
  };

  const handleShareWhatsApp = () => {
    const text = `📋 *Task: ${task.title}*\n` +
      `👤 Assigned to: ${task.assigned_to_name || task.assigned_to || 'Unassigned'}\n` +
      `📅 Due: ${task.due_date ? format(new Date(task.due_date), 'MMMM d, yyyy') : 'No deadline'}\n` +
      `🔖 Status: ${task.status?.replace('_', ' ')}\n` +
      (task.description ? `\n📝 ${task.description}` : '');
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const canSubmit = !isAdmin && task.assigned_to === currentUser?.email && ['pending', 'in_progress', 'rejected'].includes(task.status);
  const canReview = isAdmin && task.status === 'submitted';

  return (
    <Sheet open={!!task} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-lg">{task.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-5">
          {/* Status & Priority */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={STATUS_COLORS[task.status]}>{task.status?.replace('_', ' ')}</Badge>
            {task.priority && <Badge variant="outline">{task.priority}</Badge>}
            {task.category && <Badge variant="secondary">{task.category}</Badge>}
          </div>

          {/* Details */}
          <div className="space-y-3">
            {task.assigned_to_name && (
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{task.assigned_to_name}</span>
              </div>
            )}
            {task.due_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>{format(new Date(task.due_date), 'MMMM d, yyyy')}</span>
              </div>
            )}
          </div>

          {task.description && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{task.description}</p>
              </div>
            </>
          )}

          {/* Attachments */}
          {task.file_urls?.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Attachments</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {task.file_urls.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    File {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Submission */}
          {task.submission_text && (
            <>
              <Separator />
              <div>
                <Label className="text-xs text-muted-foreground">Submission</Label>
                <p className="text-sm mt-1 whitespace-pre-wrap">{task.submission_text}</p>
                {task.submission_date && (
                  <p className="text-xs text-muted-foreground mt-1">Submitted {format(new Date(task.submission_date), 'MMM d, yyyy h:mm a')}</p>
                )}
              </div>
            </>
          )}
          {task.submission_files?.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">Submitted Files</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {task.submission_files.map((url, i) => (
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                    File {i + 1}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Review comment */}
          {task.review_comment && (
            <div>
              <Label className="text-xs text-muted-foreground">Review Comment</Label>
              <p className="text-sm mt-1">{task.review_comment}</p>
            </div>
          )}

          <Separator />

          {/* Share via Email & WhatsApp */}
          {isAdmin && task.assigned_to && (
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleShareEmail} disabled={loading}>
                <Mail className="h-4 w-4 mr-2" /> Email
              </Button>
              <Button variant="outline" className="flex-1 text-green-600 border-green-200 hover:bg-green-50" onClick={handleShareWhatsApp}>
                <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
          )}

          {/* Employee Submit Work */}
          {canSubmit && (
            <div className="space-y-3">
              <Label>Submit Your Work</Label>
              <Textarea
                placeholder="Describe your work..."
                value={submissionText}
                onChange={e => setSubmissionText(e.target.value)}
                className="h-24"
              />
              <input type="file" multiple className="hidden" id="submit-files" onChange={e => setSubmissionFiles([...e.target.files])} />
              <label htmlFor="submit-files" className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
                <Upload className="h-4 w-4" /> Attach files
              </label>
              {submissionFiles.length > 0 && <p className="text-xs text-muted-foreground">{submissionFiles.length} file(s)</p>}
              <Button className="w-full" onClick={handleSubmitWork} disabled={loading || !submissionText.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Submit Work
              </Button>
            </div>
          )}

          {/* Admin Review */}
          {canReview && (
            <div className="space-y-3">
              <Label>Review Comment (optional)</Label>
              <Textarea
                placeholder="Add a comment..."
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
              <div className="flex gap-2">
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview(true)} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Approve
                </Button>
                <Button className="flex-1" variant="destructive" onClick={() => handleReview(false)} disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}