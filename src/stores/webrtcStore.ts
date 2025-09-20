import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { WebRTCManager, type Message } from '../services/webrtc';

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

interface WebRTCState {
  // State
  user: User | null;
  rooms: Room[];
  activeRoomId: string | null;
  connectionState: ConnectionState;
  webrtcManager: WebRTCManager | null;
  isConnectionModalOpen: boolean;
  inviteCode: string | null;
  peerName: string | null;

  // Actions
  setUser: (user: User | null) => void;
  setUserName: (name: string) => void;
  setRooms: (rooms: Room[]) => void;
  setActiveRoomId: (id: string | null) => void;
  setConnectionState: (state: ConnectionState) => void;
  setWebrtcManager: (manager: WebRTCManager | null) => void;
  setConnectionModalOpen: (open: boolean) => void;
  setInviteCode: (code: string | null) => void;
  setPeerName: (name: string | null) => void;

  // Room management
  createRoom: () => string;
  joinRoom: (roomId: string) => void;
  leaveRoom: (roomId: string) => void;
  setActiveRoom: (roomId: string) => void;
  updateRoom: (roomId: string, update: Partial<Room>) => void;
  addMessageToRoom: (roomId: string, message: Message) => void;
  markRoomAsRead: (roomId: string) => void;

  // Connection management
  generateInviteCode: (roomId: string) => Promise<string>;
  joinWithInviteCode: (inviteCode: string) => Promise<string>;
  completeConnection: (answerCode: string) => Promise<void>;

  // Messaging
  sendMessage: (roomId: string, content: { text?: string; file?: File }) => Promise<void>;
  sendSystemMessage: (roomId: string, text: string) => void;

  // WebRTC Manager initialization
  initializeWebRTC: (userId: string, userName: string) => void;
  cleanupWebRTC: () => void;
}

