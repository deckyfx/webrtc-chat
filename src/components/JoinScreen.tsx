import React, { useState } from 'react';
import { useWebRTC } from '../contexts/WebRTCProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Textarea } from './ui/textarea';

const CreateRoomTab: React.FC = () => {
  const { createRoom } = useWebRTC();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');

  const handleCreate = () => {
    if (name.trim() && room.trim()) {
      createRoom(name.trim(), room.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="create-name">Your Name</Label>
        <Input id="create-name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="create-room">Room Name</Label>
        <Input id="create-room" placeholder="Enter a name for your room" value={room} onChange={(e) => setRoom(e.target.value)} />
      </div>
      <Button onClick={handleCreate} className="w-full">Create Room</Button>
    </div>
  );
};

const JoinRoomTab: React.FC = () => {
  const { joinRoom } = useWebRTC();
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = () => {
    if (name.trim() && room.trim() && inviteCode.trim()) {
      joinRoom(name.trim(), room.trim(), inviteCode.trim());
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="join-name">Your Name</Label>
        <Input id="join-name" placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="join-room">Room Name</Label>
        <Input id="join-room" placeholder="Enter the room name" value={room} onChange={(e) => setRoom(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="invite-code">Invite Code</Label>
        <Textarea id="invite-code" placeholder="Paste invite code here" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} rows={4} />
      </div>
      <Button onClick={handleJoin} className="w-full">Join Room</Button>
    </div>
  );
};

const JoinScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="w-full max-w-md">
        <Tabs defaultValue="create">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Room</TabsTrigger>
            <TabsTrigger value="join">Join Room</TabsTrigger>
          </TabsList>
          <TabsContent value="create">
            <CreateRoomTab />
          </TabsContent>
          <TabsContent value="join">
            <JoinRoomTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default JoinScreen;