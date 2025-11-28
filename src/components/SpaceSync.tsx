import { useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { spacesHistory } from '@/stores/spaces.store';

export function SpaceSync() {
  const { spaces } = useSnapshot(spacesHistory);
  
  useEffect(() => {
    // Send spaces to main process for remote server
    // Only send necessary data to minimize IPC traffic
    const payload = spaces.map(s => ({
      id: s.id,
      name: s.name,
      primaryColor: s.primaryColor,
      secondaryColor: s.secondaryColor,
      icon: s.icon,
      lastActiveAt: s.lastActiveAt,
      connectedRepo: s.connectedRepo,
    }));
    
    window.electron.send('spaces:update', payload);
  }, [spaces]);
  
  return null;
}
