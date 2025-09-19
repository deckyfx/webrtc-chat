import { generateUUID } from "../lib/uuid";

export interface Message {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  timestamp: number;
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
      const message = JSON.parse(event.data);
      this.onMessage?.(message);
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

  public sendMessage(text: string): Message | null {
    if (this.peer?.dataChannel?.readyState === 'open') {
      const message: Message = {
        id: generateUUID(),
        text,
        senderId: this.localUserId,
        senderName: this.localUserName,
        timestamp: Date.now(),
      };
      this.peer.dataChannel.send(JSON.stringify(message));
      return message;
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
}