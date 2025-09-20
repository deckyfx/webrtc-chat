import React, { useState, useRef, useEffect } from 'react';
import { useTrysteroStore } from '../stores/trysteroStore';
import { formatMessageText } from '../lib/textFormatter';
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
  Copy,
  Check,
  Hash,
  Image,
  LogOut,
  Loader2,
  AlertCircle,
  CheckCircle,
  Power
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { AvatarPicker } from './AvatarPicker';

export const TrysteroChat: React.FC = () => {
  const user = useTrysteroStore(state => state.user);
  const rooms = useTrysteroStore(state => state.rooms);
  const activeRoomId = useTrysteroStore(state => state.activeRoomId);

  const currentRoom = useTrysteroStore(state =>
    state.rooms.find(room => room.id === state.activeRoomId) || null
  );

  const createRoom = useTrysteroStore(state => state.createRoom);
  const joinRoom = useTrysteroStore(state => state.joinRoom);
  const leaveRoom = useTrysteroStore(state => state.leaveRoom);
  const setActiveRoom = useTrysteroStore(state => state.setActiveRoom);
  const sendMessage = useTrysteroStore(state => state.sendMessage);
  const markRoomAsRead = useTrysteroStore(state => state.markRoomAsRead);
  const setUserAvatar = useTrysteroStore(state => state.setUserAvatar);
  const signOut = useTrysteroStore(state => state.signOut);

  const [messageText, setMessageText] = useState('');
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentRoom?.messages.length]);

  const handleSendMessage = async () => {
    if ((!messageText.trim() && !selectedFile) || !activeRoomId) return;

    if (selectedFile) {
      await sendMessage({ file: selectedFile });
      setSelectedFile(null);
      setFilePreview(null);
    } else {
      await sendMessage({ text: messageText });
    }

    setMessageText('');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFilePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const copyRoomCode = () => {
    if (activeRoomId && navigator.clipboard) {
      navigator.clipboard.writeText(activeRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleJoinRoom = () => {
    if (joinRoomId.trim()) {
      joinRoom(joinRoomId.trim());
      setShowJoinDialog(false);
      setJoinRoomId('');
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rooms</h2>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={createRoom}
                title="Create Room"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowJoinDialog(true)}
                title="Join Room"
              >
                <Hash className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`
                  p-3 rounded-lg cursor-pointer transition-colors
                  ${room.id === activeRoomId
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
                onClick={() => setActiveRoom(room.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-sm text-gray-900 dark:text-white">
                      {room.name}
                    </span>
                  </div>
                  {room.id !== activeRoomId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        leaveRoom(room.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="text-xs">
                    {room.id}
                  </Badge>
                  {room.connectionState === 'connecting' && (
                    <Badge variant="outline" className="text-xs">
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Connecting
                    </Badge>
                  )}
                  {room.connectionState === 'ready' && room.peers.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Users className="h-3 w-3 mr-1" />
                      {room.peers.length}
                    </Badge>
                  )}
                  {room.connectionState === 'failed' && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Failed
                    </Badge>
                  )}
                  {room.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      {room.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            {rooms.length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p className="text-sm">No rooms yet</p>
                <p className="text-xs mt-2">Create or join a room to start chatting</p>
              </div>
            )}
          </div>
        </div>

        {/* User Info */}
        <div className="mt-auto p-4 border-t dark:border-gray-700">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-semibold transition-all hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 overflow-hidden"
              style={{
                backgroundColor: user?.avatarType === 'color' ? user.avatar : user?.avatarType === 'image' ? undefined : '#3B82F6',
                color: user?.avatarType === 'color' ? 'white' : undefined,
                backgroundImage: user?.avatarType === 'image' ? `url(${user.avatar})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
              title="Change avatar"
            >
              {user?.avatarType === 'emoji' ? user.avatar :
               user?.avatarType === 'image' ? '' :
               user?.name.charAt(0).toUpperCase()}
            </button>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Online • Click avatar to change</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={signOut}
              title="Sign Out"
              className="text-red-500 hover:text-red-600"
            >
              <Power className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      {currentRoom ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentRoom.name}
                  </h1>
                  {/* Connection Status Indicator */}
                  {currentRoom.connectionState === 'connecting' && (
                    <div className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Connecting...</span>
                    </div>
                  )}
                  {currentRoom.connectionState === 'connected' && !currentRoom.isReady && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Establishing connection...</span>
                    </div>
                  )}
                  {currentRoom.connectionState === 'ready' && (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Ready</span>
                    </div>
                  )}
                  {currentRoom.connectionState === 'failed' && (
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Connection failed</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{currentRoom.id}</Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={copyRoomCode}
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  {currentRoom.peers.length > 0 && (
                    <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                      <Users className="h-4 w-4" />
                      <span>{currentRoom.peers.length} {currentRoom.peers.length === 1 ? 'peer' : 'peers'} connected</span>
                    </div>
                  )}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => leaveRoom(currentRoom.id)}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-6">
            <div className="space-y-4 max-w-4xl mx-auto">
              {currentRoom.messages.map((message) => {
                // Find sender info from peers or use current user
                const sender = message.senderId === user?.id
                  ? user
                  : currentRoom.peers.find(p => p.id === message.senderId);

                const isOwnMessage = message.senderId === user?.id;
                const isSystem = message.senderId === 'system';

                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Avatar for other users (left side) */}
                    {!isOwnMessage && !isSystem && (
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold overflow-hidden"
                        style={{
                          backgroundColor: sender?.avatarType === 'color' ? sender.avatar : sender?.avatarType === 'image' ? undefined : '#9CA3AF',
                          color: sender?.avatarType === 'color' ? 'white' : undefined,
                          backgroundImage: sender?.avatarType === 'image' ? `url(${sender.avatar})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {sender?.avatarType === 'emoji' ? sender.avatar :
                         sender?.avatarType === 'image' ? '' :
                         sender?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}

                    <div
                      className={`
                        max-w-[70%] rounded-lg px-4 py-2
                        ${isSystem
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-center w-full max-w-none'
                          : isOwnMessage
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
                        }
                      `}
                    >
                    {!isSystem && !isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {sender?.name || message.senderName}
                      </p>
                    )}

                    {message.text && (
                      <div
                        className="text-sm"
                        dangerouslySetInnerHTML={{ __html: formatMessageText(message.text) }}
                      />
                    )}

                    {message.file && (
                      <div className="mt-2">
                        {message.file.type.startsWith('image/') && message.file.url ? (
                          <img
                            src={message.file.url}
                            alt={message.file.name}
                            className="max-w-full rounded"
                          />
                        ) : (
                          <div className="flex items-center gap-2 p-2 bg-white/10 rounded">
                            <Paperclip className="h-4 w-4" />
                            <span className="text-sm">{message.file.name}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <p className="text-xs opacity-50 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                    </div>

                    {/* Avatar for own messages (right side) */}
                    {isOwnMessage && (
                      <div
                        className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-semibold overflow-hidden"
                        style={{
                          backgroundColor: user?.avatarType === 'color' ? user.avatar : user?.avatarType === 'image' ? undefined : '#3B82F6',
                          color: user?.avatarType === 'color' ? 'white' : undefined,
                          backgroundImage: user?.avatarType === 'image' ? `url(${user.avatar})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }}
                      >
                        {user?.avatarType === 'emoji' ? user.avatar :
                         user?.avatarType === 'image' ? '' :
                         user?.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* File Preview */}
          {selectedFile && (
            <div className="px-6 py-2 bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {filePreview ? (
                    <img src={filePreview} alt="Preview" className="h-12 w-12 object-cover rounded" />
                  ) : (
                    <div className="h-12 w-12 bg-gray-300 dark:bg-gray-600 rounded flex items-center justify-center">
                      <Paperclip className="h-6 w-6 text-gray-500" />
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(selectedFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setSelectedFile(null);
                    setFilePreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="bg-white dark:bg-gray-800 border-t dark:border-gray-700 px-6 py-4">
            {!currentRoom.isReady && (
              <div className="flex items-center justify-center gap-2 py-2 text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {currentRoom.connectionState === 'connecting' ? 'Connecting to room...' :
                   currentRoom.connectionState === 'connected' ? 'Establishing peer connection...' :
                   currentRoom.connectionState === 'failed' ? 'Connection failed. Please try rejoining.' :
                   'Preparing chat...'}
                </span>
              </div>
            )}
            <div className={`flex items-center gap-2 ${!currentRoom.isReady ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept="image/*"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={!!selectedFile || !currentRoom.isReady}
              >
                {selectedFile ? <Image className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
              </Button>
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder={currentRoom.isReady ? "Type a message..." : "Connecting..."}
                className="flex-1"
                disabled={!!selectedFile || !currentRoom.isReady}
              />
              <Button onClick={handleSendMessage} disabled={!currentRoom.isReady}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No room selected
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Create a new room or join an existing one to start chatting
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={createRoom}>
                <Plus className="h-4 w-4 mr-2" />
                Create Room
              </Button>
              <Button variant="outline" onClick={() => setShowJoinDialog(true)}>
                <Hash className="h-4 w-4 mr-2" />
                Join Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Avatar Picker */}
      <AvatarPicker
        open={showAvatarPicker}
        onOpenChange={setShowAvatarPicker}
        currentAvatar={user?.avatar}
        currentAvatarType={user?.avatarType}
        onAvatarSelect={(avatar, type) => {
          setUserAvatar(avatar, type);
        }}
      />

      {/* Join Room Dialog */}
      <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join a Room</DialogTitle>
            <DialogDescription>
              Enter the room code shared with you to join an existing room.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-code">Room Code</Label>
              <Input
                id="room-code"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                placeholder="Enter 6-character code"
                maxLength={6}
                className="uppercase"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowJoinDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleJoinRoom} disabled={joinRoomId.length < 3}>
                Join Room
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};