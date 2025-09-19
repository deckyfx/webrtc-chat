import React from 'react';
import { EnhancedWebRTCProvider, useEnhancedWebRTC } from './contexts/EnhancedWebRTCProvider';
import { EnhancedChatInterface } from './components/EnhancedChatInterface';
import { EnhancedJoinScreen } from './components/EnhancedJoinScreen';
import { EnhancedConnectionModal } from './components/EnhancedConnectionModal';

const AppContent: React.FC = () => {
  const { user, rooms } = useEnhancedWebRTC();

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

const EnhancedApp: React.FC = () => {
  return (
    <EnhancedWebRTCProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <AppContent />
      </div>
    </EnhancedWebRTCProvider>
  );
};

export default EnhancedApp;