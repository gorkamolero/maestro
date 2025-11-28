import { ipcMain } from 'electron';
import { remoteServer } from '../services/remote-server';

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
}
