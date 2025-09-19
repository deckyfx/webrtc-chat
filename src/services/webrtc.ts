/**
 * WebRTC Service for managing peer-to-peer connections
 */

import { generateUUID } from "../lib/uuid";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
}

export interface PeerConnection {
  peerId: string;
  peerName: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  messages: Message[];
  isConnected: boolean;
  isInitiator: boolean;
}

type ConnectionCallback = (peerId: string, peerName: string) => void;
type MessageCallback = (peerId: string, message: Message) => void;
type ConnectionRequestCallback = (peerId: string, peerName: string) => Promise<boolean>;

export class WebRTCService {
  private peerConnections: Map<string, PeerConnection> = new Map();
  private localUserId: string;
  private localUserName: string;

  // Callbacks
  private onConnectionStateChange?: ConnectionCallback;
  private onMessage?: MessageCallback;
  private onConnectionRequest?: ConnectionRequestCallback;

  // STUN servers for NAT traversal
  private readonly iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  constructor(userId: string, userName: string) {
    this.localUserId = userId;
    this.localUserName = userName;
  }

  /**
   * Set callback handlers
   */
  public setHandlers(handlers: {
    onConnectionStateChange?: ConnectionCallback;
    onMessage?: MessageCallback;
    onConnectionRequest?: ConnectionRequestCallback;
  }) {
    if (handlers.onConnectionStateChange) {
      this.onConnectionStateChange = handlers.onConnectionStateChange;
    }
    if (handlers.onMessage) {
      this.onMessage = handlers.onMessage;
    }
    if (handlers.onConnectionRequest) {
      this.onConnectionRequest = handlers.onConnectionRequest;
    }
  }

  /**
   * Create a new peer connection
   */
  private async createPeerConnection(peerId: string, peerName: string, isInitiator: boolean): Promise<PeerConnection> {
    const connection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    const peer: PeerConnection = {
      peerId,
      peerName,
      connection,
      messages: [],
      isConnected: false,
      isInitiator,
    };

    // Set up data channel
    if (isInitiator) {
      const dataChannel = connection.createDataChannel('chat', {
        ordered: true,
      });
      peer.dataChannel = dataChannel;
      this.setupDataChannel(peer, dataChannel);
    } else {
      connection.ondatachannel = (event) => {
        peer.dataChannel = event.channel;
        this.setupDataChannel(peer, event.channel);
      };
    }

    // Handle connection state changes
    connection.onconnectionstatechange = () => {
      const state = connection.connectionState;
      if (state === 'connected') {
        peer.isConnected = true;
        this.onConnectionStateChange?.(peerId, peerName);
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        peer.isConnected = false;
        this.onConnectionStateChange?.(peerId, peerName);
      }
    };

    this.peerConnections.set(peerId, peer);
    return peer;
  }

  /**
   * Set up data channel event handlers
   */
  private setupDataChannel(peer: PeerConnection, channel: RTCDataChannel) {
    channel.onopen = () => {
      console.log(`Data channel opened with ${peer.peerId}`);
      peer.isConnected = true;
      this.onConnectionStateChange?.(peer.peerId, peer.peerName);
    };

    channel.onclose = () => {
      console.log(`Data channel closed with ${peer.peerId}`);
      peer.isConnected = false;
      this.onConnectionStateChange?.(peer.peerId, peer.peerName);
    };

    channel.onmessage = (event) => {
      try {
        const message: Message = JSON.parse(event.data);
        peer.messages.push(message);
        this.onMessage?.(peer.peerId, message);
      } catch (error) {
        console.error('Failed to parse message:', error);
      }
    };

    channel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  /**
   * Initiate a connection with a peer
   */
  public async initiateConnection(peerId: string, peerName: string): Promise<RTCSessionDescriptionInit> {
    const peer = await this.createPeerConnection(peerId, peerName, true);

    // Create offer
    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);

    // Collect ICE candidates
    await this.waitForIceCandidates(peer.connection);

    return peer.connection.localDescription!;
  }

  /**
   * Handle incoming connection request
   */
  public async handleConnectionOffer(
    peerId: string,
    peerName: string,
    offer: RTCSessionDescriptionInit
  ): Promise<RTCSessionDescriptionInit | null> {
    // Auto-accept all connections since we're using shareable codes
    const peer = await this.createPeerConnection(peerId, peerName, false);

    // Set remote description and create answer
    await peer.connection.setRemoteDescription(offer);
    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    // Collect ICE candidates
    await this.waitForIceCandidates(peer.connection);

    return peer.connection.localDescription!;
  }

  /**
   * Handle connection answer from peer
   */
  public async handleConnectionAnswer(peerId: string, answer: RTCSessionDescriptionInit) {
    const peer = this.peerConnections.get(peerId);
    if (!peer) {
      console.error(`No peer connection found for ${peerId}`);
      return;
    }

    await peer.connection.setRemoteDescription(answer);
  }

  /**
   * Wait for ICE candidates to be gathered
   */
  private waitForIceCandidates(connection: RTCPeerConnection): Promise<void> {
    return new Promise((resolve) => {
      // Wait for ICE gathering to complete
      if (connection.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (connection.iceGatheringState === 'complete') {
            connection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        connection.addEventListener('icegatheringstatechange', checkState);

        // Timeout after 5 seconds
        setTimeout(() => {
          connection.removeEventListener('icegatheringstatechange', checkState);
          resolve();
        }, 5000);
      }
    });
  }

  /**
   * Send a message to a peer
   */
  public sendMessage(peerId: string, text: string): boolean {
    const peer = this.peerConnections.get(peerId);
    if (!peer || !peer.dataChannel || peer.dataChannel.readyState !== 'open') {
      console.error(`Cannot send message to ${peerId}: channel not ready`);
      return false;
    }

    const message: Message = {
      id: generateUUID(),
      text,
      senderId: this.localUserId,
      senderName: this.localUserName,
      timestamp: Date.now(),
    };

    try {
      peer.dataChannel.send(JSON.stringify(message));
      peer.messages.push(message);
      return true;
    } catch (error) {
      console.error('Failed to send message:', error);
      return false;
    }
  }

  /**
   * Get messages for a peer
   */
  public getMessages(peerId: string): Message[] {
    return this.peerConnections.get(peerId)?.messages || [];
  }

  /**
   * Get all peer connections
   */
  public getPeers(): Array<{ peerId: string; peerName: string; isConnected: boolean }> {
    return Array.from(this.peerConnections.values()).map((peer) => ({
      peerId: peer.peerId,
      peerName: peer.peerName,
      isConnected: peer.isConnected,
    }));
  }

  /**
   * Close a peer connection
   */
  public closePeerConnection(peerId: string) {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      peer.dataChannel?.close();
      peer.connection.close();
      this.peerConnections.delete(peerId);
    }
  }

  /**
   * Close all connections
   */
  public closeAllConnections() {
    this.peerConnections.forEach((peer) => {
      peer.dataChannel?.close();
      peer.connection.close();
    });
    this.peerConnections.clear();
  }
}