import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCProvider';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

const ChatScreen: React.FC = () => {
  const { user, room, peerName, messages, sendMessage, leaveRoom } = useWebRTC();
  const [html, setHtml] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const editableDivRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const applyFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editableDivRef.current?.focus();
  };

  const linkify = (html: string): string => {
    const urlRegex = /((?:https?|ftp):\/\/[^\s/$.?#].[^\s]*)/gi;
    return html.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="!text-blue-500">${url}</a>`);
  };

  const handleSend = () => {
    if (html.trim()) {
      const finalHtml = linkify(html.trim());
      sendMessage({ text: finalHtml });
      setHtml('');
      if(editableDivRef.current) {
        editableDivRef.current.innerHTML = '';
      }
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    setHtml(e.currentTarget.innerHTML);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sendMessage({ file: file });
      e.target.value = ''; // Clear the input
    }
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="h-full flex flex-col">
      <header className="flex items-center justify-between p-4 border-b">
        <div>
          <h2 className="text-xl font-bold">Room: {room}</h2>
          <p className="text-sm text-gray-500">Your Name: {user?.name}</p>
        </div>
        <Button variant="destructive" onClick={leaveRoom}>Leave</Button>
      </header>

      <div className="flex-grow flex flex-col overflow-hidden">
        <ScrollArea className="flex-grow p-4" ref={scrollAreaRef}>
          <div className="space-y-4">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex flex-col ${msg.senderId === user?.id ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${msg.senderId === user?.id ? 'bg-green-500 text-white' : 'bg-gray-300 dark:bg-gray-700'}`}>
                  <p className="text-sm font-bold">{msg.senderName}</p>
                  {msg.text && <div className="prose dark:prose-invert" dangerouslySetInnerHTML={{ __html: msg.text }} />}
                  {msg.file && (
                    <div className="mt-2">
                      {msg.file.type.startsWith('image/') ? (
                        <img src={msg.file.url} alt={msg.file.name} className="max-w-full h-auto rounded-md" />
                      ) : (
                        <a href={msg.file.url} download={msg.file.name} className="!text-blue-500 underline">
                          Download {msg.file.name} ({Math.round(msg.file.size / 1024)} KB)
                        </a>
                      )}
                    </div>
                  )}
                  <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
            <div className="border rounded-md">
                <div className="p-2 border-b flex items-center space-x-2">
                    <Button variant="outline" size="sm" onMouseDown={(e) => {e.preventDefault(); applyFormat('bold')}}><b>B</b></Button>
                    <Button variant="outline" size="sm" onMouseDown={(e) => {e.preventDefault(); applyFormat('italic')}}><i>I</i></Button>
                    <Button variant="outline" size="sm" onMouseDown={(e) => {e.preventDefault(); applyFormat('underline')}}><u>U</u></Button>
                    <Button variant="outline" size="sm" onMouseDown={(e) => {e.preventDefault(); applyFormat('strikeThrough')}}><del>S</del></Button>
                    <input 
                      type="color" 
                      className="w-6 h-6 p-0 border-none bg-transparent cursor-pointer"
                      onChange={(e) => applyFormat('foreColor', e.target.value)} 
                      title="Text Color"
                    />
                    <Select onValueChange={(value) => applyFormat('fontSize', value)}>
                        <SelectTrigger className="w-[100px]">
                            <SelectValue placeholder="Size" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">Small</SelectItem>
                            <SelectItem value="3">Normal</SelectItem>
                            <SelectItem value="5">Large</SelectItem>
                            <SelectItem value="7">Huge</SelectItem>
                        </SelectContent>
                    </Select>
                    <input type="file" style={{ display: 'none' }} ref={fileInputRef} onChange={handleFileSelect} />
                    <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>Attach File</Button>
                </div>
                <div 
                    ref={editableDivRef}
                    contentEditable
                    onInput={handleInput}
                    className="p-2 min-h-[60px] focus:outline-none"
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                        }
                    }}
                />
            </div>
          <Button onClick={handleSend} className="w-full mt-2">Send</Button>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;