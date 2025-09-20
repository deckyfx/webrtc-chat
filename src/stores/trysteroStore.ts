import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { TrysteroManager, type PeerData } from '../services/trystero';
import { generateUUID } from '../lib/uuid';

function generateRoomId(): string {
  // Generate a short, easy-to-share room ID
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export interface Message {
  id: string;
  text?: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  file?: {
    name: string;
    type: string;
    size: number;
    url?: string;
  };
}

export type ConnectionState = 'connecting' | 'connected' | 'ready' | 'failed';

export interface Room {
  id: string;
  name: string;
  messages: Message[];
  peers: PeerData[];
  lastActivity: number;
  unreadCount: number;
  connectionState: ConnectionState;
  isReady: boolean; // Can send messages
}

export interface User {
  id: string;
  name: string;
}

interface TrysteroState {
  // State
  user: User | null;
  rooms: Room[];
  activeRoomId: string | null;
  trysteroManagers: Record<string, TrysteroManager>;

  // Actions
  setUser: (user: User | null) => void;
  setUserName: (name: string) => void;

  // Room management
  createRoom: () => string;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;

  // Messaging
  sendMessage: (content: { text?: string; file?: File }) => Promise<void>;
  sendSystemMessage: (roomId: string, text: string) => void;

  // Peer management
  addPeer: (roomId: string, peerId: string, peerData: PeerData) => void;
  removePeer: (roomId: string, peerId: string) => void;

  // Message management
  addMessageToRoom: (roomId: string, message: Message) => void;
  markRoomAsRead: (roomId: string) => void;

  // Connection state management
  updateRoomConnectionState: (roomId: string, state: ConnectionState) => void;
  setRoomReady: (roomId: string, isReady: boolean) => void;

  // Trystero management
  initializeTrysteroForRoom: (roomId: string) => void;
  cleanupTrystero: () => void;
}

export const useTrysteroStore = create<TrysteroState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        rooms: [],
        activeRoomId: null,
        trysteroManagers: {},

        // User management
        setUser: (user) => set({ user }),

        setUserName: (name) => {
          const newUser: User = {
            id: generateUUID(),
            name: name.trim(),
          };
          set({ user: newUser });
        },

        // Room management
        createRoom: () => {
          const roomId = generateRoomId();
          const newRoom: Room = {
            id: roomId,
            name: `Room ${roomId}`,
            messages: [{
              id: generateUUID(),
              text: `🎉 Welcome to Room ${roomId}!\n\nShare this room code with others: ${roomId}\n\nThey just need to enter this code to join - no complex connection process!`,
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            peers: [],
            lastActivity: Date.now(),
            unreadCount: 0,
            connectionState: 'connecting',
            isReady: false,
          };

          set(state => ({
            rooms: [...state.rooms, newRoom],
            activeRoomId: roomId,
          }));

          get().initializeTrysteroForRoom(roomId);

          return roomId;
        },

        joinRoom: (roomId) => {
          const normalizedRoomId = roomId.toUpperCase().trim();
          const state = get();

          const existingRoom = state.rooms.find(room => room.id === normalizedRoomId);
          if (existingRoom) {
            set({ activeRoomId: normalizedRoomId });
            return;
          }

          const newRoom: Room = {
            id: normalizedRoomId,
            name: `Room ${normalizedRoomId}`,
            messages: [{
              id: generateUUID(),
              text: `📍 Joined Room ${normalizedRoomId}!\n\nConnecting to peers in this room...`,
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            peers: [],
            lastActivity: Date.now(),
            unreadCount: 0,
            connectionState: 'connecting',
            isReady: false,
          };

          set(state => ({
            rooms: [...state.rooms, newRoom],
            activeRoomId: normalizedRoomId,
          }));

          get().initializeTrysteroForRoom(normalizedRoomId);
        },

        leaveRoom: (roomId) => {
          const state = get();
          const manager = state.trysteroManagers[roomId];
          if (manager) {
            manager.leaveRoom();
            set(s => {
              const newManagers = { ...s.trysteroManagers };
              delete newManagers[roomId];
              return { trysteroManagers: newManagers };
            });
          }

          const remainingRooms = state.rooms.filter(room => room.id !== roomId);
          const newActiveRoomId = remainingRooms.length > 0 ? remainingRooms[0]!.id : null;

          set({
            rooms: remainingRooms,
            activeRoomId: newActiveRoomId,
          });
        },

        setActiveRoom: (roomId) => {
          set({ activeRoomId: roomId });
          get().markRoomAsRead(roomId);
        },

        // Messaging
        sendMessage: async (content) => {
          const { trysteroManagers, user, activeRoomId } = get();
          if (!activeRoomId || !user) return;

          const manager = trysteroManagers[activeRoomId];
          if (!manager) {
            console.error('No Trystero manager for active room');
            return;
          }

          const message = await manager.send(content);
          if (message) {
            get().addMessageToRoom(activeRoomId, message);
          } else {
            console.error('Failed to send message');
            get().sendSystemMessage(activeRoomId, '⚠️ Failed to send message. Make sure you are connected to the room.');
          }
        },

        sendSystemMessage: (roomId, text) => {
          const message: Message = {
            id: generateUUID(),
            text,
            senderId: 'system',
            senderName: 'System',
            timestamp: Date.now(),
          };
          get().addMessageToRoom(roomId, message);
        },

        // Peer management
        addPeer: (roomId, peerId, peerData) => {
          const state = get();
          const room = state.rooms.find(r => r.id === roomId);

          if (room) {
            // Check if this peer (by user ID) already exists
            const existingPeer = room.peers.find(p => p.id === peerData.id);

            if (!existingPeer) {

              // Update the peers list
              set(state => ({
                rooms: state.rooms.map(r => {
                  if (r.id === roomId) {
                    return {
                      ...r,
                      peers: [...r.peers, { ...peerData, peerId }], // Store both user ID and peer ID
                    };
                  }
                  return r;
                }),
              }));

              // Send system message after state update
              get().sendSystemMessage(roomId, `👋 *${peerData.name}* joined the room`);
            }
          }
        },

        removePeer: (roomId, peerId) => {
          const state = get();
          const room = state.rooms.find(r => r.id === roomId);

          if (room) {
            // Find peer by peerId (Trystero ID) or by user ID
            const leavingPeer = room.peers.find(p =>
              (p as any).peerId === peerId || p.id === peerId
            );

            if (leavingPeer) {
              // Update the peers list
              set(state => ({
                rooms: state.rooms.map(r => {
                  if (r.id === roomId) {
                    return {
                      ...r,
                      peers: r.peers.filter(p =>
                        (p as any).peerId !== peerId && p.id !== peerId
                      ),
                    };
                  }
                  return r;
                }),
              }));

              // Send system message after state update
              get().sendSystemMessage(roomId, `👋 *${leavingPeer.name}* left the room`);
            }
          }
        },

        // Message management
        addMessageToRoom: (roomId, message) => {
          set(state => ({
            rooms: state.rooms.map(room => {
              if (room.id === roomId) {
                return {
                  ...room,
                  messages: [...room.messages, message],
                  lastActivity: Date.now(),
                  unreadCount: room.id === state.activeRoomId ? 0 : room.unreadCount + 1,
                };
              }
              return room;
            }),
          }));
        },

        markRoomAsRead: (roomId) => {
          set(state => ({
            rooms: state.rooms.map(room =>
              room.id === roomId ? { ...room, unreadCount: 0 } : room
            ),
          }));
        },

        // Connection state management
        updateRoomConnectionState: (roomId, connectionState) => {
          set(state => ({
            rooms: state.rooms.map(room =>
              room.id === roomId ? { ...room, connectionState } : room
            ),
          }));
        },

        setRoomReady: (roomId, isReady) => {
          set(state => ({
            rooms: state.rooms.map(room =>
              room.id === roomId ? { ...room, isReady } : room
            ),
          }));

          if (isReady) {
            get().sendSystemMessage(roomId, '✅ *Ready to chat!* You can now send and receive messages.');
          }
        },

        // Trystero initialization
        initializeTrysteroForRoom: (roomId) => {
          const { user } = get();
          if (!user) return;

          if (typeof window === 'undefined' || !window.crypto?.subtle) {
            console.error('Web Crypto API not available. Please use HTTPS or localhost.');
            get().sendSystemMessage(roomId, '⚠️ Secure connection required. Please access this app via HTTPS or localhost.');
            return;
          }

          const manager = new TrysteroManager({
            appId: 'webrtc-chat-app',
            roomId: roomId,
            userId: user.id,
            userName: user.name,
          });

          manager.onMessage = (message, peerId) => {
            get().addMessageToRoom(roomId, message);
          };

          manager.onPeerJoin = (peerId, peerData) => {
            get().addPeer(roomId, peerId, peerData);
          };

          manager.onPeerLeave = (peerId) => {
            get().removePeer(roomId, peerId);
          };

          manager.onRoomJoined = () => {
            get().updateRoomConnectionState(roomId, 'connected');
            get().sendSystemMessage(roomId, '🔄 *Connecting to room...* Establishing peer connections...');
          };

          manager.onConnectionReady = () => {
            get().updateRoomConnectionState(roomId, 'ready');
            get().setRoomReady(roomId, true);
          };

          manager.onConnectionFailed = (error) => {
            console.error('Connection failed:', error);
            get().updateRoomConnectionState(roomId, 'failed');
            get().sendSystemMessage(roomId, `❌ *Connection failed!* ${error.message}`);
          };

          set(state => ({
            trysteroManagers: { ...state.trysteroManagers, [roomId]: manager },
          }));

          manager.joinRoom();
        },

        cleanupTrystero: () => {
          const { trysteroManagers } = get();
          Object.values(trysteroManagers).forEach(manager => manager.leaveRoom());
          set({ trysteroManagers: {} });
        },
      }),
      {
        name: 'trystero-chat-storage',
        partialize: (state) => ({
          user: state.user,
          rooms: state.rooms,
          activeRoomId: state.activeRoomId,
        }),
      }
    )
  )
);
