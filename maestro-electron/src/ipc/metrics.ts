import { ipcMain, BrowserWindow } from 'electron';
import si from 'systeminformation';

const segmentProcesses = new Map<string, number[]>();

export function registerMetricsHandlers() {
  ipcMain.handle('get_system_metrics', async () => {
    const [mem, cpu, processes] = await Promise.all([
      si.mem(),
      si.currentLoad(),
      si.processes(),
    ]);

    return {
      total_ram: Math.round(mem.total / 1024 / 1024),
      used_ram: Math.round(mem.used / 1024 / 1024),
      total_cpu: cpu.currentLoad,
      process_count: processes.all,
    };
  });

  ipcMain.handle('get_process_metrics', async (_event, { pid }) => {
    const processes = await si.processes();
    const proc = processes.list.find((p) => p.pid === pid);

    if (!proc) return null;

    return {
      pid: proc.pid,
      name: proc.name,
      ram: Math.round((proc.mem || 0) / 1024 / 1024),
      cpu: proc.cpu || 0,
    };
  });

  ipcMain.handle('track_segment_process', async (_event, { segmentId, pid }) => {
    if (!segmentProcesses.has(segmentId)) {
      segmentProcesses.set(segmentId, []);
    }
    segmentProcesses.get(segmentId)?.push(pid);
  });

  ipcMain.handle('untrack_segment', async (_event, { segmentId }) => {
    segmentProcesses.delete(segmentId);
  });

  ipcMain.handle('get_segment_metrics', async (_event, { segmentId }) => {
    const pids = segmentProcesses.get(segmentId);
    if (!pids) return null;

    const processes = await si.processes();
    const metrics = pids
      .map((pid) => processes.list.find((p) => p.pid === pid))
      .filter(Boolean)
      .map((proc) => ({
        pid: proc!.pid,
        name: proc!.name,
        ram: Math.round((proc!.mem || 0) / 1024 / 1024),
        cpu: proc!.cpu || 0,
      }));

    const totalRam = metrics.reduce((sum, m) => sum + m.ram, 0);
    const totalCpu = metrics.reduce((sum, m) => sum + m.cpu, 0);

    return {
      segment_id: segmentId,
      ram: totalRam,
      cpu: totalCpu,
      processes: metrics,
      last_updated: new Date().toISOString(),
    };
  });

  ipcMain.handle('kill_process', async (_event, { pid }) => {
    try {
      process.kill(pid);
    } catch (err: any) {
      throw new Error(`Failed to kill process ${pid}: ${err.message}`);
    }
  });

  ipcMain.handle('get_all_processes', async () => {
    const processes = await si.processes();
    return processes.list.map((proc) => ({
      pid: proc.pid,
      name: proc.name,
      ram: Math.round((proc.mem || 0) / 1024 / 1024),
      cpu: proc.cpu || 0,
    }));
  });
}

export function startMetricsPolling(getMainWindow: () => BrowserWindow | null) {
  setInterval(async () => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      try {
        const [mem, cpu, processes] = await Promise.all([
          si.mem(),
          si.currentLoad(),
          si.processes(),
        ]);

        const metrics = {
          total_ram: Math.round(mem.total / 1024 / 1024),
          used_ram: Math.round(mem.used / 1024 / 1024),
          total_cpu: cpu.currentLoad,
          process_count: processes.all,
        };

        mainWindow.webContents.send('system-metrics', metrics);
      } catch (err) {
        console.error('Failed to get system metrics:', err);
      }
    }
  }, 1000);
}
