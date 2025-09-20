import { generateUUID } from "../lib/uuid";

export interface Message {
  id: string;
  text?: string; // Make text optional
  senderId: string;
  senderName: string;
  timestamp: number;
  file?: {
    name: string;
    type: string;
    size: number;
    data?: ArrayBuffer; // For sending
    url?: string; // For receiving and displaying
  };
}

export interface Peer {
  id: string;
  connection: RTCPeerConnection;
  dataChannel?: RTCDataChannel;
  name?: string;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

interface SignalingPayload {
  sdp: RTCSessionDescriptionInit;
  candidates: RTCIceCandidateInit[];
}

export class WebRTCManager {
  public peer: Peer | null = null;
  private localUserId: string;
  private localUserName: string;

  public onMessage: ((message: Message) => void) | null = null;
  public onPeerConnected: (() => void) | null = null;
  public onPeerDisconnected: (() => void) | null = null;

  constructor(userId: string, userName: string) {
    this.localUserId = userId;
    this.localUserName = userName;
  }

  private async createPeerConnection(peerId: string): Promise<Peer> {
    const connection = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const peer: Peer = { id: peerId, connection };
    this.peer = peer;

    const candidates: RTCIceCandidate[] = [];
    let candidatePromise = new Promise<void>(resolve => {
        connection.onicecandidate = (event) => {
            if (event.candidate) {
                candidates.push(event.candidate);
            } else {
                resolve();
            }
        };
    });

    // @ts-ignore
    connection.gatheredCandidates = candidatePromise;
    // @ts-ignore
    connection.getCandidates = () => candidates;

    connection.onconnectionstatechange = () => {
      console.log('Connection state changed to:', connection.connectionState);
      if (connection.connectionState === 'connected') {
        console.log('Peer connection established successfully');
        // Don't call onPeerConnected here - wait for data channel to open
      } else if (['disconnected', 'failed', 'closed'].includes(connection.connectionState)) {
        this.disconnect();
      }
    };

    connection.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', connection.iceConnectionState);
    };

    return peer;
  }

  private setupDataChannel(peer: Peer, dataChannel: RTCDataChannel) {
    peer.dataChannel = dataChannel;
    console.log('Setting up data channel. Peer ID:', peer.id, 'Channel label:', dataChannel.label);

    // Important: Handle data channel opening
    dataChannel.onopen = () => {
      console.log('Data channel opened, state:', dataChannel.readyState);
      console.log('Data channel label:', dataChannel.label);
      console.log('Current peer after channel open:', this.peer?.id, 'Has datachannel:', !!this.peer?.dataChannel);
      this.onPeerConnected?.();
    };

    dataChannel.onclose = () => {
      console.log('Data channel closed');
      this.onPeerDisconnected?.();
    };

    dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };

    // Set up message handler
    console.log('Setting up onmessage handler for data channel');
    dataChannel.onmessage = (event) => {
      // Handle incoming messages - all messages are JSON strings
      console.log("Received data channel message:", event.data);
      if (typeof event.data === 'string') {
        try {
          const message = JSON.parse(event.data);
          console.log("Parsed message:", message);

          // If it's a file message with base64 data, convert it
          if (message.file && message.file.data) {
            const arrayBuffer = this.base64ToArrayBuffer(message.file.data as any);
            const blob = new Blob([arrayBuffer], { type: message.file.type });
            message.file.url = URL.createObjectURL(blob);
            delete message.file.data; // Remove raw data from message history
          }

          this.onMessage?.(message);
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      }
    };
  }

  public async createOffer(peerId: string): Promise<string> {
    const peer = await this.createPeerConnection(peerId);
    const dataChannel = peer.connection.createDataChannel("chat");
    console.log("OFFERER: Created data channel 'chat'");
    this.setupDataChannel(peer, dataChannel);

    const offer = await peer.connection.createOffer();
    await peer.connection.setLocalDescription(offer);

    // @ts-ignore
    await peer.connection.gatheredCandidates;

    const payload: SignalingPayload = {
        sdp: peer.connection.localDescription!,
        // @ts-ignore
        candidates: peer.connection.getCandidates().map(c => c.toJSON()),
    };

    return btoa(JSON.stringify(payload));
  }

