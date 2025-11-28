import { useState, useCallback } from 'react';

interface PairingInfo {
  pin: string;
  expiresAt: string;
  remoteToken?: string;
}

interface ConnectionInfo {
  urls: string[];
  port: number;
}

export function useRemoteServer() {
  const [isRunning, setIsRunning] = useState(false);
  const [pairing, setPairing] = useState<PairingInfo | null>(null);
  const [connection, setConnection] = useState<ConnectionInfo | null>(null);
  
  const start = useCallback(async (port?: number) => {
    const info = await window.remoteServer.start(port);
    setConnection(info);
    setIsRunning(true);
  }, []);
  
  const stop = useCallback(async () => {
    await window.remoteServer.stop();
    setIsRunning(false);
    setConnection(null);
  }, []);
  
  const startPairing = useCallback(async (remote = false) => {
    const info = await window.remoteServer.startPairing(remote);
    setPairing(info);
    return info;
  }, []);
  
  const stopPairing = useCallback(async () => {
    await window.remoteServer.stopPairing();
    setPairing(null);
  }, []);
  
  return {
    isRunning,
    connection,
    pairing,
    start,
    stop,
    startPairing,
    stopPairing,
  };
}
