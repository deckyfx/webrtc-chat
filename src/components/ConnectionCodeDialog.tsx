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
import { Copy, Link, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ConnectionCodeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  offerCode?: string;
  onGenerateOffer: () => void;
  onPasteOffer: (code: string) => void;
  onPasteAnswer: (code: string) => void;
}

export function ConnectionCodeDialog({
  isOpen,
  onClose,
  offerCode,
  onGenerateOffer,
  onPasteOffer,
  onPasteAnswer,
}: ConnectionCodeDialogProps) {
  const [pastedOffer, setPastedOffer] = useState("");
  const [pastedAnswer, setPastedAnswer] = useState("");
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState("create");

  const handleCopyOffer = async () => {
    if (offerCode) {
      try {
        // Try using the clipboard API if available
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(offerCode);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } else {
          // Fallback: Create a temporary textarea and copy from it
          const textarea = document.createElement('textarea');
          textarea.value = offerCode;
          textarea.style.position = 'fixed';
          textarea.style.top = '0';
          textarea.style.left = '0';
          textarea.style.width = '2em';
          textarea.style.height = '2em';
          textarea.style.padding = '0';
          textarea.style.border = 'none';
          textarea.style.outline = 'none';
          textarea.style.boxShadow = 'none';
          textarea.style.background = 'transparent';
          document.body.appendChild(textarea);
          textarea.focus();
          textarea.select();

          try {
            const successful = document.execCommand('copy');
            if (successful) {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } else {
              alert('Copy failed. Please select and copy the text manually.');
            }
          } catch (err) {
            alert('Copy failed. Please select and copy the text manually.');
          }

          document.body.removeChild(textarea);
        }
      } catch (error) {
        console.error('Failed to copy:', error);
        alert('Copy failed. Please select and copy the text manually.');
      }
    }
  };

  const handlePasteOffer = () => {
    if (pastedOffer.trim()) {
      onPasteOffer(pastedOffer.trim());
      setPastedOffer("");
      onClose();
    }
  };

  const handlePasteAnswer = () => {
    if (pastedAnswer.trim()) {
      onPasteAnswer(pastedAnswer.trim());
      setPastedAnswer("");
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl w-full">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl">Connect to Peer</DialogTitle>
          <DialogDescription className="text-base">
            Create or join a P2P connection using connection codes
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Create</TabsTrigger>
            <TabsTrigger value="join">Join</TabsTrigger>
            <TabsTrigger value="answer">Answer</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label className="text-base">Your Connection Code</Label>
              {!offerCode ? (
                <Button onClick={onGenerateOffer} className="w-full h-12 text-base">
                  <Link className="mr-2 h-5 w-5" />
                  Generate Connection Code
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="relative">
                    <Input
                      value={offerCode}
                      readOnly
                      className="pr-12 font-mono text-sm h-12"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1 top-1 h-10 w-10"
                      onClick={handleCopyOffer}
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Share this code with your peer. They should paste it in the "Join" tab.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="join" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="offerCode" className="text-base">Peer's Connection Code</Label>
              <Input
                id="offerCode"
                placeholder="Paste connection code here"
                value={pastedOffer}
                onChange={(e) => setPastedOffer(e.target.value)}
                className="font-mono text-sm h-12"
              />
              <p className="text-xs text-muted-foreground">
                Paste the connection code shared by your peer
              </p>
            </div>
            <Button
              onClick={handlePasteOffer}
              className="w-full h-12 text-base"
              disabled={!pastedOffer.trim()}
            >
              Connect
            </Button>
          </TabsContent>

          <TabsContent value="answer" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="answerCode" className="text-base">Response Code</Label>
              <Input
                id="answerCode"
                placeholder="Paste response code here"
                value={pastedAnswer}
                onChange={(e) => setPastedAnswer(e.target.value)}
                className="font-mono text-sm h-12"
              />
              <p className="text-xs text-muted-foreground">
                If you initiated the connection, paste the response code from your peer here
              </p>
            </div>
            <Button
              onClick={handlePasteAnswer}
              className="w-full h-12 text-base"
              disabled={!pastedAnswer.trim()}
            >
              Complete Connection
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}