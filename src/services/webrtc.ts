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
      if (connection.connectionState === 'connected') {
        this.onPeerConnected?.();
      } else if (['disconnected', 'failed', 'closed'].includes(connection.connectionState)) {
        this.disconnect();
      }
    };

    return peer;
  }

  private setupDataChannel(peer: Peer, dataChannel: RTCDataChannel) {
    peer.dataChannel = dataChannel;
    dataChannel.onmessage = (event) => {
      // Handle incoming messages (text or file)
      if (typeof event.data === 'string') {
        // Text message
        const message = JSON.parse(event.data);
        this.onMessage?.(message);
      } else if (event.data instanceof ArrayBuffer) {
        // File message (assuming single ArrayBuffer for simplicity)
        const fileData = event.data;
        // The first message for a file transfer should be metadata
        // For simplicity, we assume metadata is sent as a string message right before the ArrayBuffer
        // In a real app, you'd have a more robust protocol (e.g., message type field)
        // For now, we'll just assume the previous message was metadata.
        // This is a simplification and might not work perfectly if messages are interleaved.
        // A better approach would be to send metadata and data in a single structured message.

        // For this simple implementation, we'll assume the metadata is part of the ArrayBuffer
        // or that the message type is explicitly set.
        // Let's refine this: the message object itself will contain the file data.

        // Re-reading the WebRTC spec, data channels can send ArrayBuffer directly.
        // So, the message object should contain the metadata, and the ArrayBuffer is the actual data.
        // This means the message object itself needs to be sent as a string, and then the ArrayBuffer.
        // This requires a more complex protocol.

        // Let's simplify: the message object will contain the file metadata, and the file data itself
        // will be sent as a separate ArrayBuffer. The receiver will need to know which ArrayBuffer
        // belongs to which metadata message.

        // A common pattern is to send a JSON message with metadata, and then the binary data.
        // The JSON message would contain a unique ID that the binary data also references.

        // For this simple implementation, let's assume the entire file (metadata + data) is sent as a single JSON string
        // where the 'data' field of the file is a base64 encoded string of the ArrayBuffer.
        // This is inefficient for large files but simple to implement.

        // Let's go with the original plan: send metadata as JSON, then ArrayBuffer.
        // This means the `onmessage` needs to buffer.

        // This is getting too complex for a quick iteration. Let's simplify the protocol.
        // The `Message` object will contain `file.data` as `ArrayBuffer` when sending.
        // When receiving, `event.data` will be the `ArrayBuffer`.
        // The `onmessage` handler will receive the `ArrayBuffer`.
        // How to associate metadata? The `Message` object itself must be sent as JSON.
        // If `event.data` is `ArrayBuffer`, it's the file data. How to get metadata?

        // Let's use a simple protocol: all messages are JSON strings.
        // If it's a file, the JSON string contains metadata and the file data as a base64 string.
        // This is inefficient but simple.

        // Reverting to the original plan: `Message` interface has `file.data` as `ArrayBuffer`.
        // The `dataChannel.send` can take `ArrayBuffer` directly.
        // So, the `onmessage` handler will receive `ArrayBuffer` for files.
        // How to get metadata? The metadata must be sent *before* the ArrayBuffer.
        // This requires a stateful receiver.

        // Let's try a different approach: all messages are JSON strings.
        // If it's a file, the JSON string contains metadata and the file data as a base64 string.
        // This is the simplest for a quick implementation, despite inefficiency.

        const message: Message = JSON.parse(event.data);
        if (message.file && message.file.data) {
          // Received a file message with base64 data
          const arrayBuffer = this.base64ToArrayBuffer(message.file.data as any);
          const blob = new Blob([arrayBuffer], { type: message.file.type });
          message.file.url = URL.createObjectURL(blob);
          delete message.file.data; // Remove raw data from message history
        }
        this.onMessage?.(message);
      }
    };
  }

  public async createOffer(peerId: string): Promise<string> {
    const peer = await this.createPeerConnection(peerId);
    const dataChannel = peer.connection.createDataChannel("chat");
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
    if (!this.peer?.dataChannel || this.peer.dataChannel.readyState !== 'open') {
      console.error("Data channel not open.");
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
      this.peer.dataChannel.send(JSON.stringify(message));
      return message;
    } else if (messageContent.file) {
      const file = messageContent.file;
      const reader = new FileReader();

      return new Promise<Message | null>((resolve) => {
        reader.onload = (event) => {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const base64Data = this.arrayBufferToBase64(arrayBuffer);

          const message: Message = {
            ...baseMessage,
            file: {
              name: file.name,
              type: file.type,
              size: file.size,
              data: base64Data as any, // Send as base64 string
            },
          };
          this.peer!.dataChannel!.send(JSON.stringify(message));
          resolve(message);
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
      binary += String.fromCharCode(bytes[i]);
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
