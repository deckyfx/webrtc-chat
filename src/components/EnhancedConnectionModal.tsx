import React, { useState } from 'react';
import { useWebRTCStore } from '../stores/webrtcStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Copy, Check, Share, Users, QrCode } from 'lucide-react';

export const EnhancedConnectionModal: React.FC = () => {
  const isConnectionModalOpen = useWebRTCStore(state => state.isConnectionModalOpen);
  const setConnectionModalOpen = useWebRTCStore(state => state.setConnectionModalOpen);
  const activeRoomId = useWebRTCStore(state => state.activeRoomId);
  const inviteCode = useWebRTCStore(state => state.inviteCode);
  const setInviteCode = useWebRTCStore(state => state.setInviteCode);

  const generateInviteCode = useWebRTCStore(state => state.generateInviteCode);
  const joinWithInviteCode = useWebRTCStore(state => state.joinWithInviteCode);
  const completeConnection = useWebRTCStore(state => state.completeConnection);

  const [inputInviteCode, setInputInviteCode] = useState('');
  const [answerCode, setAnswerCode] = useState('');
  const [inputAnswerCode, setInputAnswerCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerateInvite = async () => {
    if (!activeRoomId) return;

    setLoading(true);
    setError('');
    try {
      await generateInviteCode(activeRoomId);
    } catch (err) {
      setError('Failed to generate invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinWithCode = async () => {
    if (!inputInviteCode.trim()) return;

    setLoading(true);
    setError('');
    try {
      const answer = await joinWithInviteCode(inputInviteCode.trim());
      setAnswerCode(answer);
    } catch (err) {
      setError('Failed to process invite code');
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteConnection = async () => {
    if (!inputAnswerCode.trim()) return;

    setLoading(true);
    setError('');
    try {
      await completeConnection(inputAnswerCode.trim());
      setConnectionModalOpen(false);
      resetForm();
    } catch (err) {
      setError('Failed to complete connection');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setInputInviteCode('');
    setAnswerCode('');
    setInputAnswerCode('');
    setError('');
    setInviteCode(null);
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={isConnectionModalOpen} onOpenChange={(open) => {
      setConnectionModalOpen(open);
      if (!open) resetForm();
    }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connect with Peer
          </DialogTitle>
          <DialogDescription>
            Establish a peer-to-peer connection by sharing invite codes
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <Tabs defaultValue="create" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create Invite</TabsTrigger>
            <TabsTrigger value="join">Join with Code</TabsTrigger>
            <TabsTrigger value="complete">Complete Connection</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">Step 1: Generate Invite Code</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Create an invite code to share with your peer
                </p>

                {!inviteCode ? (
                  <Button
                    onClick={handleGenerateInvite}
                    disabled={loading || !activeRoomId}
                    className="w-full"
                    size="lg"
                  >
                    <Share className="h-4 w-4 mr-2" />
                    {loading ? 'Generating...' : 'Generate Invite Code'}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <Textarea
                        value={inviteCode}
                        readOnly
                        className="font-mono text-xs resize-none"
                        rows={4}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(inviteCode)}
                        className="absolute top-2 right-2"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      📋 Share this invite code with your peer. They should paste it in the "Join with Code" tab.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="invite-code" className="text-base font-medium">Step 2: Paste Invite Code</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Paste the invite code you received from your peer
                </p>

                <Textarea
                  id="invite-code"
                  placeholder="Paste the invite code here..."
                  value={inputInviteCode}
                  onChange={(e) => setInputInviteCode(e.target.value)}
                  className="font-mono text-xs"
                  rows={4}
                />

                <Button
                  onClick={handleJoinWithCode}
                  disabled={!inputInviteCode.trim() || loading}
                  className="w-full mt-3"
                  size="lg"
                >
                  {loading ? 'Processing...' : 'Process Invite Code'}
                </Button>

                {answerCode && (
                  <div className="space-y-3 mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <Label className="text-base font-medium text-green-800 dark:text-green-200">
                      Answer Code Generated!
                    </Label>
                    <div className="relative">
                      <Textarea
                        value={answerCode}
                        readOnly
                        className="font-mono text-xs resize-none bg-white dark:bg-gray-800"
                        rows={4}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(answerCode)}
                        className="absolute top-2 right-2"
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm text-green-700 dark:text-green-300">
                      📤 Share this answer code back with your peer so they can complete the connection!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="complete" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="answer-code" className="text-base font-medium">Step 3: Complete Connection</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Paste the answer code you received back from your peer
                </p>

                <Textarea
                  id="answer-code"
                  placeholder="Paste the answer code here..."
                  value={inputAnswerCode}
                  onChange={(e) => setInputAnswerCode(e.target.value)}
                  className="font-mono text-xs"
                  rows={4}
                />

                <Button
                  onClick={handleCompleteConnection}
                  disabled={!inputAnswerCode.trim() || loading}
                  className="w-full mt-3"
                  size="lg"
                >
                  {loading ? 'Connecting...' : 'Complete Connection'}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">How P2P Connection Works:</h4>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
              <span>Person A generates and shares an invite code</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
              <span>Person B processes the code and generates an answer</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
              <span>Person A uses the answer to complete the connection</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};