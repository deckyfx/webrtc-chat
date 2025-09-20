import React from 'react';
import { useWebRTCStore } from './stores/webrtcStore';
import { WebRTCInitializer } from './providers/WebRTCInitializer';
import { EnhancedChatInterface } from './components/EnhancedChatInterface';
import { EnhancedJoinScreen } from './components/EnhancedJoinScreen';
import { EnhancedConnectionModal } from './components/EnhancedConnectionModal';

const AppContent: React.FC = () => {
  const user = useWebRTCStore(state => state.user);

  if (!user) {
    return <EnhancedJoinScreen />;
  }

  return (
    <>
      <EnhancedChatInterface />
      <EnhancedConnectionModal />
    </>
  );
};

const App: React.FC = () => {
  return (
    <WebRTCInitializer>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppContent />
      </div>
    </WebRTCInitializer>
  );
};

export default App;