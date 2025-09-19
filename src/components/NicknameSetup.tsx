import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { User } from "lucide-react";

interface NicknameSetupProps {
  onComplete: (nickname: string) => void;
}

export function NicknameSetup({ onComplete }: NicknameSetupProps) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError("Please enter a nickname");
      return;
    }

    if (trimmedNickname.length < 2) {
      setError("Nickname must be at least 2 characters");
      return;
    }

    if (trimmedNickname.length > 20) {
      setError("Nickname must be less than 20 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedNickname)) {
      setError("Nickname can only contain letters, numbers, underscores, and hyphens");
      return;
    }

    onComplete(trimmedNickname);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted">
      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center space-y-4 p-8">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">Welcome to WebRTC Chat</CardTitle>
          <CardDescription className="text-base">
            Choose a nickname to start chatting with others peer-to-peer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                type="text"
                placeholder="Enter your nickname"
                value={nickname}
                onChange={(e) => {
                  setNickname(e.target.value);
                  setError("");
                }}
                className={error ? "border-destructive" : ""}
                autoFocus
                maxLength={20}
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <p className="text-xs text-muted-foreground">
                2-20 characters, letters, numbers, underscores, and hyphens only
              </p>
            </div>
            <Button type="submit" className="w-full">
              Start Chatting
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}