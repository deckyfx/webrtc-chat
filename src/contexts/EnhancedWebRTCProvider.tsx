import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { WebRTCManager, Message } from '../services/webrtc';

// Enhanced UUID generator with better entropy
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  ERROR = 'error',
}

export interface Room {
  id: string;
  name: string;
  messages: Message[];
  connectionState: ConnectionState;
  lastActivity: number;
  unreadCount: number;
}

export interface User {
  id: string;
  name: string;
}

interface EnhancedWebRTCContextType {
  user: User | null;
  rooms: Room[];
  activeRoomId: string | null;
  currentRoom: Room | null;
  connectionState: ConnectionState;

  // User actions
  setUserName: (name: string) => void;

  // Room management
  createRoom: () => string;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;

  // Connection management
  generateInviteCode: (roomId: string) => Promise<string>;
  joinWithInviteCode: (inviteCode: string) => Promise<string>;
  completeConnection: (answerCode: string) => Promise<void>;

  // Messaging
  sendMessage: (roomId: string, content: { text?: string; file?: File }) => Promise<void>;
  sendSystemMessage: (roomId: string, text: string) => void;
  markRoomAsRead: (roomId: string) => void;

  // Connection state
  isConnected: boolean;
  peerName: string | null;

  // Modal state
  isConnectionModalOpen: boolean;
  setConnectionModalOpen: (open: boolean) => void;
  inviteCode: string | null;
  setInviteCode: (code: string | null) => void;
}

const EnhancedWebRTCContext = createContext<EnhancedWebRTCContextType | undefined>(undefined);

export const useEnhancedWebRTC = (): EnhancedWebRTCContextType => {
  const context = useContext(EnhancedWebRTCContext);
  if (!context) {
    throw new Error('useEnhancedWebRTC must be used within an EnhancedWebRTCProvider');
  }
  return context;
};

interface EnhancedWebRTCProviderProps {
  children: React.ReactNode;
}

