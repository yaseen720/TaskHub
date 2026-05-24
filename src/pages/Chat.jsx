import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Send, Hash, Paperclip, Upload, MessageSquare, Plus } from 'lucide-react';
import { format } from 'date-fns';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const DEFAULT_CHANNELS = ['general', 'announcements'];

export default function Chat() {
  const { activeWorkspace, currentUser, isAdmin } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  const [activeChannel, setActiveChannel] = useState('general');
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [newChannelOpen, setNewChannelOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const scrollRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', wsId, activeChannel],
    queryFn: () => base44.entities.ChatMessage.filter(
      { workspace_id: wsId, channel: activeChannel },
      '-created_date',
      100
    ),
    enabled: !!wsId,
    refetchInterval: 3000,
  });

  // Get unique channels
  const { data: allMessages = [] } = useQuery({
    queryKey: ['allChat', wsId],
    queryFn: () => base44.entities.ChatMessage.filter({ workspace_id: wsId }),
    enabled: !!wsId,
  });

  const channels = [...new Set([...DEFAULT_CHANNELS, ...allMessages.map(m => m.channel)])];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      await base44.entities.ChatMessage.create({
        workspace_id: wsId,
        channel: activeChannel,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        content: messageText.trim(),
        message_type: 'text',
      });
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['chat', wsId, activeChannel] });
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSending(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ChatMessage.create({
        workspace_id: wsId,
        channel: activeChannel,
        sender_email: currentUser.email,
        sender_name: currentUser.full_name || currentUser.email,
        content: `📎 Shared a file`,
        file_urls: [file_url],
        message_type: 'file',
      });
      queryClient.invalidateQueries({ queryKey: ['chat', wsId, activeChannel] });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setSending(false);
    }
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    try {
      // Just create a system message to initialize the channel
      await base44.entities.ChatMessage.create({
        workspace_id: wsId,
        channel: newChannelName.trim().toLowerCase().replace(/\s+/g, '-'),
        sender_email: currentUser.email,
        sender_name: 'System',
        content: `Channel created by ${currentUser.full_name || currentUser.email}`,
        message_type: 'system',
      });
      setActiveChannel(newChannelName.trim().toLowerCase().replace(/\s+/g, '-'));
      queryClient.invalidateQueries({ queryKey: ['allChat'] });
      setNewChannelOpen(false);
      setNewChannelName('');
    } catch (error) {
      console.error('Channel error:', error);
      toast.error(error.message || 'Failed to create channel');
    }
  };

  const sortedMessages = [...messages].reverse();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Team Chat</h1>
      
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Channels */}
        <Card className="w-48 shrink-0 hidden md:block">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase">Channels</span>
            {isAdmin && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewChannelOpen(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <ScrollArea className="h-full p-2">
            {channels.map(ch => (
              <button
                key={ch}
                onClick={() => setActiveChannel(ch)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  activeChannel === ch ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <Hash className="h-3.5 w-3.5" />
                {ch}
              </button>
            ))}
          </ScrollArea>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b flex items-center gap-2">
            <Hash className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-sm">{activeChannel}</span>
            <Badge variant="secondary" className="text-xs ml-auto">{messages.length} messages</Badge>
          </div>

          {/* Mobile channel selector */}
          <div className="md:hidden px-3 py-2 border-b flex gap-1 overflow-x-auto">
            {channels.map(ch => (
              <Badge
                key={ch}
                variant={activeChannel === ch ? 'default' : 'outline'}
                className="cursor-pointer shrink-0"
                onClick={() => setActiveChannel(ch)}
              >
                #{ch}
              </Badge>
            ))}
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {sortedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2" />
                <p className="text-sm">No messages in #{activeChannel}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedMessages.map(msg => {
                  const isMe = msg.sender_email === currentUser?.email;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] ${isMe ? 'order-2' : ''}`}>
                        {!isMe && (
                          <p className="text-xs font-medium text-muted-foreground mb-0.5 ml-1">{msg.sender_name}</p>
                        )}
                        <div className={`rounded-2xl px-4 py-2.5 ${
                          msg.message_type === 'system'
                            ? 'bg-muted text-muted-foreground text-center text-xs italic'
                            : isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border'
                        }`}>
                          <p className="text-sm">{msg.content}</p>
                          {msg.file_urls?.length > 0 && (
                            <div className="mt-1">
                              {msg.file_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="text-xs underline">
                                  📎 Download file
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className={`text-[10px] text-muted-foreground mt-0.5 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                          {format(new Date(msg.created_date), 'h:mm a')}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input type="file" className="hidden" id="chat-file" onChange={handleFileUpload} />
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => document.getElementById('chat-file').click()}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder={`Message #${activeChannel}...`}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={sending}
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !messageText.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* New Channel Dialog */}
      <Dialog open={newChannelOpen} onOpenChange={setNewChannelOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Channel</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label>Channel Name</Label>
            <Input placeholder="e.g. design-team" value={newChannelName} onChange={e => setNewChannelName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChannelOpen(false)}>Cancel</Button>
            <Button onClick={createChannel} disabled={!newChannelName.trim()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}