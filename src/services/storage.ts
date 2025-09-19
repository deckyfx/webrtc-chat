/**
 * Storage Service for managing local persistence
 */

export interface UserProfile {
  userId: string;
  nickname: string;
  createdAt: number;
}

export interface ChatSession {
  sessionId: string;
  peerId: string;
  peerName: string;
  createdAt: number;
  lastActive: number;
}

export interface StoredMessage {
  sessionId: string;
  messages: Array<{
    id: string;
    text: string;
    senderId: string;
    senderName: string;
    timestamp: number;
  }>;
}

const STORAGE_KEYS = {
  USER_PROFILE: 'webrtc_chat_user',
  CHAT_SESSIONS: 'webrtc_chat_sessions',
  MESSAGES: 'webrtc_chat_messages',
} as const;

export class StorageService {
  /**
   * Get user profile from localStorage
   */
  public getUserProfile(): UserProfile | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Failed to get user profile:', error);
      return null;
    }
  }

  /**
   * Save user profile to localStorage
   */
  public saveUserProfile(profile: UserProfile): boolean {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Failed to save user profile:', error);
      return false;
    }
  }

  /**
   * Clear user profile
   */
  public clearUserProfile(): void {
    localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
  }

  /**
   * Get all chat sessions
   */
  public getChatSessions(): ChatSession[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CHAT_SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get chat sessions:', error);
      return [];
    }
  }

  /**
   * Get a specific chat session
   */
  public getChatSession(sessionId: string): ChatSession | null {
    const sessions = this.getChatSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  }

  /**
   * Save or update a chat session
   */
  public saveChatSession(session: ChatSession): boolean {
    try {
      const sessions = this.getChatSessions();
      const existingIndex = sessions.findIndex(s => s.sessionId === session.sessionId);

      if (existingIndex >= 0) {
        sessions[existingIndex] = session;
      } else {
        sessions.push(session);
      }

      // Keep only the last 50 sessions
      const sortedSessions = sessions.sort((a, b) => b.lastActive - a.lastActive);
      const trimmedSessions = sortedSessions.slice(0, 50);

      localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(trimmedSessions));
      return true;
    } catch (error) {
      console.error('Failed to save chat session:', error);
      return false;
    }
  }

  /**
   * Delete a chat session
   */
  public deleteChatSession(sessionId: string): boolean {
    try {
      const sessions = this.getChatSessions();
      const filtered = sessions.filter(s => s.sessionId !== sessionId);
      localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(filtered));

      // Also delete associated messages
      this.deleteMessages(sessionId);
      return true;
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      return false;
    }
  }

  /**
   * Get messages for a session
   */
  public getMessages(sessionId: string): StoredMessage['messages'] {
    try {
      const stored = localStorage.getItem(`${STORAGE_KEYS.MESSAGES}_${sessionId}`);
      if (stored) {
        const data: StoredMessage = JSON.parse(stored);
        return data.messages;
      }
      return [];
    } catch (error) {
      console.error('Failed to get messages:', error);
      return [];
    }
  }

  /**
   * Save messages for a session
   */
  public saveMessages(sessionId: string, messages: StoredMessage['messages']): boolean {
    try {
      const data: StoredMessage = {
        sessionId,
        messages: messages.slice(-1000), // Keep last 1000 messages
      };
      localStorage.setItem(`${STORAGE_KEYS.MESSAGES}_${sessionId}`, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Failed to save messages:', error);
      return false;
    }
  }

  /**
   * Add a single message to a session
   */
  public addMessage(
    sessionId: string,
    message: {
      id: string;
      text: string;
      senderId: string;
      senderName: string;
      timestamp: number;
    }
  ): boolean {
    const messages = this.getMessages(sessionId);
    messages.push(message);
    return this.saveMessages(sessionId, messages);
  }

  /**
   * Delete messages for a session
   */
  public deleteMessages(sessionId: string): void {
    localStorage.removeItem(`${STORAGE_KEYS.MESSAGES}_${sessionId}`);
  }

  /**
   * Clear all stored data
   */
  public clearAll(): void {
    // Clear user profile
    this.clearUserProfile();

    // Clear sessions
    localStorage.removeItem(STORAGE_KEYS.CHAT_SESSIONS);

    // Clear all messages
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEYS.MESSAGES)) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Export all data (for backup)
   */
  public exportData(): string {
    const data = {
      userProfile: this.getUserProfile(),
      sessions: this.getChatSessions(),
      messages: {} as Record<string, StoredMessage['messages']>,
    };

    // Get all messages
    data.sessions.forEach(session => {
      data.messages[session.sessionId] = this.getMessages(session.sessionId);
    });

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data (from backup)
   */
  public importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);

      // Restore user profile
      if (data.userProfile) {
        this.saveUserProfile(data.userProfile);
      }

      // Restore sessions
      if (data.sessions) {
        localStorage.setItem(STORAGE_KEYS.CHAT_SESSIONS, JSON.stringify(data.sessions));
      }

      // Restore messages
      if (data.messages) {
        Object.entries(data.messages).forEach(([sessionId, messages]) => {
          this.saveMessages(sessionId, messages as StoredMessage['messages']);
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to import data:', error);
      return false;
    }
  }
}