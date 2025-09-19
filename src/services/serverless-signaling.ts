/**
 * Serverless Signaling Service - No backend required!
 * Uses manual connection string exchange for truly P2P connections
 */

import { generateUUID } from "../lib/uuid";

export interface ConnectionOffer {
  type: 'offer';
  from: {
    userId: string;
    nickname: string;
  };
  sessionId: string;
  offer: RTCSessionDescriptionInit;
  timestamp: number;
}

export interface ConnectionAnswer {
  type: 'answer';
  from: {
    userId: string;
    nickname: string;
  };
  sessionId: string;
  answer: RTCSessionDescriptionInit;
  timestamp: number;
}

export type ConnectionString = string; // Base64 encoded JSON

export class ServerlessSignalingService {
  private userId: string;
  private nickname: string;
  private pendingOffers: Map<string, ConnectionOffer> = new Map();
  private pendingAnswers: Map<string, ConnectionAnswer> = new Map();

  // Callbacks
  private onConnectionOffer?: (offer: ConnectionOffer) => void;
  private onConnectionAnswer?: (answer: ConnectionAnswer) => void;

  constructor(userId: string, nickname: string) {
    this.userId = userId;
    this.nickname = nickname;
  }

  /**
   * Set callback handlers
   */
  public setHandlers(handlers: {
    onConnectionOffer?: (offer: ConnectionOffer) => void;
    onConnectionAnswer?: (answer: ConnectionAnswer) => void;
  }) {
    if (handlers.onConnectionOffer) {
      this.onConnectionOffer = handlers.onConnectionOffer;
    }
    if (handlers.onConnectionAnswer) {
      this.onConnectionAnswer = handlers.onConnectionAnswer;
    }
  }

  /**
   * Create a connection offer string to share with another user
   */
  public createOfferString(sessionId: string, offer: RTCSessionDescriptionInit): ConnectionString {
    const offerData: ConnectionOffer = {
      type: 'offer',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      sessionId,
      offer,
      timestamp: Date.now(),
    };

    this.pendingOffers.set(sessionId, offerData);

    // Encode as base64 for easy sharing
    const jsonString = JSON.stringify(offerData);
    return btoa(jsonString);
  }

  /**
   * Create an answer string in response to an offer
   */
  public createAnswerString(sessionId: string, answer: RTCSessionDescriptionInit): ConnectionString {
    const answerData: ConnectionAnswer = {
      type: 'answer',
      from: {
        userId: this.userId,
        nickname: this.nickname,
      },
      sessionId,
      answer,
      timestamp: Date.now(),
    };

    this.pendingAnswers.set(sessionId, answerData);

    // Encode as base64 for easy sharing
    const jsonString = JSON.stringify(answerData);
    return btoa(jsonString);
  }

  /**
   * Process a connection string received from another user
   */
  public processConnectionString(connectionString: ConnectionString): boolean {
    try {
      // Decode base64
      const jsonString = atob(connectionString.trim());
      const data = JSON.parse(jsonString);

      // Validate timestamp (reject if older than 5 minutes)
      const ageMs = Date.now() - data.timestamp;
      if (ageMs > 5 * 60 * 1000) {
        console.warn('Connection string is too old (>5 minutes)');
        return false;
      }

      // Process based on type
      if (data.type === 'offer') {
        const offer = data as ConnectionOffer;

        // Don't process our own offers
        if (offer.from.userId === this.userId) {
          console.warn('Cannot process own offer');
          return false;
        }

        // Check if we've already processed this offer
        if (this.pendingOffers.has(offer.sessionId)) {
          console.warn('Offer already processed');
          return false;
        }

        this.pendingOffers.set(offer.sessionId, offer);
        this.onConnectionOffer?.(offer);
        return true;
      } else if (data.type === 'answer') {
        const answer = data as ConnectionAnswer;

        // Don't process our own answers
        if (answer.from.userId === this.userId) {
          console.warn('Cannot process own answer');
          return false;
        }

        // Check if we have a pending offer for this session
        const pendingOffer = this.pendingOffers.get(answer.sessionId);
        if (!pendingOffer) {
          console.warn('No pending offer for this answer');
          return false;
        }

        // Check if answer is from the right person
        // (In a true P2P scenario, we accept any answer)

        this.pendingAnswers.set(answer.sessionId, answer);
        this.onConnectionAnswer?.(answer);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to process connection string:', error);
      return false;
    }
  }

  /**
   * Generate a unique session ID for a new connection
   */
  public generateSessionId(): string {
    return `${this.userId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create a shareable room/channel code
   */
  public createRoomCode(roomName: string): string {
    const roomData = {
      type: 'room',
      roomId: generateUUID(),
      roomName,
      createdBy: {
        userId: this.userId,
        nickname: this.nickname,
      },
      createdAt: Date.now(),
    };

    // Create a shorter code for rooms (using first 8 chars of UUID)
    const shortCode = roomData.roomId.split('-')[0].toUpperCase();

    // Store in localStorage for persistence
    const rooms = this.getStoredRooms();
    rooms[shortCode] = roomData;
    localStorage.setItem('webrtc_chat_rooms', JSON.stringify(rooms));

    return shortCode;
  }

  /**
   * Join a room using a room code
   */
  public joinRoom(roomCode: string): { roomId: string; roomName: string } | null {
    const rooms = this.getStoredRooms();
    const room = rooms[roomCode.toUpperCase()];

    if (!room) {
      // Try to find room in shared rooms (would need external storage in real app)
      console.warn('Room not found:', roomCode);
      return null;
    }

    // Check if room is not too old (24 hours)
    const ageMs = Date.now() - room.createdAt;
    if (ageMs > 24 * 60 * 60 * 1000) {
      console.warn('Room has expired');
      delete rooms[roomCode.toUpperCase()];
      localStorage.setItem('webrtc_chat_rooms', JSON.stringify(rooms));
      return null;
    }

    return {
      roomId: room.roomId,
      roomName: room.roomName,
    };
  }

  /**
   * Get stored rooms from localStorage
   */
  private getStoredRooms(): Record<string, any> {
    try {
      const stored = localStorage.getItem('webrtc_chat_rooms');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  /**
   * Clear old pending offers/answers
   */
  public cleanup() {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    // Clean old offers
    for (const [sessionId, offer] of this.pendingOffers) {
      if (now - offer.timestamp > maxAge) {
        this.pendingOffers.delete(sessionId);
      }
    }

    // Clean old answers
    for (const [sessionId, answer] of this.pendingAnswers) {
      if (now - answer.timestamp > maxAge) {
        this.pendingAnswers.delete(sessionId);
      }
    }

    // Clean old rooms
    const rooms = this.getStoredRooms();
    let changed = false;
    for (const [code, room] of Object.entries(rooms)) {
      if (now - room.createdAt > 24 * 60 * 60 * 1000) {
        delete rooms[code];
        changed = true;
      }
    }
    if (changed) {
      localStorage.setItem('webrtc_chat_rooms', JSON.stringify(rooms));
    }
  }

  /**
   * Get a pending offer by session ID
   */
  public getPendingOffer(sessionId: string): ConnectionOffer | undefined {
    return this.pendingOffers.get(sessionId);
  }

  /**
   * Get a pending answer by session ID
   */
  public getPendingAnswer(sessionId: string): ConnectionAnswer | undefined {
    return this.pendingAnswers.get(sessionId);
  }
}