import React, { useState, useEffect, useCallback } from "react";
import "./index.css";

// Services
import { WebRTCService, Message } from "@/services/webrtc";
import { ServerlessSignalingService, ConnectionOffer, ConnectionAnswer } from "@/services/serverless-signaling";
import { StorageService, UserProfile } from "@/services/storage";
import { generateUUID } from "./lib/uuid";

// Components
import { NicknameSetup } from "@/components/NicknameSetup";
import { ChatInterface, ChatTab } from "@/components/ChatInterface";
import { Button } from "@/components/ui/button";

export function App() {
  // Services
  const [storageService] = useState(() => new StorageService());
  const [webrtcService, setWebrtcService] = useState<WebRTCService | null>(null);
  const [signalingService, setSignalingService] = useState<ServerlessSignalingService | null>(null);

  // User state
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Chat state
  const [tabs, setTabs] = useState<ChatTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>("");

  // Initialize user profile from storage
  useEffect(() => {
    const profile = storageService.getUserProfile();
    if (profile) {
      setUserProfile(profile);
    }
  }, [storageService]);

  // Initialize services when user profile is set
  useEffect(() => {
    if (!userProfile) return;

    // Initialize WebRTC service
    const rtc = new WebRTCService(userProfile.userId, userProfile.nickname);
    rtc.setHandlers({
      onConnectionStateChange: handleConnectionStateChange,
      onMessage: handleIncomingMessage,
      // No need for connection request handler - auto-accept all connections
    });
    setWebrtcService(rtc);

    // Initialize serverless signaling service
    const signaling = new ServerlessSignalingService(userProfile.userId, userProfile.nickname);
    signaling.setHandlers({
      onConnectionOffer: handleConnectionOffer,
      onConnectionAnswer: handleConnectionAnswer,
    });
    setSignalingService(signaling);

    // Load previous sessions from storage or create a new room
    const sessions = storageService.getChatSessions();
    if (sessions.length > 0) {
      // Load existing sessions
      const loadedTabs: ChatTab[] = sessions.map(session => {
        const messages = storageService.getMessages(session.sessionId);
        return {
          id: session.sessionId,
          name: session.peerName,
          type: 'private',
          isConnected: false,
          messages,
          unreadCount: 0,
        };
      });
      setTabs(loadedTabs);
      setActiveTabId(loadedTabs[0].id);
    } else {
      // Create a new room automatically
      createNewRoom();
    }

    // Clean up old pending connections periodically
    const cleanupInterval = setInterval(() => {
      signaling.cleanup();
    }, 60000); // Every minute

    return () => {
      clearInterval(cleanupInterval);
      rtc.closeAllConnections();
    };
  }, [userProfile, storageService]);

  const handleNicknameComplete = (nickname: string) => {
    const profile: UserProfile = {
      userId: generateUUID(),
      nickname,
      createdAt: Date.now(),
    };
    storageService.saveUserProfile(profile);
    setUserProfile(profile);
  };

  const createNewRoom = () => {
    if (!signalingService) return;

    // Generate a unique room ID
    const roomId = generateUUID().split('-')[0].toUpperCase(); // Short 8-char ID
    const roomName = `Room-${roomId}`;

    // Create system message with room info
    const systemMessage: Message = {
      id: generateUUID(),
      text: `Welcome to ${roomName}!\n📋 Room ID: ${roomId}\nShare this ID with others so they can join using /join ${roomId}\n\n💡 To start chatting:\n1. Use /connect to get your connection code\n2. Share the code with others\n3. Others use /paste <code> to connect\n\nType /help for more commands!`,
      senderId: 'system',
      senderName: 'System',
      timestamp: Date.now(),
    };

    // Create new tab
    const newTab: ChatTab = {
      id: roomId,
      name: roomName,
      type: 'channel',
      isConnected: true,
      messages: [systemMessage],
      unreadCount: 0,
    };

    setTabs(prev => [...prev, newTab]);
    setActiveTabId(roomId);

    // Save to storage
    storageService.saveChatSession({
      sessionId: roomId,
      peerId: roomId,
      peerName: roomName,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    storageService.saveMessages(roomId, [systemMessage]);
  };

  const handleConnectionStateChange = useCallback((peerId: string, peerName: string) => {
    setTabs(prev => prev.map(tab =>
      tab.id === peerId
        ? {
            ...tab,
            name: peerName || tab.name,
            isConnected: webrtcService?.getPeers().find(p => p.peerId === peerId)?.isConnected || false
          }
        : tab
    ));
  }, [webrtcService]);

  const handleIncomingMessage = useCallback((peerId: string, message: Message) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === peerId) {
        const updatedTab = {
          ...tab,
          messages: [...tab.messages, message],
          unreadCount: tab.id !== activeTabId ? tab.unreadCount + 1 : 0,
        };

        // Save message to storage
        storageService.addMessage(peerId, message);

        return updatedTab;
      }
      return tab;
    }));
  }, [activeTabId, storageService]);

  const handleConnectionOffer = useCallback(async (offer: ConnectionOffer) => {
    if (!webrtcService || !signalingService) return;

    // Create answer
    const answer = await webrtcService.handleConnectionOffer(
      offer.from.userId,
      offer.from.nickname,
      offer.offer
    );

    if (answer) {
      // Generate answer code for user to share
      const answerCode = signalingService.createAnswerString(offer.sessionId, answer);

      // Add tab for this peer if it doesn't exist
      if (!tabs.find(t => t.id === offer.from.userId)) {
        const newTab: ChatTab = {
          id: offer.from.userId,
          name: offer.from.nickname,
          type: 'private',
          isConnected: false,
          messages: [],
          unreadCount: 0,
        };
        setTabs(prev => [...prev, newTab]);

        // Save session
        storageService.saveChatSession({
          sessionId: offer.sessionId,
          peerId: offer.from.userId,
          peerName: offer.from.nickname,
          createdAt: Date.now(),
          lastActive: Date.now(),
        });
      }

      // Add system message showing connection is being established
      const systemMessage: Message = {
        id: generateUUID(),
        text: `🔗 Connection from ${offer.from.nickname}!\n✅ Auto-accepting connection...\nYour answer code:\n${answerCode}\n\n💡 Share this code with ${offer.from.nickname} to complete the connection!`,
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      };

      setTabs(prev => prev.map(tab =>
        tab.id === offer.from.userId
          ? { ...tab, messages: [...tab.messages, systemMessage] }
          : tab
      ));
    }
  }, [webrtcService, signalingService, tabs, storageService]);

  const handleConnectionAnswer = useCallback(async (answer: ConnectionAnswer) => {
    if (!webrtcService) return;

    // Complete the connection
    await webrtcService.handleConnectionAnswer(answer.from.userId, answer.answer);

    // Update tab name with peer's nickname
    setTabs(prev => prev.map(tab =>
      tab.id === answer.from.userId
        ? { ...tab, name: answer.from.nickname }
        : tab
    ));
  }, [webrtcService]);

  const handleSendMessage = useCallback(async (tabId: string, text: string) => {
    // Check for commands
    const trimmedText = text.trim();

    if (trimmedText.startsWith('/')) {
      const [command, ...args] = trimmedText.slice(1).split(' ');
      const arg = args.join(' ').trim();

      switch (command.toLowerCase()) {
        case 'roomid':
          // Show room ID
          const roomMessage: Message = {
            id: generateUUID(),
            text: `📋 Room ID: ${tabId}\nShare this ID with others so they can join using /join ${tabId}`,
            senderId: 'system',
            senderName: 'System',
            timestamp: Date.now(),
          };

          setTabs(prev => prev.map(tab =>
            tab.id === tabId
              ? { ...tab, messages: [...tab.messages, roomMessage] }
              : tab
          ));
          break;

        case 'join':
          if (arg) {
            handleJoinRoom(arg, tabId);
          } else {
            const errorMessage: Message = {
              id: generateUUID(),
              text: '❌ Usage: /join <room-id>',
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            };

            setTabs(prev => prev.map(tab =>
              tab.id === tabId
                ? { ...tab, messages: [...tab.messages, errorMessage] }
                : tab
            ));
          }
          break;

        case 'help':
          const helpMessage: Message = {
            id: generateUUID(),
            text: '📚 Available Commands:\n/roomid - Show current room ID\n/join <room-id> - Join a room\n/new - Create a new room\n/connect - Generate connection code to invite others\n/paste <code> - Connect using someone\'s connection code\n/help - Show this help\n\n💡 To chat with others:\n1. Use /connect to get your connection code\n2. Share the code with others\n3. Others use /paste <your-code> to connect\n\n🏠 Room vs P2P Chat:\n• Rooms are local tabs for organizing\n• To actually send messages, you need P2P connections\n• Use /connect and /paste to establish connections',
            senderId: 'system',
            senderName: 'System',
            timestamp: Date.now(),
          };

          setTabs(prev => prev.map(tab =>
            tab.id === tabId
              ? { ...tab, messages: [...tab.messages, helpMessage] }
              : tab
          ));
          break;

        case 'new':
          createNewRoom();
          break;

        case 'connect':
          await handleGenerateConnectionCode(tabId);
          break;

        case 'paste':
          if (arg) {
            await handlePasteConnectionCode(arg, tabId);
          } else {
            const errorMessage: Message = {
              id: generateUUID(),
              text: '❌ Usage: /paste <connection-code>\nPaste the entire connection code from your peer.',
              senderId: 'system',
              senderName: 'System',
              timestamp: Date.now(),
            };

            setTabs(prev => prev.map(tab =>
              tab.id === tabId
                ? { ...tab, messages: [...tab.messages, errorMessage] }
                : tab
            ));
          }
          break;

        default:
          const unknownMessage: Message = {
            id: generateUUID(),
            text: `❌ Unknown command: ${command}. Type /help for available commands.`,
            senderId: 'system',
            senderName: 'System',
            timestamp: Date.now(),
          };

          setTabs(prev => prev.map(tab =>
            tab.id === tabId
              ? { ...tab, messages: [...tab.messages, unknownMessage] }
              : tab
          ));
      }
      return;
    }

    // Normal message - send via WebRTC
    if (!webrtcService) return;

    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    // For now, just add the message locally since we need peer connection
    const message: Message = {
      id: generateUUID(),
      text: trimmedText,
      senderId: userProfile!.userId,
      senderName: userProfile!.nickname,
      timestamp: Date.now(),
    };

    setTabs(prev => prev.map(t =>
      t.id === tabId
        ? { ...t, messages: [...t.messages, message] }
        : t
    ));

    // Save message to storage
    storageService.addMessage(tabId, message);

    // Try to send via WebRTC if connected
    webrtcService.sendMessage(tabId, trimmedText);
  }, [webrtcService, userProfile, tabs, storageService]);

  const handleJoinRoom = useCallback(async (roomId: string, currentTabId: string) => {
    if (!signalingService || !webrtcService) return;

    const normalizedRoomId = roomId.toUpperCase().trim();

    // Check if already in this room
    if (tabs.find(t => t.id === normalizedRoomId)) {
      // Just switch to existing room tab and show message in current tab
      const alreadyInMessage: Message = {
        id: generateUUID(),
        text: `ℹ️ You're already in ${normalizedRoomId}. Switching to that tab...`,
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      };

      setTabs(prev => prev.map(tab =>
        tab.id === currentTabId
          ? { ...tab, messages: [...tab.messages, alreadyInMessage] }
          : tab
      ));

      setActiveTabId(normalizedRoomId);
      return;
    }

    // Create new tab for the room
    const roomName = `Room-${normalizedRoomId}`;

    const systemMessage: Message = {
      id: generateUUID(),
      text: `Joined ${roomName}!\n📋 Room ID: ${normalizedRoomId}\n\n💡 To start chatting:\n1. Use /connect to get your connection code\n2. Share the code with others in this room\n3. Others use /paste <code> to connect\n\nType /help for more commands!`,
      senderId: 'system',
      senderName: 'System',
      timestamp: Date.now(),
    };

    const newTab: ChatTab = {
      id: normalizedRoomId,
      name: roomName,
      type: 'channel',
      isConnected: true,
      messages: [systemMessage],
      unreadCount: 0,
    };

    // Add success message to current tab
    const joinMessage: Message = {
      id: generateUUID(),
      text: `✅ Joined ${roomName} in a new tab!`,
      senderId: 'system',
      senderName: 'System',
      timestamp: Date.now(),
    };

    setTabs(prev => [
      ...prev.map(tab =>
        tab.id === currentTabId
          ? { ...tab, messages: [...tab.messages, joinMessage] }
          : tab
      ),
      newTab
    ]);
    setActiveTabId(normalizedRoomId);

    // Save to storage
    storageService.saveChatSession({
      sessionId: normalizedRoomId,
      peerId: normalizedRoomId,
      peerName: roomName,
      createdAt: Date.now(),
      lastActive: Date.now(),
    });
    storageService.saveMessages(normalizedRoomId, [systemMessage]);
  }, [signalingService, webrtcService, tabs, storageService]);

  const handleGenerateConnectionCode = useCallback(async (tabId: string) => {
    if (!webrtcService || !signalingService) return;

    try {
      // Generate a session ID for this connection attempt
      const sessionId = generateUUID();

      // Create WebRTC offer - we'll be the initiator waiting for someone to connect to us
      // Use sessionId as the temporary peer ID until we know who connects
      const offer = await webrtcService.initiateConnection(sessionId, 'Waiting for peer...');

      // Create connection code
      const connectionCode = signalingService.createOfferString(sessionId, offer);

      const connectMessage: Message = {
        id: generateUUID(),
        text: `🔗 Your Connection Code:\n\n${connectionCode}\n\n📋 Share this code with others so they can connect to you!\n\n💡 Others should paste this entire code to connect.`,
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      };

      setTabs(prev => prev.map(tab =>
        tab.id === tabId
          ? { ...tab, messages: [...tab.messages, connectMessage] }
          : tab
      ));

    } catch (error) {
      console.error('Failed to generate connection code:', error);

      const errorMessage: Message = {
        id: generateUUID(),
        text: '❌ Failed to generate connection code. Please try again.',
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      };

      setTabs(prev => prev.map(tab =>
        tab.id === tabId
          ? { ...tab, messages: [...tab.messages, errorMessage] }
          : tab
      ));
    }
  }, [webrtcService, signalingService]);

  const handlePasteConnectionCode = useCallback(async (connectionCode: string, currentTabId: string) => {
    if (!signalingService) return;

    try {
      // Process the connection code
      const success = signalingService.processConnectionString(connectionCode);

      if (success) {
        const successMessage: Message = {
          id: generateUUID(),
          text: '✅ Connection code processed successfully! Waiting for peer connection...',
          senderId: 'system',
          senderName: 'System',
          timestamp: Date.now(),
        };

        setTabs(prev => prev.map(tab =>
          tab.id === currentTabId
            ? { ...tab, messages: [...tab.messages, successMessage] }
            : tab
        ));
      } else {
        const errorMessage: Message = {
          id: generateUUID(),
          text: '❌ Invalid connection code format. Please check and try again.',
          senderId: 'system',
          senderName: 'System',
          timestamp: Date.now(),
        };

        setTabs(prev => prev.map(tab =>
          tab.id === currentTabId
            ? { ...tab, messages: [...tab.messages, errorMessage] }
            : tab
        ));
      }
    } catch (error) {
      console.error('Failed to process connection code:', error);

      const errorMessage: Message = {
        id: generateUUID(),
        text: '❌ Failed to process connection code. Please check the format and try again.',
        senderId: 'system',
        senderName: 'System',
        timestamp: Date.now(),
      };

      setTabs(prev => prev.map(tab =>
        tab.id === currentTabId
          ? { ...tab, messages: [...tab.messages, errorMessage] }
          : tab
      ));
    }
  }, [signalingService]);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTabId(tabId);

    // Clear unread count
    setTabs(prev => prev.map(tab =>
      tab.id === tabId
        ? { ...tab, unreadCount: 0 }
        : tab
    ));
  }, []);

  const handleCloseTab = useCallback((tabId: string) => {
    // Close peer connection
    webrtcService?.closePeerConnection(tabId);

    // Remove tab
    setTabs(prev => prev.filter(t => t.id !== tabId));

    // Switch to another tab if this was active
    if (activeTabId === tabId) {
      const remainingTabs = tabs.filter(t => t.id !== tabId);
      if (remainingTabs.length > 0) {
        setActiveTabId(remainingTabs[0].id);
      } else {
        // Create new room if no tabs left
        createNewRoom();
      }
    }

    // Remove from storage
    storageService.deleteChatSession(tabId);
  }, [webrtcService, tabs, activeTabId, storageService]);

  if (!userProfile) {
    return <NicknameSetup onComplete={handleNicknameComplete} />;
  }

  return (
    <ChatInterface
      userId={userProfile.userId}
      nickname={userProfile.nickname}
      tabs={tabs}
      activeTabId={activeTabId}
      onSendMessage={handleSendMessage}
      onTabChange={handleTabChange}
      onCloseTab={handleCloseTab}
      onCreateChannel={createNewRoom}
      onJoinChannel={() => {}} // Handled via commands now
    />
  );
}

export default App;