import React from 'react';
import { WebRTCProvider, useWebRTC, ConnectionState } from './contexts/WebRTCProvider';
import JoinScreen from './components/JoinScreen';
import ChatScreen from './components/ChatScreen';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { ConnectionModal } from './components/ConnectionModal';

const AppContent: React.FC = () => {
  const { connectionState } = useWebRTC();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl h-[700px] flex flex-col">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-bold">P2P Chat (Serverless)</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow">
          {connectionState === ConnectionState.CONNECTED ? <ChatScreen /> : <JoinScreen />}
        </CardContent>
      </Card>
      <ConnectionModal />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <WebRTCProvider>
      <AppContent />
    </WebRTCProvider>
  );
};

export default App;