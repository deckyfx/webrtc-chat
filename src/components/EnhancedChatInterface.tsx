import React, { useState, useRef, useEffect } from 'react';
import { useEnhancedWebRTC, ConnectionState } from '../contexts/EnhancedWebRTCProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import {
  MessageSquare,
  Plus,
  X,
  Send,
  Paperclip,
  Users,
  Wifi,
  WifiOff,
  Copy,
  Check,
  Hash,
  Settings
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';

export const EnhancedChatInterface: React.FC = () => {
  const {
    user,
    rooms,
    activeRoomId,
    currentRoom,
    connectionState,
    createRoom,
    joinRoom,
    leaveRoom,
    setActiveRoom,
    sendMessage,
    setConnectionModalOpen,
    isConnected,
    markRoomAsRead,
    generateInviteCode,
    joinWithInviteCode,
    completeConnection,
    sendSystemMessage: sendSystemMsg
  } = useEnhancedWebRTC();

  const [messageText, setMessageText] = useState('');
  const [showNewRoomDialog, setShowNewRoomDialog] = useState(false);
  const [newRoomId, setNewRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.messages]);

  // Mark room as read when switching rooms
  useEffect(() => {
    if (activeRoomId) {
      markRoomAsRead(activeRoomId);
    }
  }, [activeRoomId, markRoomAsRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !activeRoomId) return;

    const text = messageText.trim();

    // Check for commands
    if (text.startsWith('/')) {
      await handleCommand(text);
    } else {
      await sendMessage(activeRoomId, { text });
    }

    setMessageText('');
  };

  const handleCommand = async (command: string) => {
    const [cmd, ...args] = command.split(' ');
    const arg = args.join(' ').trim();

    switch (cmd.toLowerCase()) {
      case '/invite':
        await handleInviteCommand();
        break;
      case '/join':
        if (arg) {
          await handleJoinCommand(arg);
        } else {
          await sendSystemMessage('Usage: /join <invitation_code>');
        }
        break;
      case '/accept':
        if (arg) {
          await handleAcceptCommand(arg);
        } else {
          await sendSystemMessage('Usage: /accept <answer_code>');
        }
        break;
      case '/help':
        await sendSystemMessage(
          '<b>Available Commands:</b><br>' +
          '/invite - Generate an invitation code<br>' +
          '/join &lt;code&gt; - Join with an invitation code<br>' +
          '/accept &lt;code&gt; - Accept connection with answer code<br>' +
          '/help - Show this help message'
        );
        break;
      default:
        await sendSystemMessage(`Unknown command: ${cmd}. Type /help for available commands.`);
    }
  };

  const sendSystemMessage = async (text: string) => {
    if (!activeRoomId) return;
    sendSystemMsg(activeRoomId, text);
  };

  const handleInviteCommand = async () => {
    try {
      const inviteCode = await generateInviteCode(activeRoomId!);
      await sendSystemMessage(
        `<b>📋 Invitation Code Generated!</b><br><br>` +
        `<code style="background: #f0f0f0; padding: 8px; border-radius: 4px; display: block; word-break: break-all; font-size: 11px;">${inviteCode}</code><br>` +
        `<br>Share this code with your peer. They should use: <b>/join ${inviteCode.substring(0, 20)}...</b>`
      );
    } catch (error) {
      await sendSystemMessage('❌ Failed to generate invitation code. Please try again.');
    }
  };

  const handleJoinCommand = async (inviteCode: string) => {
    try {
      const answerCode = await joinWithInviteCode(inviteCode);
      await sendSystemMessage(
        `<b>📤 Answer Code Generated!</b><br><br>` +
        `<code style="background: #f0f0f0; padding: 8px; border-radius: 4px; display: block; word-break: break-all; font-size: 11px;">${answerCode}</code><br>` +
        `<br>Share this code back with your peer. They should use: <b>/accept ${answerCode.substring(0, 20)}...</b>`
      );
    } catch (error) {
      await sendSystemMessage('❌ Failed to process invitation code. Please check the code and try again.');
    }
  };

  const handleAcceptCommand = async (answerCode: string) => {
    try {
      await completeConnection(answerCode);
      await sendSystemMessage('🔄 Processing answer code and establishing connection...');
    } catch (error) {
      await sendSystemMessage('❌ Failed to complete connection. Please check the answer code and try again.');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && activeRoomId) {
      await sendMessage(activeRoomId, { file });
      e.target.value = '';
    }
  };

  const handleCreateRoom = () => {
    createRoom();
    setShowNewRoomDialog(false);
  };

  const handleJoinRoom = () => {
    if (newRoomId.trim()) {
      joinRoom(newRoomId.trim());
      setNewRoomId('');
      setShowNewRoomDialog(false);
    }
  };

  const handleCopyRoomId = async () => {
    if (activeRoomId) {
      try {
        await navigator.clipboard.writeText(activeRoomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        // Fallback for browsers without clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = activeRoomId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConnectionStateIcon = (state: ConnectionState) => {
    switch (state) {
      case ConnectionState.CONNECTED:
        return <Wifi className="h-4 w-4 text-green-500" />;
      case ConnectionState.CONNECTING:
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <WifiOff className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="h-screen flex bg-white dark:bg-gray-800">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">WebRTC Chat</h1>
            <div className="flex items-center gap-1">
              {getConnectionStateIcon(connectionState)}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {user?.name}
              </span>
            </div>
          </div>

          <Button
            onClick={() => setShowNewRoomDialog(true)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Room
          </Button>
        </div>

        {/* Room List */}
        <ScrollArea className="flex-1 p-2">
          {rooms.map((room) => (
            <div
              key={room.id}
              onClick={() => setActiveRoom(room.id)}
              className={`p-3 rounded-lg cursor-pointer mb-1 flex items-center justify-between group hover:bg-gray-100 dark:hover:bg-gray-800 ${
                activeRoomId === room.id
                  ? 'bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {room.name}
                    </span>
                    {room.unreadCount > 0 && (
                      <Badge variant="destructive" className="text-xs h-5 min-w-[20px] px-1">
                        {room.unreadCount}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    ID: {room.id}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  leaveRoom(room.id);
                }}
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 text-gray-400 hover:text-red-500"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {currentRoom ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Hash className="h-5 w-5 text-gray-400" />
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {currentRoom.name}
                    </h2>
                    <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                      <span>ID: {currentRoom.id}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyRoomId}
                        className="h-6 px-2 text-xs"
                      >
                        {copied ? (
                          <Check className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getConnectionStateIcon(connectionState)}
                  <Badge variant={isConnected ? "default" : "secondary"}>
                    {isConnected ? "Connected" : "Disconnected"}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMessageText('/help');
                      handleSendMessage();
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Help
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {currentRoom.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.senderId === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.senderId === user?.id
                          ? 'bg-blue-500 text-white'
                          : message.senderId === 'system'
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                      }`}
                    >
                      {message.senderId !== user?.id && message.senderId !== 'system' && (
                        <p className="text-xs opacity-75 mb-1">{message.senderName}</p>
                      )}

                      {message.text && (
                        <p className="text-sm break-words" dangerouslySetInnerHTML={{ __html: message.text }} />
                      )}

                      {message.file && (
                        <div className="mt-2">
                          {message.file.type.startsWith('image/') && message.file.url ? (
                            <img
                              src={message.file.url}
                              alt={message.file.name}
                              className="max-w-full max-h-64 rounded cursor-pointer"
                              onClick={() => window.open(message.file?.url, '_blank')}
                            />
                          ) : (
                            <div className="flex items-center gap-2 p-2 bg-white/20 rounded text-xs">
                              <Paperclip className="h-3 w-3" />
                              <span>{message.file.name}</span>
                              {message.file.url && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => window.open(message.file?.url, '_blank')}
                                  className="h-6 px-2 text-xs"
                                >
                                  Download
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-xs opacity-75 mt-1">{formatTime(message.timestamp)}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-shrink-0"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>

                <Input
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                  placeholder="Type a message or /help for commands..."
                  className="flex-1"
                />

                <Button
                  onClick={handleSendMessage}
                  disabled={!messageText.trim()}
                  className="flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No room selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create a new room or join an existing one to start chatting
              </p>
              <Button onClick={() => setShowNewRoomDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* New Room Dialog */}
      <Dialog open={showNewRoomDialog} onOpenChange={setShowNewRoomDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create or Join Room</DialogTitle>
            <DialogDescription>
              Create a new room or join an existing one with a room ID
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Button onClick={handleCreateRoom} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create New Room
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-id">Join Existing Room</Label>
              <div className="flex gap-2">
                <Input
                  id="room-id"
                  value={newRoomId}
                  onChange={(e) => setNewRoomId(e.target.value.toUpperCase())}
                  placeholder="Enter Room ID"
                  className="font-mono"
                  maxLength={8}
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!newRoomId.trim()}
                >
                  Join
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};