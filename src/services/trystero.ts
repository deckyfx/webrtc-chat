import { joinRoom, type Room as TrysteroRoom } from 'trystero/torrent';
import { type Message } from '../stores/trysteroStore';
import { generateUUID } from '../lib/uuid';

// Ensure crypto is available
if (typeof window !== 'undefined' && !window.crypto?.subtle) {
  console.warn('Web Crypto API not available. Some features may not work.');
}

export interface PeerData {
  id: string;
  name: string;
}

export interface TrysteroConfig {
  appId: string;
  roomId: string;
  userId: string;
  userName: string;
}

export class TrysteroManager {
  private room: TrysteroRoom | null = null;
  private peers: Map<string, PeerData> = new Map();
  private sendMessage: ((data: any, peerId?: string) => void) | null = null;
  private sendFile: ((data: ArrayBuffer, metadata: any, peerId?: string) => void) | null = null;
  private sendPeerInfo: ((data: any, peerId?: string) => void) | null = null;
  private config: TrysteroConfig;
  private isReady: boolean = false;
  private readyCheckInterval: NodeJS.Timeout | null = null;

  // Event handlers
  public onMessage: ((message: Message, peerId: string) => void) | null = null;
  public onPeerJoin: ((peerId: string, peerData: PeerData) => void) | null = null;
  public onPeerLeave: ((peerId: string) => void) | null = null;
  public onRoomJoined: (() => void) | null = null;
  public onConnectionReady: (() => void) | null = null;
  public onConnectionFailed: ((error: Error) => void) | null = null;

  constructor(config: TrysteroConfig) {
    this.config = config;
  }

  public async joinRoom(): Promise<void> {
    if (this.room) {
      this.leaveRoom();
    }

    if (typeof window === 'undefined' || !window.crypto?.subtle) {
      console.error('Web Crypto API is not available. Cannot join room.');
      return;
    }


    try {
      this.room = joinRoom({ appId: this.config.appId }, this.config.roomId);
    } catch (error) {
      console.error('Failed to join room:', error);
      return;
    }

    const [sendMessage, receiveMessage] = this.room.makeAction('message');
    this.sendMessage = sendMessage;

    const [sendFile, receiveFile] = this.room.makeAction('file');
    this.sendFile = sendFile;

    const [sendPeerInfo, receivePeerInfo] = this.room.makeAction('peer-info');
    this.sendPeerInfo = sendPeerInfo;

    receiveMessage((data: any, peerId: string) => {
      if (!data || typeof data !== 'object') return;
      // Ensure timestamp is a valid number
      const message = data as Message;
      if (message.timestamp && typeof message.timestamp === 'string') {
        message.timestamp = parseInt(message.timestamp, 10);
      }
      this.onMessage?.(message, peerId);
    });

    receiveFile((fileData: any, peerId: string, metadata: any) => {
      if (!fileData || !(fileData instanceof ArrayBuffer)) return;
      
      const blob = new Blob([fileData], { type: metadata.type });
      const url = URL.createObjectURL(blob);

      const fileMessage: Message = {
        id: metadata.messageId,
        senderId: metadata.senderId,
        senderName: metadata.senderName,
        timestamp: metadata.timestamp,
        file: {
          name: metadata.name,
          type: metadata.type,
          size: metadata.size,
          url: url
        }
      };

      this.onMessage?.(fileMessage, peerId);
    });

    receivePeerInfo((peerData: any, peerId: string) => {
      if (!peerData || typeof peerData !== 'object') return;

      // Check if this is a new peer
      const isNewPeer = !this.peers.has(peerId);
      this.peers.set(peerId, peerData);

      // If this is a new peer, trigger the join event
      if (isNewPeer) {
        this.onPeerJoin?.(peerId, peerData);

        // Mark as ready when we get our first peer
        this.markAsReady();

        // Send our info back to the new peer
        const myInfo = { id: this.config.userId, name: this.config.userName };
        this.sendPeerInfo?.(myInfo, peerId);
      }
    });

    this.room.onPeerJoin((peerId: string) => {
      // When we detect a new peer, send our info to them
      const myInfo = { id: this.config.userId, name: this.config.userName };

      // Send info immediately
      if (this.sendPeerInfo) {
        this.sendPeerInfo(myInfo, peerId);
      }

      // Also send after a delay to ensure connection is established
      setTimeout(() => {
        if (this.sendPeerInfo) {
          this.sendPeerInfo(myInfo, peerId);
        }
      }, 500);
    });

    this.room.onPeerLeave((peerId: string) => {
      this.peers.delete(peerId);
      this.onPeerLeave?.(peerId);
    });

    // Announce ourselves to all existing peers after a short delay
    setTimeout(() => {
      const myInfo = { id: this.config.userId, name: this.config.userName };
      if (this.sendPeerInfo) {
        this.sendPeerInfo(myInfo); // Broadcast to all peers
      }
    }, 1000); // Increased delay to ensure connection is established

    this.onRoomJoined?.();

    // Set up connection ready detection
    this.setupReadyDetection();
  }

