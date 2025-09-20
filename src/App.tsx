import React from 'react';
import { useTrysteroStore } from './stores/trysteroStore';
import { TrysteroChat } from './components/TrysteroChat';
import { EnhancedJoinScreen } from './components/EnhancedJoinScreen';

const AppContent: React.FC = () => {
  const user = useTrysteroStore(state => state.user);

  if (!user) {
    return <EnhancedJoinScreen />;
  }

  return <TrysteroChat />;
};

const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AppContent />
    </div>
  );
};

export default App;