  public async handleInvite(inviteCode: string, peerId: string): Promise<string> {
    const invitePayload: SignalingPayload = JSON.parse(atob(inviteCode));

    const peer = await this.createPeerConnection(peerId);
    peer.connection.ondatachannel = (event) => {
        console.log("ANSWERER: Received data channel from remote peer, label:", event.channel.label);
        this.setupDataChannel(peer, event.channel);
    };

    await peer.connection.setRemoteDescription(new RTCSessionDescription(invitePayload.sdp));
    for (const candidate of invitePayload.candidates) {
        await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }

    const answer = await peer.connection.createAnswer();
    await peer.connection.setLocalDescription(answer);

    // @ts-ignore
    await peer.connection.gatheredCandidates;

    const answerPayload: SignalingPayload = {
        sdp: peer.connection.localDescription!,
        // @ts-ignore
        candidates: peer.connection.getCandidates().map(c => c.toJSON()),
    };

    return btoa(JSON.stringify(answerPayload));
  }

  public async handleAnswer(answerCode: string) {
    const answerPayload: SignalingPayload = JSON.parse(atob(answerCode));
    if (this.peer) {
      await this.peer.connection.setRemoteDescription(new RTCSessionDescription(answerPayload.sdp));
      for (const candidate of answerPayload.candidates) {
        await this.peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    }
  }

  public async send(messageContent: { text?: string; file?: File }): Promise<Message | null> {
    console.log("Attempting to send. Peer exists:", !!this.peer,
                "DataChannel exists:", !!this.peer?.dataChannel,
                "DataChannel state:", this.peer?.dataChannel?.readyState);

    if (!this.peer?.dataChannel || this.peer.dataChannel.readyState !== 'open') {
      console.error("Data channel not open. State:", this.peer?.dataChannel?.readyState);
      return null;
    }

    const baseMessage: Omit<Message, 'text' | 'file'> = {
      id: generateUUID(),
      senderId: this.localUserId,
      senderName: this.localUserName,
      timestamp: Date.now(),
    };

    if (messageContent.text) {
      const message: Message = { ...baseMessage, text: messageContent.text };
      const messageStr = JSON.stringify(message);
      console.log("Sending message:", messageStr);
      console.log("Sending on channel label:", this.peer.dataChannel.label,
                  "Channel ID:", this.peer.dataChannel.id);
      try {
        this.peer.dataChannel.send(messageStr);
        console.log("Message sent successfully");
      } catch (error) {
        console.error("Error sending message:", error);
      }
      return message;
    } else if (messageContent.file) {
      const file = messageContent.file;
      const reader = new FileReader();

      return new Promise<Message | null>((resolve) => {
        reader.onload = (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const base64Data = this.arrayBufferToBase64(arrayBuffer);

          // Create blob URL for sender's display
          const blob = new Blob([arrayBuffer], { type: file.type });
          const url = URL.createObjectURL(blob);

          // Message to send (with base64 data for transmission)
          const messageToSend = {
            ...baseMessage,
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64Data as any, // Send as base64 string
            },
          };

          // Message to return (with URL for local display, no data)
          const messageToReturn: Message = {
            ...baseMessage,
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              url: url, // URL for displaying locally
            },
          };

          this.peer!.dataChannel!.send(JSON.stringify(messageToSend));
          resolve(messageToReturn);
        };
        reader.onerror = () => {
          console.error("Error reading file.");
          resolve(null);
        };
        reader.readAsArrayBuffer(file);
      });
    }
    return null;
  }

  public disconnect() {
    if (this.peer) {
      this.peer.connection.close();
      this.peer = null;
      this.onPeerDisconnected?.();
    }
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary_string = atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