export const EnhancedWebRTCProvider: React.FC<EnhancedWebRTCProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [webrtcManager, setWebrtcManager] = useState<WebRTCManager | null>(null);
  const [isConnectionModalOpen, setConnectionModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);

  // Use ref to track current active room for message handlers
  const activeRoomIdRef = useRef<string | null>(null);

  // Update ref when activeRoomId changes
  useEffect(() => {
    activeRoomIdRef.current = activeRoomId;
  }, [activeRoomId]);

  // Get current room
  const currentRoom = rooms.find(room => room.id === activeRoomId) || null;

  // Load data from localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('webrtc-chat-user');
    const savedRooms = localStorage.getItem('webrtc-chat-rooms');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    if (savedRooms) {
      const parsedRooms = JSON.parse(savedRooms);
      setRooms(parsedRooms);
      if (parsedRooms.length > 0) {
        setActiveRoomId(parsedRooms[0].id);
      }
    }
  }, []);

  // Save data to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('webrtc-chat-user', JSON.stringify(user));
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem('webrtc-chat-rooms', JSON.stringify(rooms));
  }, [rooms]);

  // Initialize WebRTC manager when user is set
  useEffect(() => {
    if (user && !webrtcManager) {
      const manager = new WebRTCManager(user.id, user.name);

      manager.onMessage = (message: Message) => {
        console.log('Received message in context:', message);
        console.log('Current activeRoomIdRef:', activeRoomIdRef.current);

        setRooms(prev => {
          // Add the message to the active room
          const targetRoomId = activeRoomIdRef.current || prev[0]?.id;
          console.log('Target room for message:', targetRoomId);

          return prev.map(room => {
            if (room.id === targetRoomId) {
              console.log('Adding message to room:', room.id);
              return {
                ...room,
                messages: [...room.messages, message],
                lastActivity: Date.now(),
                unreadCount: room.id === activeRoomIdRef.current ? 0 : room.unreadCount + 1,
              };
            }
            return room;
          });
        });
      };

      manager.onPeerConnected = () => {
        console.log('Peer connected in context');
        setConnectionState(ConnectionState.CONNECTED);
        // Automatically close the connection modal when connected
        setConnectionModalOpen(false);

        // Update the room connection state
        if (activeRoomId) {
          setRooms(prev => prev.map(room => {
            if (room.id === activeRoomId) {
              return {
                ...room,
                connectionState: ConnectionState.CONNECTED,
                messages: [...room.messages, {
                  id: generateUUID(),
                  text: '✅ Peer-to-peer connection established! You can now chat.',
                  senderId: 'system',
                  senderName: 'System',
                  timestamp: Date.now(),
                }],
                lastActivity: Date.now(),
              };
            }
            return room;
          }));
        }
      };

      manager.onPeerDisconnected = () => {
        console.log('Peer disconnected in context');
        setConnectionState(ConnectionState.DISCONNECTED);
        setPeerName(null);

        // Update the room connection state
        if (activeRoomId) {
          setRooms(prev => prev.map(room => {
            if (room.id === activeRoomId) {
              return {
                ...room,
                connectionState: ConnectionState.DISCONNECTED,
                messages: [...room.messages, {
                  id: generateUUID(),
                  text: '⚠️ Peer disconnected.',
                  senderId: 'system',
                  senderName: 'System',
                  timestamp: Date.now(),
                }],
                lastActivity: Date.now(),
              };
            }
            return room;
          }));
        }
      };

      setWebrtcManager(manager);
    }
  }, [user, webrtcManager, activeRoomId]);

  const setUserName = useCallback((name: string) => {
    const newUser: User = {
      id: generateUUID(),
      name: name.trim(),
    };
    setUser(newUser);
  }, []);

  const createRoom = useCallback((): string => {
    const roomId = generateUUID().split('-')[0].toUpperCase();
    const newRoom: Room = {
      id: roomId,
      name: `Room ${roomId}`,
      messages: [{
        id: generateUUID(),
        text: `Welcome to Room ${roomId}! Share the room ID with others to invite them.`,
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      }],
      connectionState: ConnectionState.DISCONNECTED,
      lastActivity: Date.now(),
      unreadCount: 0,
    };

    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(roomId);
    return roomId;
  }, []);

  const joinRoom = useCallback((roomId: string) => {
    const normalizedRoomId = roomId.toUpperCase().trim();

    // Check if room already exists
    if (rooms.find(room => room.id === normalizedRoomId)) {
      setActiveRoomId(normalizedRoomId);
      return;
    }

    const newRoom: Room = {
      id: normalizedRoomId,
      name: `Room ${normalizedRoomId}`,
      messages: [{
        id: generateUUID(),
        text: `Joined Room ${normalizedRoomId}! Generate an invite code to connect with peers.`,
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      }],
      connectionState: ConnectionState.DISCONNECTED,
      lastActivity: Date.now(),
      unreadCount: 0,
    };

    setRooms(prev => [...prev, newRoom]);
    setActiveRoomId(normalizedRoomId);
  }, [rooms]);

  const leaveRoom = useCallback((roomId: string) => {
    // Disconnect if this is the active room
    if (roomId === activeRoomId && webrtcManager) {
      webrtcManager.disconnect();
    }

    setRooms(prev => prev.filter(room => room.id !== roomId));

    // Set new active room
    const remainingRooms = rooms.filter(room => room.id !== roomId);
    if (remainingRooms.length > 0) {
      setActiveRoomId(remainingRooms[0].id);
    } else {
      setActiveRoomId(null);
    }
  }, [activeRoomId, webrtcManager, rooms]);

  const setActiveRoom = useCallback((roomId: string) => {
    setActiveRoomId(roomId);
    markRoomAsRead(roomId);
  }, []);

  const generateInviteCode = useCallback(async (roomId: string): Promise<string> => {
    if (!webrtcManager) throw new Error('WebRTC manager not initialized');

    setConnectionState(ConnectionState.CONNECTING);
    try {
      const code = await webrtcManager.createOffer(roomId);
      setInviteCode(code);

      // Add system message
      setRooms(prev => prev.map(room => {
        if (room.id === roomId) {
          return {
            ...room,
            messages: [...room.messages, {
              id: generateUUID(),
              text: 'Invite code generated! Share it with your peer to establish connection.',
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            lastActivity: Date.now(),
          };
        }
        return room;
      }));

      return code;
    } catch (error) {
      setConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }, [webrtcManager]);

  const joinWithInviteCode = useCallback(async (inviteCode: string): Promise<string> => {
    if (!webrtcManager || !activeRoomId) throw new Error('WebRTC manager or room not ready');

    setConnectionState(ConnectionState.CONNECTING);
    try {
      const answerCode = await webrtcManager.handleInvite(inviteCode, activeRoomId);

      // Add system message
      setRooms(prev => prev.map(room => {
        if (room.id === activeRoomId) {
          return {
            ...room,
            messages: [...room.messages, {
              id: generateUUID(),
              text: 'Received invite! Answer code generated. Share it back to complete the connection.',
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            lastActivity: Date.now(),
          };
        }
        return room;
      }));

      return answerCode;
    } catch (error) {
      setConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }, [webrtcManager, activeRoomId]);

  const completeConnection = useCallback(async (answerCode: string): Promise<void> => {
    if (!webrtcManager) throw new Error('WebRTC manager not initialized');

    try {
      await webrtcManager.handleAnswer(answerCode);

      // Add system message - connection state will be updated when data channel opens
      if (activeRoomId) {
        setRooms(prev => prev.map(room => {
          if (room.id === activeRoomId) {
            return {
              ...room,
              messages: [...room.messages, {
                id: generateUUID(),
                text: '🔄 Processing answer code, establishing connection...',
                senderId: 'system',
                senderName: 'System',
                timestamp: Date.now(),
              }],
              lastActivity: Date.now(),
            };
          }
          return room;
        }));
      }
    } catch (error) {
      setConnectionState(ConnectionState.ERROR);
      throw error;
    }
  }, [webrtcManager, activeRoomId]);

  const sendMessage = useCallback(async (roomId: string, content: { text?: string; file?: File }): Promise<void> => {
    if (!webrtcManager || !user) return;

    const message = await webrtcManager.send(content);
    if (message) {
      setRooms(prev => prev.map(room => {
        if (room.id === roomId) {
          return {
            ...room,
            messages: [...room.messages, message],
            lastActivity: Date.now(),
          };
        }
        return room;
      }));
    } else {
      // Message failed to send - add warning directly
      console.error('Failed to send message - data channel may not be open');
      setRooms(prev => prev.map(room => {
        if (room.id === roomId) {
          return {
            ...room,
            messages: [...room.messages, {
              id: generateUUID(),
              text: '⚠️ Failed to send message. Please ensure you are connected to a peer.',
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            lastActivity: Date.now(),
          };
        }
        return room;
      }));
    }
  }, [webrtcManager, user]);

  const sendSystemMessage = useCallback((roomId: string, text: string) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return {
          ...room,
          messages: [...room.messages, {
            id: generateUUID(),
            text,
            senderId: 'system',
            senderName: 'System',
            timestamp: Date.now(),
          }],
          lastActivity: Date.now(),
        };
      }
      return room;
    }));
  }, []);

  const markRoomAsRead = useCallback((roomId: string) => {
    setRooms(prev => prev.map(room => {
      if (room.id === roomId) {
        return { ...room, unreadCount: 0 };
      }
      return room;
    }));
  }, []);

  const value: EnhancedWebRTCContextType = {
    user,
    rooms,
    activeRoomId,
    currentRoom,
    connectionState,
    setUserName,
    createRoom,
    joinRoom,
    leaveRoom,
    setActiveRoom,
    generateInviteCode,
    joinWithInviteCode,
    completeConnection,
    sendMessage,
    sendSystemMessage,
    markRoomAsRead,
    isConnected: connectionState === ConnectionState.CONNECTED,
    peerName,
    isConnectionModalOpen,
    setConnectionModalOpen,
    inviteCode,
    setInviteCode,
  };

  return (
    <EnhancedWebRTCContext.Provider value={value}>
      {children}
    </EnhancedWebRTCContext.Provider>
  );
};