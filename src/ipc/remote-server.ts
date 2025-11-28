import { ipcMain } from 'electron';
import { remoteServer } from '../services/remote-server';
import { getNtfyConfig, setNtfyConfig, sendNotification, NtfyConfig } from '../services/remote-server/notifications';

export function registerRemoteServerIPC() {
  ipcMain.handle('remote-server:start', async (_, port?: number) => {
    await remoteServer.start(port);
    return remoteServer.getConnectionInfo();
  });
  
  ipcMain.handle('remote-server:stop', () => {
    remoteServer.stop();
  });
  
  ipcMain.handle('remote-server:start-pairing', (_, remote: boolean) => {
    return remoteServer.startPairing(remote);
  });
  
  ipcMain.handle('remote-server:stop-pairing', () => {
    remoteServer.stopPairing();
  });
  
  ipcMain.handle('remote-server:pairing-status', () => {
    return remoteServer.getPairingStatus();
  });
  
  ipcMain.handle('remote-server:connection-info', () => {
    return remoteServer.getConnectionInfo();
  });

  // Ntfy IPC
  ipcMain.handle('ntfy:get-config', () => {
    return getNtfyConfig();
  });

  ipcMain.handle('ntfy:set-config', (_, config: Partial<NtfyConfig>) => { // Type 'config' is NtfyConfig
    setNtfyConfig(config);
    return { success: true };
  });

  ipcMain.handle('ntfy:test', async () => {
    await sendNotification({
      title: '🧪 Test Notification',
      message: 'Maestro notifications are working!',
      priority: 3,
    });
    return { success: true };
  });
}
