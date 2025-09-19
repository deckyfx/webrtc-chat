import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Hash, Plus, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface JoinChannelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onJoinChannel: (channelId: string) => void;
  onCreateChannel: (channelName: string) => void;
  onStartPrivateChat: (userId: string) => void;
}

export function JoinChannelDialog({
  isOpen,
  onClose,
  onJoinChannel,
  onCreateChannel,
  onStartPrivateChat,
}: JoinChannelDialogProps) {
  const [channelId, setChannelId] = useState("");
  const [channelName, setChannelName] = useState("");
  const [userId, setUserId] = useState("");
  const [activeTab, setActiveTab] = useState("join");

  const handleJoinChannel = () => {
    const trimmed = channelId.trim();
    if (trimmed) {
      onJoinChannel(trimmed);
      setChannelId("");
      onClose();
    }
  };

  const handleCreateChannel = () => {
    const trimmed = channelName.trim();
    if (trimmed) {
      onCreateChannel(trimmed);
      setChannelName("");
      onClose();
    }
  };

  const handleStartPrivateChat = () => {
    const trimmed = userId.trim();
    if (trimmed) {
      onStartPrivateChat(trimmed);
      setUserId("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
          <DialogDescription>
            Join a channel, create a new one, or start a private chat
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="join">Join</TabsTrigger>
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="private">Private</TabsTrigger>
          </TabsList>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channelId">Channel ID or Name</Label>
              <Input
                id="channelId"
                placeholder="Enter channel ID or #channel-name"
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoinChannel()}
              />
              <p className="text-xs text-muted-foreground">
                Enter the unique channel ID shared by others
              </p>
            </div>
            <Button onClick={handleJoinChannel} className="w-full" disabled={!channelId.trim()}>
              <Hash className="mr-2 h-4 w-4" />
              Join Channel
            </Button>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="channelName">Channel Name</Label>
              <Input
                id="channelName"
                placeholder="my-awesome-channel"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleCreateChannel()}
              />
              <p className="text-xs text-muted-foreground">
                Create a new channel and get a unique ID to share
              </p>
            </div>
            <Button onClick={handleCreateChannel} className="w-full" disabled={!channelName.trim()}>
              <Plus className="mr-2 h-4 w-4" />
              Create Channel
            </Button>
          </TabsContent>

          <TabsContent value="private" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userId">User ID</Label>
              <Input
                id="userId"
                placeholder="Enter user's unique ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartPrivateChat()}
              />
              <p className="text-xs text-muted-foreground">
                Start a private peer-to-peer chat with a specific user
              </p>
            </div>
            <Button onClick={handleStartPrivateChat} className="w-full" disabled={!userId.trim()}>
              <Users className="mr-2 h-4 w-4" />
              Start Private Chat
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}