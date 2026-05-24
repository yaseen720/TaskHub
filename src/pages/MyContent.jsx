import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  Upload, Video, Image, Play, Loader2, Plus, Trash2,
  CheckCircle, XCircle, X
} from 'lucide-react';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

// ─── Upload Content Dialog (Admin) ──────────────────────────────────────────
function UploadContentDialog({ open, onOpenChange, workspaceId, currentUser, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [contentType, setContentType] = useState('video');
  const [file, setFile] = useState(null);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const reset = () => {
    setTitle(''); setDescription(''); setFile(null);
    setTags([]); setTagInput(''); setContentType('video');
  };

  const handleUpload = async () => {
    if (!file || !title) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.ContentItem.create({
      workspace_id: workspaceId,
      title,
      description,
      type: contentType,
      file_url,
      uploaded_by: currentUser.email,
      uploaded_by_name: currentUser.full_name,
      tags,
    });
    toast.success('Content uploaded successfully!');
    setLoading(false);
    onOpenChange(false);
    reset();
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={v => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Upload New Content</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          {/* Type toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setContentType('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${contentType === 'video' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
            >
              <Video className="h-4 w-4" /> Video
            </button>
            <button
              onClick={() => setContentType('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${contentType === 'image' ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
            >
              <Image className="h-4 w-4" /> Image
            </button>
          </div>

          <div>
            <Label>Title *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Content title" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this about?" className="mt-1 h-20" />
          </div>

          {/* File upload */}
          <div>
            <Label>File *</Label>
            <input
              type="file"
              accept={contentType === 'video' ? 'video/*' : 'image/*'}
              id="content-file"
              className="hidden"
              onChange={e => setFile(e.target.files[0])}
            />
            <label htmlFor="content-file" className="mt-1 flex items-center gap-3 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground truncate">{file ? file.name : `Click to upload ${contentType}`}</span>
            </label>
          </div>

          {/* Tags */}
          <div>
            <Label>Tags (optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add a tag"
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
              <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 bg-secondary text-secondary-foreground rounded-full px-2.5 py-0.5 text-xs">
                    {t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))}><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <Button className="w-full" onClick={handleUpload} disabled={loading || !file || !title}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Upload
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Admin Content Card ──────────────────────────────────────────────────────
function ContentCard({ item, onDelete }) {
  const [playing, setPlaying] = useState(false);

  return (
    <Card className="overflow-hidden group">
      <CardContent className="p-0">
        {item.type === 'video' ? (
          <div className="bg-slate-900 aspect-video flex items-center justify-center relative">
            {playing ? (
              <video src={item.file_url} controls autoPlay className="w-full h-full object-contain" />
            ) : (
              <button onClick={() => setPlaying(true)} className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors">
                <Play className="h-12 w-12" />
                <span className="text-sm">Play</span>
              </button>
            )}
          </div>
        ) : (
          <div className="aspect-video bg-muted overflow-hidden">
            <img src={item.file_url} alt={item.title} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm leading-tight">{item.title}</p>
            <Badge variant="secondary" className="text-xs shrink-0">
              {item.type === 'video' ? <Video className="h-3 w-3 mr-1" /> : <Image className="h-3 w-3 mr-1" />}
              {item.type}
            </Badge>
          </div>
          {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
          {item.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map(t => <Badge key={t} variant="outline" className="text-[10px]">{t}</Badge>)}
            </div>
          )}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-muted-foreground">
              {item.created_date ? format(new Date(item.created_date), 'MMM d, yyyy') : ''}
            </span>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(item)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Review Dialog (for employee submissions) ────────────────────────────────
function ReviewDialog({ video, open, onOpenChange, onDone }) {
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (approved) => {
    setLoading(true);
    await base44.entities.VideoSubmission.update(video.id, {
      status: approved ? 'approved' : 'rejected',
      review_comment: comment,
    });
    await base44.entities.Notification.create({
      workspace_id: video.workspace_id,
      user_email: video.submitted_by,
      title: approved ? 'Video Approved!' : 'Video Rejected',
      message: `Your video "${video.title}" was ${approved ? 'approved' : 'rejected'}${comment ? ': ' + comment : ''}`,
      type: 'general',
    });
    toast.success(approved ? 'Approved!' : 'Rejected');
    setLoading(false);
    onOpenChange(false);
    setComment('');
    onDone();
  };

  if (!video) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Review: {video.title}</DialogTitle></DialogHeader>
        <div className="space-y-4 mt-2">
          {video.video_url && <video src={video.video_url} controls className="w-full rounded-lg max-h-64 bg-black" />}
          <div>
            <Label>Comment (optional)</Label>
            <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Feedback..." className="mt-1 h-20" />
          </div>
          <div className="flex gap-2">
            <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleReview(true)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle className="h-4 w-4 mr-2" />} Approve
            </Button>
            <Button className="flex-1" variant="destructive" onClick={() => handleReview(false)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Employee submission card ────────────────────────────────────────────────
function SubmissionCard({ video, isAdmin, onReview }) {
  const [playing, setPlaying] = useState(false);
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="bg-slate-900 aspect-video flex items-center justify-center">
          {playing ? (
            <video src={video.video_url} controls autoPlay className="w-full h-full object-contain" />
          ) : (
            <button onClick={() => setPlaying(true)} className="flex flex-col items-center gap-2 text-white/70 hover:text-white transition-colors">
              <Play className="h-10 w-10" />
              <span className="text-sm">Play</span>
            </button>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold text-sm">{video.title}</p>
            <Badge className={`${STATUS_COLORS[video.status]} text-xs`}>{video.status}</Badge>
          </div>
          {video.description && <p className="text-xs text-muted-foreground">{video.description}</p>}
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
            <Button size="sm" className="w-full" variant="outline" onClick={() => onReview(video)}>Review</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Submit Video Dialog (Employee) ─────────────────────────────────────────
function SubmitVideoDialog({ open, onOpenChange, workspaceId, currentUser, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!file || !title) return;
    setLoading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.VideoSubmission.create({
      workspace_id: workspaceId,
      title, description,
      submitted_by: currentUser.email,
      submitted_by_name: currentUser.full_name,
      video_url: file_url,
      status: 'pending',
    });
    toast.success('Video submitted for review!');
    setLoading(false);
    onOpenChange(false);
    setTitle(''); setDescription(''); setFile(null);
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Submit Video for Review</DialogTitle></DialogHeader>
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
            <input type="file" accept="video/*" id="submit-video" className="hidden" onChange={e => setFile(e.target.files[0])} />
            <label htmlFor="submit-video" className="mt-1 flex items-center gap-2 border-2 border-dashed rounded-lg p-4 cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{file ? file.name : 'Click to upload video'}</span>
            </label>
          </div>
          <Button className="w-full" onClick={handleSubmit} disabled={loading || !file || !title}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
            Submit for Review
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function MyContent() {
  const { activeWorkspace, isAdmin, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [reviewVideo, setReviewVideo] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: myContent = [] } = useQuery({
    queryKey: ['content', wsId],
    queryFn: () => base44.entities.ContentItem.filter({ workspace_id: wsId }),
    enabled: !!wsId && isAdmin,
  });

  const { data: submissions = [] } = useQuery({
    queryKey: ['videos', wsId],
    queryFn: () => isAdmin
      ? base44.entities.VideoSubmission.filter({ workspace_id: wsId })
      : base44.entities.VideoSubmission.filter({ workspace_id: wsId, submitted_by: currentUser?.email }),
    enabled: !!wsId,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['content'] });
    queryClient.invalidateQueries({ queryKey: ['videos'] });
  };

  const handleDelete = async (item) => {
    await base44.entities.ContentItem.delete(item.id);
    toast.success('Content deleted');
    refresh();
  };

  const sortedContent = [...myContent].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
  const filteredContent = typeFilter === 'all' ? sortedContent : sortedContent.filter(c => c.type === typeFilter);
  const sortedSubmissions = [...submissions].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));

  // Employee view
  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Videos</h1>
            <p className="text-muted-foreground text-sm mt-1">Submit videos for admin review</p>
          </div>
          <Button onClick={() => setSubmitOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Submit Video
          </Button>
        </div>
        {sortedSubmissions.length === 0 ? (
          <EmptyState icon={Video} title="No videos submitted yet" description="Submit a video for admin review."
            actionLabel="Submit Video" onAction={() => setSubmitOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSubmissions.map(v => <SubmissionCard key={v.id} video={v} isAdmin={false} onReview={() => {}} />)}
          </div>
        )}
        <SubmitVideoDialog open={submitOpen} onOpenChange={setSubmitOpen} workspaceId={wsId} currentUser={currentUser} onSuccess={refresh} />
      </div>
    );
  }

  // Admin view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Content</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload & manage images/videos, and review employee submissions</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Upload Content
        </Button>
      </div>

      <Tabs defaultValue="my-uploads">
        <TabsList>
          <TabsTrigger value="my-uploads">My Uploads</TabsTrigger>
          <TabsTrigger value="submissions">
            Employee Submissions
            {submissions.filter(s => s.status === 'pending').length > 0 && (
              <span className="ml-2 bg-yellow-500 text-white text-xs rounded-full px-1.5 py-0.5">
                {submissions.filter(s => s.status === 'pending').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── My Uploads Tab ── */}
        <TabsContent value="my-uploads" className="mt-4 space-y-4">
          {/* Filter */}
          <div className="flex gap-2">
            {['all', 'video', 'image'].map(f => (
              <Button key={f} size="sm" variant={typeFilter === f ? 'default' : 'outline'}
                onClick={() => setTypeFilter(f)} className="capitalize text-xs h-8">
                {f === 'all' ? `All (${myContent.length})` : f === 'video' ? `Videos (${myContent.filter(c => c.type === 'video').length})` : `Images (${myContent.filter(c => c.type === 'image').length})`}
              </Button>
            ))}
          </div>

          {filteredContent.length === 0 ? (
            <EmptyState icon={Upload} title="No content uploaded yet"
              description="Upload images or videos to store and manage them here."
              actionLabel="Upload Content" onAction={() => setUploadOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContent.map(item => (
                <ContentCard key={item.id} item={item} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Employee Submissions Tab ── */}
        <TabsContent value="submissions" className="mt-4">
          {sortedSubmissions.length === 0 ? (
            <EmptyState icon={Video} title="No submissions yet" description="Employees will submit videos here for your review." />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedSubmissions.map(v => (
                <SubmissionCard key={v.id} video={v} isAdmin={true} onReview={v => setReviewVideo(v)} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UploadContentDialog open={uploadOpen} onOpenChange={setUploadOpen}
        workspaceId={wsId} currentUser={currentUser} onSuccess={refresh} />

      <ReviewDialog video={reviewVideo} open={!!reviewVideo}
        onOpenChange={open => !open && setReviewVideo(null)} onDone={refresh} />
    </div>
  );
}