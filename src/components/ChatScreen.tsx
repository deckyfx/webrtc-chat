
import React, { useState, useEffect, useRef } from 'react';
import { useWebRTC } from '../contexts/WebRTCProvider';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

const ChatScreen: React.FC = () => {
  const { user, room, peerName, messages, sendMessage, leaveRoom } = useWebRTC();
  const [text, setText] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const handleSend = () => {
    if (text.trim()) {
      sendMessage(text.trim());
      setText('');
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
                <div className={`rounded-lg px-4 py-2 max-w-xs lg:max-w-md ${msg.senderId === user?.id ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                  <p className="text-sm font-bold">{msg.senderName}</p>
                  <p>{msg.text}</p>
                  <p className="text-xs opacity-70 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Input 
              placeholder="Type a message..." 
              value={text} 
              onChange={(e) => setText(e.target.value)} 
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatScreen;
