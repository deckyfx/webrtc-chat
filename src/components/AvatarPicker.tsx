import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

const EMOJI_AVATARS = [
  '😀', '😎', '🤓', '🤠', '🥳', '😇', '🤗', '🤩',
  '😋', '🤔', '🫡', '🤐', '😴', '🤯', '🥸', '😈',
  '👻', '👽', '🤖', '💩', '🐵', '🐶', '🐱', '🦁',
  '🐯', '🦊', '🐻', '🐼', '🐨', '🐸', '🦄', '🐝',
  '🦋', '🐙', '🦈', '🐳', '🦜', '🦩', '🦥', '🦦',
  '🐧', '🦭', '🐢', '🦎', '🐲', '🦕', '🎮', '🎯',
  '🎨', '🎭', '🎪', '🎬', '🎸', '🥁', '🎹', '🎺',
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏓', '🥊',
  '🚀', '✈️', '🚁', '🚂', '🚗', '🏎️', '🚲', '🛸',
  '🌈', '⭐', '🌟', '✨', '⚡', '🔥', '💧', '❄️'
];

const COLOR_AVATARS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#FF8CC8', '#64B5F6', '#AED581', '#FFD54F', '#FF8A65',
  '#CE93D8', '#80CBC4', '#FFAB91', '#81C784', '#9575CD'
];

interface AvatarPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAvatar?: string;
  currentAvatarType?: 'emoji' | 'color' | 'image';
  onAvatarSelect: (avatar: string, type: 'emoji' | 'color' | 'image') => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  open,
  onOpenChange,
  currentAvatar,
  currentAvatarType,
  onAvatarSelect,
}) => {
  const [selectedTab, setSelectedTab] = useState<'emoji' | 'color'>(
    currentAvatarType === 'color' ? 'color' : 'emoji'
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'emoji' | 'color')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
          </TabsList>

          <TabsContent value="emoji" className="mt-4">
            <div className="grid grid-cols-8 gap-2 max-h-[300px] overflow-y-auto">
              {EMOJI_AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onAvatarSelect(emoji, 'emoji');
                    onOpenChange(false);
                  }}
                  className={`
                    w-12 h-12 text-2xl rounded-lg transition-all
                    hover:scale-110 hover:bg-gray-100 dark:hover:bg-gray-800
                    ${currentAvatar === emoji && currentAvatarType === 'emoji'
                      ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : ''}
                  `}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="color" className="mt-4">
            <div className="grid grid-cols-5 gap-3">
              {COLOR_AVATARS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    onAvatarSelect(color, 'color');
                    onOpenChange(false);
                  }}
                  className={`
                    w-14 h-14 rounded-full transition-all
                    hover:scale-110 hover:shadow-lg
                    ${currentAvatar === color && currentAvatarType === 'color'
                      ? 'ring-4 ring-blue-500 ring-offset-2'
                      : ''}
                  `}
                  style={{ backgroundColor: color }}
                >
                  {currentAvatar === color && currentAvatarType === 'color' && (
                    <span className="text-white text-lg">✓</span>
                  )}
                </button>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};