import React, { useState } from 'react';
import NavigationRail from './NavigationRail';
import BottomNav from './BottomNav';
import AIChat from './AIChat';
import Wallet from './Wallet';
import Tokens from './Tokens';
import NFTs from './NFTs';
import '../../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chat');

  const renderContent = () => {
    switch (activeTab) {
      case 'chat':
        return <AIChat />;
      case 'wallet':
        return <Wallet />;
      case 'tokens':
        return <Tokens />;
      case 'nfts':
        return <NFTs />;
      default:
        return <AIChat />;
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#0F172A]">
      {/* Desktop Navigation Rail */}
      <NavigationRail activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {/* Main Content Area */}
      <main className="md:ml-[80px] pb-[72px] md:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          {renderContent()}
        </div>
      </main>
      
      {/* Mobile Bottom Navigation */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default Dashboard;
