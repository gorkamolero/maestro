import { createContext, useContext, useState, ReactNode } from 'react';
import { TabDropZone } from '@/types';

interface DragContextType {
  targetZone: TabDropZone | null;
  setTargetZone: (zone: TabDropZone | null) => void;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export function DragProvider({ children }: { children: ReactNode }) {
  const [targetZone, setTargetZone] = useState<TabDropZone | null>(null);

  return (
    <DragContext.Provider value={{ targetZone, setTargetZone }}>
      {children}
    </DragContext.Provider>
  );
}

export function useDragContext() {
  const context = useContext(DragContext);
  if (!context) {
    throw new Error('useDragContext must be used within DragProvider');
  }
  return context;
}
