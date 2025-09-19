import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, UserPlus } from "lucide-react";

interface ConnectionDialogProps {
  isOpen: boolean;
  peerName: string;
  onAccept: () => void;
  onReject: () => void;
}

export function ConnectionDialog({
  isOpen,
  peerName,
  onAccept,
  onReject,
}: ConnectionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onReject()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UserPlus className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center">Chat Request</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-semibold">{peerName}</span> wants to chat with you.
            Would you like to accept?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-2 sm:justify-center">
          <Button variant="outline" onClick={onReject}>
            Decline
          </Button>
          <Button onClick={onAccept}>
            <MessageSquare className="mr-2 h-4 w-4" />
            Accept
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}