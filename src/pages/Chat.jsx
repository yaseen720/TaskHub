import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Hash, Paperclip, MessageSquare, Plus, User, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const DEFAULT_GROUPS = ['general', 'announcements'];

export default function Chat() {
  const { activeWorkspace, currentUser, isAdmin } = useWorkspace();
  const wsId = activeWorkspace?.id;
  const queryClient = useQueryClient();
  
  // State for navigation
  const [chatType, setChatType] = useState('group'); // 'group' or 'individual'
  const [activeGroup, setActiveGroup] = useState('general');
  const [activeRecipient, setActiveRecipient] = useState(null);
  
  // UI State
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [newGroupOpen, setNewGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const scrollRef = useRef(null);

  // Queries
  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members', wsId],
    queryFn: async () => {
      console.log('Fetching members for chat in workspace:', wsId);
      const res = await base44.entities.WorkspaceMember.filter({ workspace_id: wsId, status: 'active' });
      console.log('Members fetched:', res.length);
      return res;
    },
    enabled: !!wsId,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chat', wsId, chatType, chatType === 'group' ? activeGroup : activeRecipient?.user_email],
    queryFn: async () => {
      if (!currentUser?.email) return [];
      console.log('Fetching messages for:', chatType, chatType === 'group' ? activeGroup : activeRecipient?.user_email);
      if (chatType === 'group') {
        return base44.entities.ChatMessage.filter(
          { workspace_id: wsId, channel: activeGroup, is_private: false },
          '-created_date',
          100
        );
      } else {
        return base44.entities.ChatMessage.filter(
          { 
            workspace_id: wsId, 
            is_private: true,
            _or: {
              group1: { user_email: currentUser.email, recipient_email: activeRecipient.user_email },
              group2: { user_email: activeRecipient.user_email, recipient_email: currentUser.email }
            }
          },
          '-created_date',
          100
        );
      }
    },
    enabled: !!wsId && !!currentUser && (chatType === 'group' || !!activeRecipient),
    refetchInterval: 3000,
  });

  const { data: allMessages = [] } = useQuery({
    queryKey: ['allChat', wsId],
    queryFn: () => base44.entities.ChatMessage.filter({ workspace_id: wsId }),
    enabled: !!wsId,
    refetchInterval: 5000,
  });

  // Derived data
  const groups = [...new Set([...DEFAULT_GROUPS, ...allMessages.filter(m => !m.is_private && m.channel).map(m => m.channel)])];
  const sortedMessages = [...messages].reverse();

  // Effects
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Actions
  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;
    setSending(true);
    try {
      const payload = {
        workspace_id: wsId,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        content: messageText.trim(),
        type: 'text',
      };

      if (chatType === 'group') {
        payload.channel = activeGroup;
        payload.is_private = false;
      } else {
        payload.recipient_email = activeRecipient.user_email;
        payload.is_private = true;
      }

      await base44.entities.ChatMessage.create(payload);
      setMessageText('');
      queryClient.invalidateQueries({ queryKey: ['chat', wsId] });
      queryClient.invalidateQueries({ queryKey: ['allChat', wsId] });
    } catch (error) {
      console.error('Chat error:', error);
      toast.error(error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const createGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Please enter a group name');
      return;
    }
    setSending(true);
    try {
      const groupName = newGroupName.trim().toLowerCase().replace(/\s+/g, '-');
      console.log('Creating group:', groupName);
      
      const announcement = `Group created by ${currentUser.full_name || currentUser.email}.`;
      
      const newMsg = await base44.entities.ChatMessage.create({
        workspace_id: wsId,
        channel: groupName,
        user_email: currentUser.email,
        user_name: 'System',
        content: announcement,
        type: 'system',
        is_private: false,
      });

      console.log('Group created message:', newMsg);

      setActiveGroup(groupName);
      setChatType('group');
      
      await queryClient.invalidateQueries({ queryKey: ['allChat', wsId] });
      
      setNewGroupOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      toast.success(`Group "${groupName}" created!`);
    } catch (error) {
      console.error('Group error:', error);
      toast.error(error.message || 'Failed to create group');
    } finally {
      setSending(false);
    }
  };

  const startIndividualChat = (member) => {
    setActiveRecipient(member);
    setChatType('individual');
    setNewChatOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSending(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const payload = {
        workspace_id: wsId,
        user_email: currentUser.email,
        user_name: currentUser.full_name || currentUser.email,
        content: `📎 Shared a file`,
        file_url: file_url,
        type: 'file',
      };

      if (chatType === 'group') {
        payload.channel = activeGroup;
        payload.is_private = false;
      } else {
        payload.recipient_email = activeRecipient.user_email;
        payload.is_private = true;
      }

      await base44.entities.ChatMessage.create(payload);
      queryClient.invalidateQueries({ queryKey: ['chat', wsId] });
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload file');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>
      
      <div className="flex gap-4 h-[calc(100vh-220px)]">
        {/* Sidebar */}
        <Card className="w-64 shrink-0 hidden md:flex flex-col overflow-hidden">
          <ScrollArea className="flex-1">
            {/* Groups Section */}
            <div className="p-3 border-b bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <Users className="h-3 w-3" /> Groups
                </span>
                {isAdmin && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewGroupOpen(true)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="space-y-1">
                {groups.map(group => (
                  <button
                    key={group}
                    onClick={() => { setActiveGroup(group); setChatType('group'); }}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                      chatType === 'group' && activeGroup === group ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                    }`}
                  >
                    <Hash className="h-3.5 w-3.5 opacity-70" />
                    <span className="truncate">{group}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Individual Chats Section */}
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <User className="h-3 w-3" /> Chats
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setNewChatOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1">
                {/* We can track unique recipients from allMessages where is_private is true */}
                {Array.from(new Set(
                  allMessages
                    .filter(m => m.is_private && currentUser && (m.user_email === currentUser.email || m.recipient_email === currentUser.email))
                    .map(m => m.user_email === (currentUser?.email) ? m.recipient_email : m.user_email)
                )).map(email => {
                  const member = members.find(m => m.user_email === email);
                  if (!member) return null;
                  return (
                    <button
                      key={email}
                      onClick={() => { setActiveRecipient(member); setChatType('individual'); }}
                      className={`w-full text-left px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors ${
                        chatType === 'individual' && activeRecipient?.user_email === email ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span className="truncate">{member.user_name || email}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </ScrollArea>
        </Card>

        {/* Chat area */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b flex items-center gap-2 bg-muted/10">
            {chatType === 'group' ? (
              <>
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold text-sm">{activeGroup}</span>
              </>
            ) : (
              <>
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span className="font-semibold text-sm">{activeRecipient?.user_name || activeRecipient?.user_email || 'Select a chat'}</span>
              </>
            )}
            <Badge variant="secondary" className="text-xs ml-auto">{messages.length} messages</Badge>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4 bg-muted/5" ref={scrollRef}>
            {!activeRecipient && chatType === 'individual' ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">Start an individual chat</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setNewChatOpen(true)}>
                  New Chat
                </Button>
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No messages here yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedMessages.map(msg => {
                  const isMe = msg.user_email === currentUser?.email;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] ${isMe ? 'order-2' : ''}`}>
                        {!isMe && (
                          <p className="text-[11px] font-medium text-muted-foreground mb-1 ml-1">{msg.user_name}</p>
                        )}
                        <div className={`rounded-2xl px-4 py-2 ${
                          msg.type === 'system'
                            ? 'bg-muted text-muted-foreground text-center text-xs italic w-full'
                            : isMe
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-card border shadow-sm'
                        }`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                          {msg.file_url && (
                            <div className="mt-2 pt-2 border-t border-white/20">
                              <a href={msg.file_url} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> Download Attachment
                              </a>
                            </div>
                          )}
                        </div>
                        <p className={`text-[10px] text-muted-foreground mt-1 ${isMe ? 'text-right mr-1' : 'ml-1'}`}>
                          {msg.created_date ? format(new Date(msg.created_date), 'h:mm a') : ''}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t flex gap-2 bg-card">
            <input type="file" className="hidden" id="chat-file" onChange={handleFileUpload} />
            <Button variant="ghost" size="icon" className="shrink-0" onClick={() => document.getElementById('chat-file').click()} disabled={chatType === 'individual' && !activeRecipient}>
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder={chatType === 'group' ? `Message group #${activeGroup}...` : activeRecipient ? `Message ${activeRecipient.user_name}...` : "Select a recipient..."}
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              disabled={sending || (chatType === 'individual' && !activeRecipient)}
              className="bg-muted/50"
            />
            <Button size="icon" onClick={sendMessage} disabled={sending || !messageText.trim() || (chatType === 'individual' && !activeRecipient)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* New Group Dialog */}
      <Dialog open={newGroupOpen} onOpenChange={setNewGroupOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Create New Group</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input placeholder="e.g. Design Team" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Add Members</Label>
              <ScrollArea className="h-48 border rounded-md p-2">
                {members.filter(m => m.user_email !== currentUser.email).map(member => (
                  <div key={member.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md transition-colors">
                    <Checkbox 
                      id={`member-${member.id}`} 
                      checked={selectedMembers.includes(member.user_name || member.user_email)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedMembers([...selectedMembers, member.user_name || member.user_email]);
                        } else {
                          setSelectedMembers(selectedMembers.filter(m => m !== (member.user_name || member.user_email)));
                        }
                      }}
                    />
                    <label htmlFor={`member-${member.id}`} className="text-sm font-medium leading-none cursor-pointer flex-1">
                      {member.user_name} <span className="text-xs text-muted-foreground">({member.user_email})</span>
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewGroupOpen(false)}>Cancel</Button>
            <Button onClick={createGroup} disabled={!newGroupName.trim() || selectedMembers.length === 0}>Create Group</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Chat Dialog */}
      <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>New Individual Chat</DialogTitle></DialogHeader>
          <div className="space-y-2 py-4">
            <Label>Select Workspace Member</Label>
            <ScrollArea className="h-64 border rounded-md p-2">
              {members.filter(m => m.user_email !== currentUser.email).map(member => (
                <button
                  key={member.id}
                  onClick={() => startIndividualChat(member)}
                  className="w-full text-left p-3 hover:bg-muted rounded-md transition-colors flex items-center gap-3"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                    {(member.user_name || 'U').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{member.user_name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{member.user_email}</p>
                  </div>
                </button>
              ))}
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatOpen(false)} className="w-full">Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}