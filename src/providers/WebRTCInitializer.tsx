import React, { useEffect } from 'react';
import { useWebRTCStore } from '../stores/webrtcStore';

interface WebRTCInitializerProps {
  children: React.ReactNode;
}

/**
 * WebRTCInitializer component handles the initialization of WebRTC manager
 * when the user is loaded from localStorage. This replaces the Context Provider
 * pattern with a lightweight initializer.
 */
export const WebRTCInitializer: React.FC<WebRTCInitializerProps> = ({ children }) => {
  const user = useWebRTCStore(state => state.user);
  const webrtcManager = useWebRTCStore(state => state.webrtcManager);
  const initializeWebRTC = useWebRTCStore(state => state.initializeWebRTC);

  // Initialize WebRTC manager when user is loaded but manager doesn't exist
  useEffect(() => {
    if (user && !webrtcManager) {
      initializeWebRTC(user.id, user.name);
    }
  }, [user, webrtcManager, initializeWebRTC]);

  return <>{children}</>;
};