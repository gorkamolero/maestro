import { IPty } from 'node-pty';
import { wsManager } from '../websocket/handler';
import { TerminalFrame } from '../websocket/protocol';

const FLUSH_INTERVAL_MS = 8;        // ~120Hz
const MAX_FRAME_BYTES = 32 * 1024;  // 32KB max frame
const MAX_BACKLOG_BYTES = 1024 * 1024; // 1MB backlog per terminal

interface FrameBuffer {
  chunks: string[];
  bytes: number;
  timer: NodeJS.Timeout | null;
  seq: number;
}

interface Backlog {
  chunks: string[];
  totalBytes: number;
  exited?: { code: number; ts: number };
}

class TerminalBridge {
  private ptys = new Map<string, IPty>();
  private buffers = new Map<string, FrameBuffer>();
  private backlogs = new Map<string, Backlog>();
  private inputSeq = new Map<string, number>();  // Dedup
  
  register(terminalId: string, pty: IPty) {
    this.ptys.set(terminalId, pty);
    this.backlogs.set(terminalId, { chunks: [], totalBytes: 0 });
    
    pty.onData((data) => {
      this.appendBacklog(terminalId, data);
      this.bufferFrame(terminalId, data);
    });
    
    pty.onExit(({ exitCode }) => {
      this.flush(terminalId);
      
      // Record exit in backlog
      const backlog = this.backlogs.get(terminalId);
      if (backlog) {
        backlog.exited = { code: exitCode, ts: Date.now() };
      }
      
      // Broadcast exit
      wsManager.broadcastToId('terminal', terminalId, 'term:exit', {
        id: terminalId,
        code: exitCode,
      });
      
      this.cleanup(terminalId);
    });
  }
  
  private bufferFrame(id: string, data: string) {
    let buf = this.buffers.get(id);
    if (!buf) {
      buf = { chunks: [], bytes: 0, timer: null, seq: 0 };
      this.buffers.set(id, buf);
    }
    
    buf.chunks.push(data);
    buf.bytes += data.length;
    
    // Flush immediately if frame too large
    if (buf.bytes >= MAX_FRAME_BYTES) {
      this.flush(id);
      return;
    }
    
    // Schedule flush at target framerate
    if (!buf.timer) {
      buf.timer = setTimeout(() => this.flush(id), FLUSH_INTERVAL_MS);
    }
  }
  
  private flush(id: string) {
    const buf = this.buffers.get(id);
    if (!buf || buf.bytes === 0) return;
    
    if (buf.timer) {
      clearTimeout(buf.timer);
      buf.timer = null;
    }
    
    const data = buf.chunks.join('');
    buf.chunks = [];
    buf.bytes = 0;
    buf.seq++;
    
    const frame: TerminalFrame = {
      id,
      seq: buf.seq,
      ts: Date.now(),
      data,
    };
    
    wsManager.broadcastToId('terminal', id, 'term:frame', frame);
  }
  
  private appendBacklog(id: string, data: string) {
    let backlog = this.backlogs.get(id);
    if (!backlog) {
      backlog = { chunks: [], totalBytes: 0 };
      this.backlogs.set(id, backlog);
    }
    
    backlog.chunks.push(data);
    backlog.totalBytes += data.length;
    
    // Trim old data if too large
    while (backlog.totalBytes > MAX_BACKLOG_BYTES && backlog.chunks.length > 0) {
      const removed = backlog.chunks.shift()!;
      backlog.totalBytes -= removed.length;
    }
  }
  
  // Send backlog to newly subscribed client
  sendBacklog(clientId: string, terminalId: string) {
    const backlog = this.backlogs.get(terminalId);
    if (!backlog || backlog.chunks.length === 0) return;
    
    const data = backlog.chunks.join('');
    
    // Send in chunks to avoid overwhelming
    let offset = 0;
    let seq = 0;
    while (offset < data.length) {
      const slice = data.slice(offset, offset + MAX_FRAME_BYTES);
      wsManager.send(clientId, 'term:frame', {
        id: terminalId,
        seq: seq++,
        ts: Date.now(),
        data: slice,
      });
      offset += MAX_FRAME_BYTES;
    }
    
    // If terminal exited, send exit too
    if (backlog.exited) {
      wsManager.send(clientId, 'term:exit', {
        id: terminalId,
        code: backlog.exited.code,
      });
    }
  }
  
  write(id: string, data: string, seq?: number) {
    // Dedup by sequence number
    if (seq !== undefined) {
      const lastSeq = this.inputSeq.get(id) ?? -1;
      if (seq <= lastSeq) return;  // Already processed
      this.inputSeq.set(id, seq);
    }
    
    const pty = this.ptys.get(id);
    if (pty) {
      pty.write(data);
      // Flush output immediately after input for snappy echo
      this.flush(id);
    }
  }
  
  resize(id: string, cols: number, rows: number) {
    const pty = this.ptys.get(id);
    if (pty) {
      pty.resize(cols, rows);
    }
  }
  
  private cleanup(id: string) {
    this.ptys.delete(id);
    this.buffers.delete(id);
    this.inputSeq.delete(id);
    // Keep backlog for reconnection
  }
  
  dispose() {
    for (const pty of this.ptys.values()) {
      pty.kill();
    }
    this.ptys.clear();
    this.buffers.clear();
    this.backlogs.clear();
  }
}

export const terminalBridge = new TerminalBridge();
