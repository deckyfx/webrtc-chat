import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Send,
  Plus,
  X,
  Users,
  Hash,
  MessageSquare,
  Globe,
  Lock,
  Circle
} from "lucide-react";
import { Message } from "@/services/webrtc";

export interface ChatTab {
  id: string;
  name: string;
  type: 'channel' | 'private';
  isConnected: boolean;
  messages: Message[];
  unreadCount: number;
  users?: Array<{ userId: string; nickname: string; isOnline: boolean }>;
}

interface ChatInterfaceProps {
  userId: string;
  nickname: string;
  tabs: ChatTab[];
  activeTabId: string;
  onSendMessage: (tabId: string, message: string) => void;
  onTabChange: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onCreateChannel: () => void;
  onJoinChannel: (channelId: string) => void;
}

export function ChatInterface({
  userId,
  nickname,
  tabs,
  activeTabId,
  onSendMessage,
  onTabChange,
  onCloseTab,
  onCreateChannel,
  onJoinChannel,
}: ChatInterfaceProps) {
  const [messageInput, setMessageInput] = useState("");
  const [showUserList, setShowUserList] = useState(false); // Hidden by default on mobile
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Show user list on desktop by default
  useEffect(() => {
    const handleResize = () => {
      setShowUserList(window.innerWidth >= 1024); // lg breakpoint
    };
    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeTab = tabs.find(tab => tab.id === activeTabId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [activeTab?.messages]);

  // Focus input when tab changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [activeTabId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedMessage = messageInput.trim();
    if (trimmedMessage && activeTabId) {
      onSendMessage(activeTabId, trimmedMessage);
      setMessageInput("");
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const renderMessage = (message: Message, isOwn: boolean) => (
    <div
      key={message.id}
      className={`flex gap-2 py-1 px-2 hover:bg-muted/50 ${
        isOwn ? 'bg-primary/5' : ''
      }`}
    >
      <span className="text-xs text-muted-foreground min-w-[40px]">
        {formatTime(message.timestamp)}
      </span>
      <span className="font-medium text-sm">
        {isOwn ? 'You' : message.senderName}:
      </span>
      <span className="text-sm flex-1 break-words">{message.text}</span>
    </div>
  );

  return (
    <div className="h-screen w-full flex flex-col bg-background">
      {/* Header */}
      <div className="border-b px-4 lg:px-6 py-3 flex items-center justify-between bg-muted/30">
        <div className="flex items-center gap-3">
          <Globe className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">WebRTC Chat</span>
          <span className="text-sm text-muted-foreground hidden sm:inline">• {nickname}</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowUserList(!showUserList)}
          className="lg:hidden"
        >
          <Users className="h-4 w-4 mr-2" />
          Users
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Tabs */}
          <Tabs value={activeTabId} onValueChange={onTabChange} className="flex-1 flex flex-col">
            <div className="border-b bg-muted/20">
              <div className="flex items-center gap-1 px-2 lg:px-4 overflow-x-auto scrollbar-thin">
                <TabsList className="h-10 bg-transparent p-0 gap-1">
                  {tabs.map((tab) => (
                    <div key={tab.id} className="relative">
                      <TabsTrigger
                        value={tab.id}
                        className="flex items-center gap-2 pr-8 px-3 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                      >
                        {tab.type === 'channel' ? (
                          <Hash className="h-3 w-3" />
                        ) : (
                          <Lock className="h-3 w-3" />
                        )}
                        <span className="text-sm">{tab.name}</span>
                        {tab.unreadCount > 0 && (
                          <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                            {tab.unreadCount}
                          </span>
                        )}
                        <Circle
                          className={`h-2 w-2 ${
                            tab.isConnected ? 'fill-green-500 text-green-500' : 'fill-gray-400 text-gray-400'
                          }`}
                        />
                      </TabsTrigger>
                      {tab.id !== 'global' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onCloseTab(tab.id);
                          }}
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-muted rounded"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </TabsList>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onCreateChannel}
                  className="h-9 px-3"
                >
                  <Plus className="h-4 w-4" />
                  <span className="ml-2 hidden lg:inline">New Chat</span>
                </Button>
              </div>
            </div>

            {/* Chat Content */}
            {tabs.map((tab) => (
              <TabsContent
                key={tab.id}
                value={tab.id}
                className="flex-1 flex flex-col m-0 focus-visible:ring-0"
              >
                <ScrollArea className="flex-1 px-4 lg:px-6">
                  <div ref={scrollAreaRef} className="py-4 max-w-6xl mx-auto">
                    {tab.messages.length === 0 ? (
                      <div className="text-center text-muted-foreground text-sm py-8">
                        {tab.type === 'channel'
                          ? `Welcome to #${tab.name}! Start a conversation.`
                          : `Private conversation with ${tab.name}. Say hello!`}
                      </div>
                    ) : (
                      tab.messages.map((message) =>
                        renderMessage(message, message.senderId === userId)
                      )
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          {/* Message Input */}
          <div className="border-t p-4 lg:px-6">
            <div className="max-w-6xl mx-auto">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder={`Message ${activeTab ? (activeTab.type === 'channel' ? '#' + activeTab.name : activeTab.name) : ''}`}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="flex-1 h-10"
                  disabled={!activeTab?.isConnected}
                />
                <Button
                  type="submit"
                  size="default"
                  disabled={!activeTab?.isConnected || !messageInput.trim()}
                  className="px-4"
                >
                  <Send className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Send</span>
                </Button>
              </form>
              {!activeTab?.isConnected && (
                <p className="text-xs text-muted-foreground mt-2">
                  Connecting to peer...
                </p>
              )}
            </div>
          </div>
        </div>

        {/* User List Sidebar */}
        {showUserList && activeTab?.users && (
          <div className="w-64 lg:w-80 border-l bg-muted/10 flex-shrink-0">
            <div className="p-4 border-b">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Users ({activeTab.users.length})
              </h3>
            </div>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4 space-y-1">
                {activeTab.users.map((user) => (
                  <div
                    key={user.userId}
                    className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted/50 text-sm"
                  >
                    <Circle
                      className={`h-2 w-2 ${
                        user.isOnline
                          ? 'fill-green-500 text-green-500'
                          : 'fill-gray-400 text-gray-400'
                      }`}
                    />
                    <span className={user.userId === userId ? 'font-medium' : ''}>
                      {user.nickname}
                      {user.userId === userId && ' (you)'}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}