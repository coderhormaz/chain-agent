import { Zap, Box, Image, Wallet } from 'lucide-react';

export const NAVIGATION_ITEMS = [
  { id: 'chat', label: 'AI Chat', icon: Zap },
  { id: 'tokens', label: 'Tokens', icon: Box },
  { id: 'nfts', label: 'NFTs', icon: Image },
  { id: 'wallet', label: 'Wallet', icon: Wallet },
] as const;

export type NavigationItemId = typeof NAVIGATION_ITEMS[number]['id'];
