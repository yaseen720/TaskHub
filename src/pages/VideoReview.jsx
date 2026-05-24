import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { Video, Upload, CheckCircle, XCircle, Loader2, Play, Youtube, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmptyState from '@/components/shared/EmptyState';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

function SubmitVideoDialog({ open, onOpenChange, workspaceId, currentUser, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!videoFile || !title) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file: videoFile });
    await base44.entities.VideoSubmission.create({
      workspace_id: workspaceId,
      title,
      description,
      submitted_by: currentUser.email,
      submitted_by_name: currentUser.full_name,
      video_url: file_url,
      status: 'pending',
    });
    toast.success('Video submitted for review!');
    setLoading(false);
    onOpenChange(false);
    setTitle(''); setDescription(''); setVideoFile(null);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Submit Video</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Video title" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this video about?" className="mt-1 h-20" />
          </div>
          <div>
            <Label>Video File *</Label>
            <input type="file" accept="video/*" id="video-upload" className="hidden" onChange={e => setVideoFile(e.target.files[0])} />
            <label htmlFor="video-upload" className="mt-1 flex items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{videoFile ? videoFile.name : 'Click to upload video'}</span>
            </label>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading || !videoFile || !title}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Submit for Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VideoCard({ video, isAdmin, onReview }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        {/* Video preview area */}
        <div className="bg-slate-900 aspect-video flex items-center justify-center relative">
          {video.video_url ? (
            expanded ? (
              <video src={video.video_url} controls className="w-full h-full object-contain" />
            ) : (
              <button onClick={() => setExpanded(true)} className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors">
                <Play className="h-12 w-12" />
                <span className="text-sm">Click to preview</span>
              </button>
            )
          ) : (
            <Video className="h-12 w-12 text-white/30" />
          )}
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold">{video.title}</p>
            <Badge className={STATUS_COLORS[video.status]}>{video.status}</Badge>
          </div>
          {video.description && <p className="text-sm text-muted-foreground">{video.description}</p>}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>By {video.submitted_by_name || video.submitted_by}</span>
            <span>{video.created_date ? format(new Date(video.created_date), 'MMM d, yyyy') : ''}</span>
          </div>
          {video.review_comment && (
            <div className="bg-muted/50 rounded-lg p-2 text-xs">
              <span className="font-medium">Comment: </span>{video.review_comment}
            </div>
          )}
          {isAdmin && video.status === 'pending' && (
            <Button size="sm" className="w-full" variant="outline" onClick={() => onReview(video)}>
              Review Video
            </Button>
          )}
          {isAdmin && video.status === 'approved' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <Youtube className="h-4 w-4 inline mr-1" />
              <strong>To publish to YouTube:</strong> Download the video and upload it manually to your YouTube Studio channel. YouTube API publishing requires a Builder+ subscription.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({ video, open, onOpenChange, onDone }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (approved) => {
    setLoading(true);
    await base44.entities.VideoSubmission.update(video.id, {
      status: approved ? 'approved' : 'rejected',
      review_comment: comment,
    });
    // Notify submitter
    await base44.entities.Notification.create({
      workspace_id: video.workspace_id,
      user_email: video.submitted_by,
      title: approved ? 'Video Approved!' : 'Video Rejected',
      message: `Your video "${video.title}" was ${approved ? 'approved' : 'rejected'}${comment ? ': ' + comment : ''}`,
      type: 'general',
    });
    toast.success(approved ? 'Video approved!' : 'Video rejected');
    setLoading(false);
    onOpenChange(false);
    onDone();
  };

  if (!video) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Review: {video.title}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          {video.video_url && (
            <video src={video.video_url} controls className="w-full rounded-lg max-h-64 bg-black" />
          )}
          <div>
            <Label>Review Comment (optional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Feedback for the employee..." className="mt-1 h-20" />
          </div>
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
      </DialogContent>
    </Dialog>
  );
}

export default function VideoReview() {
  const { activeWorkspace, isAdmin, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewVideo, setReviewVideo] = useState(null);

  const { data: videos = [] } = useQuery({
    queryKey: ['videos', wsId],
    queryFn: () => isAdmin
      ? base44.entities.VideoSubmission.filter({ workspace_id: wsId })
      : base44.entities.VideoSubmission.filter({ workspace_id: wsId, submitted_by: currentUser.email }),
    enabled: !!wsId,
  });

  const sorted = [...videos].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['videos'] });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Video Review</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? 'Review and approve employee video submissions' : 'Submit videos for admin review'}
          </p>
        </div>
        {!isAdmin && (
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Submit Video
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No videos yet"
          description={isAdmin ? 'Employees can submit videos for review here.' : 'Submit your first video for admin review.'}
          actionLabel={!isAdmin ? 'Submit Video' : undefined}
          onAction={!isAdmin ? () => setSubmitOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(video => (
            <VideoCard key={video.id} video={video} isAdmin={isAdmin} onReview={v => setReviewVideo(v)} />
          ))}
        </div>
      )}

      <SubmitVideoDialog
        open={submitOpen}
        onOpenChange={setSubmitOpen}
        workspaceId={wsId}
        currentUser={currentUser}
        onSuccess={refresh}
      />

      <ReviewDialog
        video={reviewVideo}
        open={!!reviewVideo}
        onOpenChange={open => !open && setReviewVideo(null)}
        onDone={refresh}
      />
    </div>
  );
}