export const useWebRTCStore = create<WebRTCState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        user: null,
        rooms: [],
        activeRoomId: null,
        connectionState: ConnectionState.DISCONNECTED,
        webrtcManager: null,
        isConnectionModalOpen: false,
        inviteCode: null,
        peerName: null,


        // Actions
        setUser: (user) => set({ user }),

        setUserName: (name) => {
          const newUser: User = {
            id: generateUUID(),
            name: name.trim(),
          };
          set({ user: newUser });

          // Initialize WebRTC when user is set
          const state = get();
          if (!state.webrtcManager) {
            state.initializeWebRTC(newUser.id, newUser.name);
          }
        },

        setRooms: (rooms) => set({ rooms }),
        setActiveRoomId: (activeRoomId) => set({ activeRoomId }),
        setConnectionState: (connectionState) => set({ connectionState }),
        setWebrtcManager: (webrtcManager) => set({ webrtcManager }),
        setConnectionModalOpen: (isConnectionModalOpen) => set({ isConnectionModalOpen }),
        setInviteCode: (inviteCode) => set({ inviteCode }),
        setPeerName: (peerName) => set({ peerName }),

        // Room management
        createRoom: () => {
          const roomId = (generateUUID().split('-')[0] || generateUUID()).toUpperCase();
          const newRoom: Room = {
            id: roomId,
            name: `Room ${roomId}`,
            messages: [{
              id: generateUUID(),
              text: `Welcome to Room ${roomId}! Share the room ID with others to invite them.<br><br><button class="system-action-btn" data-action="generate-invite">📤 Generate Invitation Code</button>`,
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            connectionState: ConnectionState.DISCONNECTED,
            lastActivity: Date.now(),
            unreadCount: 0,
          };

          set(state => ({
            rooms: [...state.rooms, newRoom],
            activeRoomId: roomId,
          }));

          return roomId;
        },

        joinRoom: (roomId) => {
          const normalizedRoomId = roomId.toUpperCase().trim();
          const state = get();

          // Check if room already exists
          if (state.rooms.find(room => room.id === normalizedRoomId)) {
            set({ activeRoomId: normalizedRoomId });
            return;
          }

          const newRoom: Room = {
            id: normalizedRoomId,
            name: `Room ${normalizedRoomId}`,
            messages: [{
              id: generateUUID(),
              text: `Joined Room ${normalizedRoomId}!<br><br><button class="system-action-btn" data-action="input-invite">📥 Input Invitation Code</button>`,
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            }],
            connectionState: ConnectionState.DISCONNECTED,
            lastActivity: Date.now(),
            unreadCount: 0,
          };

          set(state => ({
            rooms: [...state.rooms, newRoom],
            activeRoomId: normalizedRoomId,
          }));
        },

        leaveRoom: (roomId) => {
          const state = get();

          // Disconnect if this is the active room
          if (roomId === state.activeRoomId && state.webrtcManager) {
            state.webrtcManager.disconnect();
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

        updateRoom: (roomId, update) => {
          set(state => ({
            rooms: state.rooms.map(room =>
              room.id === roomId ? { ...room, ...update } : room
            ),
          }));
        },

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

        // Connection management
        generateInviteCode: async (roomId) => {
          const { webrtcManager } = get();
          if (!webrtcManager) throw new Error('WebRTC manager not initialized');

          set({ connectionState: ConnectionState.CONNECTING });
          try {
            const code = await webrtcManager.createOffer(roomId);
            set({ inviteCode: code });
            return code;
          } catch (error) {
            set({ connectionState: ConnectionState.ERROR });
            throw error;
          }
        },

        joinWithInviteCode: async (inviteCode) => {
          const { webrtcManager, activeRoomId } = get();
          if (!webrtcManager || !activeRoomId) throw new Error('WebRTC manager or room not ready');

          set({ connectionState: ConnectionState.CONNECTING });
          try {
            const answerCode = await webrtcManager.handleInvite(inviteCode, activeRoomId);
            return answerCode;
          } catch (error) {
            set({ connectionState: ConnectionState.ERROR });
            throw error;
          }
        },

        completeConnection: async (answerCode) => {
          const { webrtcManager } = get();
          if (!webrtcManager) throw new Error('WebRTC manager not initialized');

          try {
            await webrtcManager.handleAnswer(answerCode);
          } catch (error) {
            set({ connectionState: ConnectionState.ERROR });
            throw error;
          }
        },

        // Messaging
        sendMessage: async (roomId, content) => {
          const { webrtcManager, user } = get();
          if (!webrtcManager || !user) return;

          const message = await webrtcManager.send(content);
          if (message) {
            get().addMessageToRoom(roomId, message);
          } else {
            // Message failed to send - add warning
            console.error('Failed to send message - data channel may not be open');
            get().sendSystemMessage(roomId, '⚠️ Failed to send message. Please ensure you are connected to a peer.');
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

        // WebRTC Manager initialization
        initializeWebRTC: (userId, userName) => {
          const manager = new WebRTCManager(userId, userName);

          // Set up event handlers
          manager.onMessage = (message: Message) => {
            console.log('Received message in store:', message);
            const { activeRoomId, rooms } = get();
            const targetRoomId = activeRoomId || rooms[0]?.id;

            if (targetRoomId) {
              get().addMessageToRoom(targetRoomId, message);
            }
          };

          manager.onPeerConnected = () => {
            console.log('Peer connected in store');
            const { activeRoomId } = get();

            set({
              connectionState: ConnectionState.CONNECTED,
              isConnectionModalOpen: false,
            });

            if (activeRoomId) {
              get().updateRoom(activeRoomId, {
                connectionState: ConnectionState.CONNECTED,
              });

              get().sendSystemMessage(activeRoomId, '✅ Peer-to-peer connection established! You can now chat.');
            }
          };

          manager.onPeerDisconnected = () => {
            console.log('Peer disconnected in store');
            const { activeRoomId } = get();

            set({
              connectionState: ConnectionState.DISCONNECTED,
              peerName: null,
            });

            if (activeRoomId) {
              get().updateRoom(activeRoomId, {
                connectionState: ConnectionState.DISCONNECTED,
              });

              get().sendSystemMessage(activeRoomId, '⚠️ Peer disconnected.');
            }
          };

          set({ webrtcManager: manager });
        },

        cleanupWebRTC: () => {
          const { webrtcManager } = get();
          if (webrtcManager) {
            webrtcManager.disconnect();
            set({ webrtcManager: null });
          }
        },
      }),
      {
        name: 'webrtc-chat-storage',
        partialize: (state) => ({
          user: state.user,
          rooms: state.rooms,
          activeRoomId: state.activeRoomId,
        }),
      }
    )
  )
);