  public async send(content: { text?: string; file?: File }): Promise<Message | null> {
    if (!this.room || !this.sendMessage) {
      console.error('Not connected to a room', { room: this.room, sendMessage: this.sendMessage });
      return null;
    }


    const baseMessage: Omit<Message, 'text' | 'file'> = {
      id: generateUUID(),
      senderId: this.config.userId,
      senderName: this.config.userName,
      timestamp: Date.now(),
    };

    if (content.text) {
      const message: Message = { ...baseMessage, text: content.text };

      // Send to all peers
      this.sendMessage(message);

      return message;
    } else if (content.file && this.sendFile) {
      const file = content.file;

      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();

      // Prepare metadata
      const metadata = {
        messageId: baseMessage.id,
        senderId: baseMessage.senderId,
        senderName: baseMessage.senderName,
        timestamp: baseMessage.timestamp,
        name: file.name,
        type: file.type,
        size: file.size
      };

      // Send file to all peers
      this.sendFile(arrayBuffer, metadata);

      // Create local message with blob URL
      const blob = new Blob([arrayBuffer], { type: file.type });
      const url = URL.createObjectURL(blob);

      const message: Message = {
        ...baseMessage,
        file: {
          name: file.name,
          type: file.type,
          size: file.size,
          url: url
        }
      };

      return message;
    }

    return null;
  }

  public sendToPeer(content: { text?: string; file?: File }, peerId: string): Promise<Message | null> {
    // Similar to send() but targets specific peer
    // Implementation similar to above but with peerId parameter
    return this.send(content); // For now, using broadcast
  }

  private setupReadyDetection(): void {
    // Check readiness every 500ms
    // We're ready when:
    // 1. We have the sendMessage function (connection established)
    // 2. And either we have peers OR we've been waiting for at least 2 seconds (first in room)

    const startTime = Date.now();

    this.readyCheckInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      // Check if we're ready
      if (!this.isReady && this.sendMessage) {
        // Ready if we have peers OR if 2 seconds have passed (we're first)
        if (this.peers.size > 0 || elapsed >= 2000) {
          this.isReady = true;
          this.onConnectionReady?.();

          // Clear the interval once ready
          if (this.readyCheckInterval) {
            clearInterval(this.readyCheckInterval);
            this.readyCheckInterval = null;
          }
        }
      }

      // Stop checking after 10 seconds (connection timeout)
      if (elapsed >= 10000) {
        if (!this.isReady) {
          console.error('Connection timeout after 10 seconds');
          this.onConnectionFailed?.(new Error('Connection timeout'));
        }
        if (this.readyCheckInterval) {
          clearInterval(this.readyCheckInterval);
          this.readyCheckInterval = null;
        }
      }
    }, 500);
  }

  private markAsReady(): void {
    if (!this.isReady) {
      this.isReady = true;
      if (this.readyCheckInterval) {
        clearInterval(this.readyCheckInterval);
        this.readyCheckInterval = null;
      }
      this.onConnectionReady?.();
    }
  }

  public leaveRoom(): void {
    if (this.readyCheckInterval) {
      clearInterval(this.readyCheckInterval);
      this.readyCheckInterval = null;
    }
    if (this.room) {
      this.room.leave();
      this.room = null;
      this.peers.clear();
      this.sendMessage = null;
      this.sendFile = null;
      this.sendPeerInfo = null;
      this.isReady = false;
    }
  }

  public getPeers(): PeerData[] {
    return Array.from(this.peers.values());
  }

  public get isConnected(): boolean {
    return this.room !== null;
  }

  public get roomId(): string | null {
    return this.room ? this.config.roomId : null;
  }

}