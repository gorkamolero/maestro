interface RemoteViewAPI {
  getSources(): Promise<Array<{ id: string; name: string; thumbnail?: string }>>;
  getMaestroSource(): Promise<{ id: string; name: string; thumbnail?: string } | null>;
  getBrowserSource(browserId: string): Promise<{ id: string; name: string; thumbnail?: string } | null>;
  getBrowsers(): Promise<Array<{
    id: string;
    label: string;
    url: string;
    title: string;
    bounds: { x: number; y: number; width: number; height: number };
  }>>;
  getBrowserBounds(browserId: string): Promise<{ width: number; height: number } | null>;
  injectInput(browserId: string, input: unknown, viewport: unknown): Promise<boolean>;
  sendSignal(clientId: string, signal: unknown): void;
  onSignal(callback: (clientId: string, signal: unknown) => void): () => void;
  onViewerConnected(callback: (clientId: string, browserId: string, quality: string, sourceId?: string) => void): () => void;
  onViewerDisconnected(callback: (clientId: string) => void): () => void;
}

declare global {
  interface Window {
    remoteView: RemoteViewAPI;
  }
}

export {};
