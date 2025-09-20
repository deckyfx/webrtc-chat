import React, { useState } from 'react';
import { useTrysteroStore } from '../stores/trysteroStore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Label } from './ui/label';
import { MessageSquare, Users, Shield, Zap } from 'lucide-react';
import { AvatarPicker } from './AvatarPicker';
import { generateUUID } from '../lib/uuid';

export const EnhancedJoinScreen: React.FC = () => {
  const setUser = useTrysteroStore(state => state.setUser);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('😊');
  const [avatarType, setAvatarType] = useState<'emoji' | 'color' | 'image'>('emoji');
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
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

    setUser({
      id: generateUUID(),
      name: trimmedName,
      avatar,
      avatarType,
    });
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
              Set up your profile to start chatting peer-to-peer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Avatar</Label>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setShowAvatarPicker(true)}
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-semibold transition-all hover:ring-2 hover:ring-blue-500 hover:ring-offset-2 overflow-hidden"
                      style={{
                        backgroundColor: avatarType === 'color' ? avatar : avatarType === 'image' ? undefined : '#3B82F6',
                        color: avatarType === 'color' ? 'white' : undefined,
                        backgroundImage: avatarType === 'image' ? `url(${avatar})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    >
                      {avatarType === 'emoji' ? avatar :
                       avatarType === 'image' ? '' :
                       name.charAt(0).toUpperCase() || '?'}
                    </button>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      Click to choose an avatar
                    </div>
                  </div>
                </div>

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
                    This will be visible to people you chat with
                  </p>
                </div>
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

      {/* Avatar Picker */}
      <AvatarPicker
        open={showAvatarPicker}
        onOpenChange={setShowAvatarPicker}
        currentAvatar={avatar}
        currentAvatarType={avatarType}
        onAvatarSelect={(newAvatar, type) => {
          setAvatar(newAvatar);
          setAvatarType(type);
        }}
      />
    </div>
  );
};