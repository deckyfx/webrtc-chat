import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { WebRTCManager, Message } from '../services/webrtc';
import { generateUUID } from '../lib/uuid';

interface UserProfile {
  id: string;
  name: string;
}

export enum ConnectionState {
  DISCONNECTED,
  CREATING,
  JOINING,
  CONNECTING,
  CONNECTED,
}

interface WebRTCContextType {
  user: UserProfile | null;
  room: string | null;
  peerName: string | null;
  messages: Message[];
  connectionState: ConnectionState;
  inviteCode: string | null;
  createRoom: (name: string, room: string) => Promise<void>;
  joinRoom: (name: string, room: string, invite: string) => Promise<void>;
  submitAnswer: (answer: string) => Promise<void>;
  sendMessage: (text: string) => void;
  leaveRoom: () => void;
}

const WebRTCContext = createContext<WebRTCContextType | null>(null);

export const useWebRTC = () => {
  const context = useContext(WebRTCContext);
  if (!context) {
    throw new Error('useWebRTC must be used within a WebRTCProvider');
  }
  return context;
};

export const WebRTCProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [room, setRoom] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
  const [webRTCManager, setWebRTCManager] = useState<WebRTCManager | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const setupManager = useCallback((manager: WebRTCManager) => {
    manager.onMessage = (message) => setMessages(prev => [...prev, message]);
    manager.onPeerConnected = () => setConnectionState(ConnectionState.CONNECTED);
    manager.onPeerDisconnected = () => leaveRoom();
    setWebRTCManager(manager);
  }, []);

  const createRoom = useCallback(async (name: string, roomName: string) => {
    const userId = generateUUID();
    const userProfile = { id: userId, name };
    setUser(userProfile);
    setRoom(roomName);

    const manager = new WebRTCManager(userId, name);
    setupManager(manager);

    setConnectionState(ConnectionState.CREATING);
    const offer = await manager.createOffer(generateUUID());
    setInviteCode(offer);
  }, [setupManager]);

  const joinRoom = useCallback(async (name: string, roomName: string, invite: string) => {
    const userId = generateUUID();
    const userProfile = { id: userId, name };
    setUser(userProfile);
    setRoom(roomName);

    const manager = new WebRTCManager(userId, name);
    setupManager(manager);

    setConnectionState(ConnectionState.JOINING);
    const answer = await manager.handleInvite(invite, generateUUID());
    setInviteCode(answer); // Re-using inviteCode state to hold the answer for the joiner
  }, [setupManager]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (webRTCManager) {
      setConnectionState(ConnectionState.CONNECTING);
      await webRTCManager.handleAnswer(answer);
    }
  }, [webRTCManager]);

  const sendMessage = useCallback((text: string) => {
    const message = webRTCManager?.sendMessage(text);
    if (message) {
      setMessages(prev => [...prev, message]);
    }
  }, [webRTCManager]);

  const leaveRoom = useCallback(() => {
    webRTCManager?.disconnect();
    setUser(null);
    setRoom(null);
    setWebRTCManager(null);
    setMessages([]);
    setConnectionState(ConnectionState.DISCONNECTED);
    setInviteCode(null);
  }, [webRTCManager]);

  return (
    <WebRTCContext.Provider value={{ user, room, peerName, messages, connectionState, inviteCode, createRoom, joinRoom, submitAnswer, sendMessage, leaveRoom }}>
      {children}
    </WebRTCContext.Provider>
  );
};