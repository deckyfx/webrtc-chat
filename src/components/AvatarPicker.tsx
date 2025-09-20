import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Upload, X } from 'lucide-react';

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
  const [selectedTab, setSelectedTab] = useState<'emoji' | 'color' | 'image'>(
    currentAvatarType || 'emoji'
  );
  const [uploadedImage, setUploadedImage] = useState<string | null>(
    currentAvatarType === 'image' ? currentAvatar : null
  );
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Create canvas to resize image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject('Could not get canvas context');
            return;
          }

          // Set max size to 100x100 pixels
          const MAX_SIZE = 100;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height = (height * MAX_SIZE) / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width = (width * MAX_SIZE) / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress image
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

          // Check final size (rough estimate: base64 is ~1.37x larger than binary)
          const sizeInKB = (compressedBase64.length * 0.73) / 1024;
          if (sizeInKB > 50) {
            reject(`Image too large (${sizeInKB.toFixed(1)}KB). Please use a smaller image.`);
            return;
          }

          resolve(compressedBase64);
        };
        img.onerror = () => reject('Failed to load image');
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject('Failed to read file');
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB before compression)
    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image must be less than 2MB');
      return;
    }

    try {
      setUploadError('');
      const compressed = await compressImage(file);
      setUploadedImage(compressed);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Failed to process image');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Choose Your Avatar</DialogTitle>
        </DialogHeader>

        <Tabs value={selectedTab} onValueChange={(v) => setSelectedTab(v as 'emoji' | 'color' | 'image')}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="emoji">Emoji</TabsTrigger>
            <TabsTrigger value="color">Color</TabsTrigger>
            <TabsTrigger value="image">Image</TabsTrigger>
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

          <TabsContent value="image" className="mt-4">
            <div className="space-y-4">
              {uploadedImage ? (
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <img
                      src={uploadedImage}
                      alt="Avatar"
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 dark:border-gray-700"
                    />
                    <button
                      onClick={() => {
                        setUploadedImage(null);
                        setUploadError('');
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Image
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (uploadedImage) {
                          onAvatarSelect(uploadedImage, 'image');
                          onOpenChange(false);
                        }
                      }}
                    >
                      Use This Avatar
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
                >
                  <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    Click to upload an image
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Max 2MB • Will be compressed to 100x100
                  </p>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {uploadError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>
                </div>
              )}

              {currentAvatarType === 'image' && currentAvatar && !uploadedImage && (
                <div className="text-center">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Current avatar:
                  </p>
                  <img
                    src={currentAvatar}
                    alt="Current avatar"
                    className="w-20 h-20 mx-auto rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change Avatar
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};