import React, { useState } from 'react';
import { useTrysteroStore } from '../stores/trysteroStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { MessageSquare, Users, Shield, Zap } from 'lucide-react';

export const EnhancedJoinScreen: React.FC = () => {
  const setUserName = useTrysteroStore(state => state.setUserName);
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter your name');
      return;
    }

    if (trimmedName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Name must be less than 30 characters');
      return;
    }

    setUserName(trimmedName);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-500 rounded-full">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            WebRTC Chat
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Peer-to-peer chat without servers
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="flex justify-center">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Secure</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">P2P</p>
          </div>
          <div className="space-y-2">
            <div className="flex justify-center">
              <Zap className="h-6 w-6 text-yellow-500" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">Fast</p>
          </div>
        </div>

        {/* Join Form */}
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Get Started</CardTitle>
            <CardDescription>
              Enter your name to start chatting peer-to-peer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setError('');
                  }}
                  className={error ? "border-red-500" : ""}
                  autoFocus
                  maxLength={30}
                />
                {error && (
                  <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  This name will be visible to people you chat with
                </p>
              </div>

              <Button type="submit" className="w-full" size="lg">
                Start Chatting
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* How it works */}
        <Card className="w-full">
          <CardContent className="pt-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              How it works:
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">1</span>
                <span>Create or join a room with a room ID</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">2</span>
                <span>Generate an invite code and share it</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mt-0.5">3</span>
                <span>Chat directly peer-to-peer, no servers!</span>
              </div>
            </div>
            {typeof window !== 'undefined' && !window.crypto?.subtle && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-800 dark:text-yellow-200">
                  ⚠️ <strong>Note:</strong> For security, this app requires HTTPS or localhost.
                  Please access via https:// or http://localhost
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};