import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, UserPlus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import EmptyState from '@/components/shared/EmptyState';

export default function JoinRequests() {
  const { activeWorkspace, currentUser } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [processingId, setProcessingId] = useState(null);

  const { data: requests = [] } = useQuery({
    queryKey: ['joinRequests', wsId],
    queryFn: () => base44.entities.JoinRequest.filter({ workspace_id: wsId }, '-created_date'),
    enabled: !!wsId,
  });

  const handleReview = async (request, approved) => {
    setProcessingId(request.id);
    try {
      console.log(`Reviewing request ${request.id}, approved: ${approved}`);
      
      await base44.entities.JoinRequest.update(request.id, {
        status: approved ? 'approved' : 'rejected',
        reviewed_by: currentUser.email,
      });

      if (approved) {
        console.log('Adding member to workspace...');
        await base44.entities.WorkspaceMember.create({
          workspace_id: wsId,
          user_email: request.user_email,
          user_name: request.user_name,
          role: 'employee',
          skills: request.skills || [],
          status: 'active',
        });
      }

      console.log('Creating notification...');
      // Notify the requester
      await base44.entities.Notification.create({
        workspace_id: wsId,
        user_email: request.user_email,
        title: approved ? 'Request Approved!' : 'Request Rejected',
        message: approved
          ? `You are now a member of ${activeWorkspace.name}!`
          : `Your request to join ${activeWorkspace.name} was rejected.`,
        type: approved ? 'join_approved' : 'join_rejected',
      });

      toast.success(approved ? 'Member approved and added!' : 'Request rejected');
      queryClient.invalidateQueries({ queryKey: ['joinRequests'] });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    } catch (error) {
      console.error('Error reviewing join request:', error);
      toast.error(error.message || 'Failed to process request. Check browser console.');
    } finally {
      setProcessingId(null);
    }
  };

  const pending = requests.filter(r => r.status === 'pending');
  const reviewed = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Join Requests</h1>

      {pending.length === 0 && reviewed.length === 0 ? (
        <EmptyState icon={UserPlus} title="No join requests" description="Share your workspace security key with team members to receive join requests" />
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pending ({pending.length})</h2>
              {pending.map(req => (
                <Card key={req.id} className="border-primary/20">
                  <CardContent className="p-4 flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-medium">{req.user_name}</p>
                      <p className="text-xs text-muted-foreground">{req.user_email}</p>
                      {req.message && <p className="text-sm mt-1 text-muted-foreground">{req.message}</p>}
                      {req.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {req.skills.map(s => (
                            <Badge key={s} variant="secondary" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-2">{format(new Date(req.created_date), 'MMM d, yyyy h:mm a')}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700" 
                        onClick={() => handleReview(req, true)}
                        disabled={!!processingId}
                      >
                        {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <CheckCircle className="h-3.5 w-3.5 mr-1" />}
                        Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive" 
                        onClick={() => handleReview(req, false)}
                        disabled={!!processingId}
                      >
                        {processingId === req.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <XCircle className="h-3.5 w-3.5 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {reviewed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">History ({reviewed.length})</h2>
              {reviewed.map(req => (
                <Card key={req.id} className="opacity-70">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{req.user_name}</p>
                      <p className="text-xs text-muted-foreground">{req.user_email}</p>
                    </div>
                    <Badge className={req.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {req.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}