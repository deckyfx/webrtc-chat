/**
 * Signaling Service for WebRTC peer discovery and connection setup
 */

export type SignalType = 'offer' | 'answer' | 'candidate' | 'join' | 'leave' | 'request-chat';

export interface SignalMessage {
  type: SignalType;
  from: {
    userId: string;
    nickname: string;
  };
  to?: string;
  channelId?: string;
  payload?: any;
}

export interface Channel {
  id: string;
  name: string;
  users: Map<string, { userId: string; nickname: string }>;
  createdAt: number;
}

export class SignalingService {
  private ws: WebSocket | null = null;
  private userId: string;
  private nickname: string;
  private channels: Map<string, Channel> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  // Callbacks
  private onMessage?: (message: SignalMessage) => void;
  private onChannelUpdate?: (channelId: string, channel: Channel) => void;
  private onConnectionStateChange?: (connected: boolean) => void;

  constructor(userId: string, nickname: string) {
    this.userId = userId;
    this.nickname = nickname;
  }

  /**
   * Set callback handlers
   */
  public setHandlers(handlers: {
    onMessage?: (message: SignalMessage) => void;
    onChannelUpdate?: (channelId: string, channel: Channel) => void;
    onConnectionStateChange?: (connected: boolean) => void;
  }) {
    if (handlers.onMessage) {
      this.onMessage = handlers.onMessage;
    }
    if (handlers.onChannelUpdate) {
      this.onChannelUpdate = handlers.onChannelUpdate;
    }
    if (handlers.onConnectionStateChange) {
      this.onConnectionStateChange = handlers.onConnectionStateChange;
    }
  }

  /**
   * Connect to signaling server
   */
  public connect(): void {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host;
    const url = `${protocol}://${host}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Connected to signaling server');
        this.reconnectAttempts = 0;
        this.onConnectionStateChange?.(true);

        // Send initial join message
        this.send({
          type: 'join',
          from: {
            userId: this.userId,
            nickname: this.nickname,
          },
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: SignalMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse signaling message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('Disconnected from signaling server');
        this.onConnectionStateChange?.(false);
        this.ws = null;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
      this.onConnectionStateChange?.(false);
    }
  }

  /**
   * Handle incoming signaling message
   */
  private handleMessage(message: SignalMessage): void {
    switch (message.type) {
      case 'join':
        if (message.channelId) {
          this.handleUserJoin(message.channelId, message.from);
        }
        break;

      case 'leave':
        if (message.channelId) {
          this.handleUserLeave(message.channelId, message.from.userId);
        }
        break;

      default:
        // Pass through other messages to the callback
        this.onMessage?.(message);
        break;
    }
  }

  /**
   * Handle user joining a channel
   */
  private handleUserJoin(channelId: string, user: { userId: string; nickname: string }): void {
    let channel = this.channels.get(channelId);

    if (!channel) {
      channel = {
        id: channelId,
        name: `Channel ${channelId.slice(0, 8)}`,
        users: new Map(),
        createdAt: Date.now(),
      };
      this.channels.set(channelId, channel);
    }

    channel.users.set(user.userId, user);
    this.onChannelUpdate?.(channelId, channel);
  }

  /**
   * Handle user leaving a channel
   */
  private handleUserLeave(channelId: string, userId: string): void {
    const channel = this.channels.get(channelId);

    if (channel) {
      channel.users.delete(userId);

      // Remove empty channels
      if (channel.users.size === 0) {
        this.channels.delete(channelId);
      }

      this.onChannelUpdate?.(channelId, channel);
    }
  }

  /**
   * Send a signaling message
   */
  public send(message: SignalMessage): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('WebSocket is not connected');
      return false;
    }

    try {
      this.ws.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send signaling message:', error);
      return false;
    }
  }

  /**
   * Join a channel
   */
  public joinChannel(channelId: string): boolean {
    return this.send({
      type: 'join',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      channelId,
    });
  }

  /**
   * Leave a channel
   */
  public leaveChannel(channelId: string): boolean {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.users.delete(this.userId);
      if (channel.users.size === 0) {
        this.channels.delete(channelId);
      }
    }

    return this.send({
      type: 'leave',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      channelId,
    });
  }

  /**
   * Send offer to a specific peer
   */
  public sendOffer(to: string, offer: RTCSessionDescriptionInit, channelId?: string): boolean {
    return this.send({
      type: 'offer',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      to,
      channelId,
      payload: offer,
    });
  }

  /**
   * Send answer to a specific peer
   */
  public sendAnswer(to: string, answer: RTCSessionDescriptionInit, channelId?: string): boolean {
    return this.send({
      type: 'answer',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      to,
      channelId,
      payload: answer,
    });
  }

  /**
   * Send ICE candidate to a specific peer
   */
  public sendCandidate(to: string, candidate: RTCIceCandidate, channelId?: string): boolean {
    return this.send({
      type: 'candidate',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      to,
      channelId,
      payload: candidate,
    });
  }

  /**
   * Request to chat with someone
   */
  public requestChat(to: string, channelId?: string): boolean {
    return this.send({
      type: 'request-chat',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      to,
      channelId,
    });
  }

  /**
   * Get all channels
   */
  public getChannels(): Channel[] {
    return Array.from(this.channels.values());
  }

  /**
   * Get a specific channel
   */
  public getChannel(channelId: string): Channel | undefined {
    return this.channels.get(channelId);
  }

  /**
   * Generate a unique channel ID
   */
  public generateChannelId(): string {
    return `channel-${crypto.randomUUID()}`;
  }

  /**
   * Generate a unique private chat ID between two users
   */
  public generatePrivateChatId(userId1: string, userId2: string): string {
    // Sort user IDs to ensure consistent channel ID regardless of who initiates
    const sortedIds = [userId1, userId2].sort();
    return `private-${sortedIds[0]}-${sortedIds[1]}`;
  }

  /**
   * Disconnect from signaling server
   */
  public disconnect(): void {
    if (this.ws) {
      // Send leave message for all channels
      this.channels.forEach((channel) => {
        this.leaveChannel(channel.id);
      });

      this.ws.close();
      this.ws = null;
    }
    this.channels.clear();
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
  }

  /**
   * Check if connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}