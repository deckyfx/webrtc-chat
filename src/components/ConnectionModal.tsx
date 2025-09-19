
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useWebRTC, ConnectionState } from '../contexts/WebRTCProvider';

export const ConnectionModal: React.FC = () => {
  const { connectionState, inviteCode, submitAnswer, leaveRoom } = useWebRTC();
  const [answer, setAnswer] = useState('');

  const handleCopy = (code: string | null) => {
    if (code) {
      navigator.clipboard.writeText(code);
    }
  };

  const handleSubmitAnswer = () => {
    if (answer.trim()) {
      submitAnswer(answer.trim());
    }
  };

  const isModalOpen = 
    connectionState === ConnectionState.CREATING ||
    connectionState === ConnectionState.JOINING ||
    connectionState === ConnectionState.CONNECTING;

  if (!isModalOpen) return null;

  return (
    <Dialog open={isModalOpen} onOpenChange={(open) => !open && leaveRoom()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {connectionState === ConnectionState.CREATING && 'Create Room: Step 1'}
            {connectionState === ConnectionState.JOINING && 'Join Room: Step 2'}
            {connectionState === ConnectionState.CONNECTING && 'Create Room: Step 2'}
          </DialogTitle>
        </DialogHeader>

        {connectionState === ConnectionState.CREATING && (
          <>
            <DialogDescription>Send this invite code to the other user. They will send you an answer code back.</DialogDescription>
            <Textarea readOnly value={inviteCode || ''} rows={5} />
            <Button onClick={() => handleCopy(inviteCode)}>Copy Invite Code</Button>
          </>
        )}

        {connectionState === ConnectionState.JOINING && (
            <>
                <DialogDescription>Send this answer code back to the room creator.</DialogDescription>
                <Textarea readOnly value={inviteCode || ''} rows={5} />
                <Button onClick={() => handleCopy(inviteCode)}>Copy Answer Code</Button>
            </>
        )}

        {(connectionState === ConnectionState.CREATING || connectionState === ConnectionState.CONNECTING) && (
            <div className="mt-4 space-y-2">
                <Label htmlFor="answer">Paste Answer Code</Label>
                <Textarea id="answer" value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} />
            </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={leaveRoom}>Cancel</Button>
          {(connectionState === ConnectionState.CREATING || connectionState === ConnectionState.CONNECTING) && (
            <Button onClick={handleSubmitAnswer}>Connect</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
