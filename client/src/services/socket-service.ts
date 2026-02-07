import { io, Socket } from 'socket.io-client';

export class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();

  connect(): void {
    if (this.socket?.connected) return;

    // In dev, webpack proxy handles /socket.io → localhost:3000
    // In prod, same origin
    this.socket = io({
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    // Re-register all listeners on the new socket
    for (const [event, callbacks] of this.listeners) {
      for (const cb of callbacks) {
        this.socket.on(event, cb as any);
      }
    }
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    this.socket?.on(event, callback as any);
  }

  off(event: string, callback: Function): void {
    this.listeners.get(event)?.delete(callback);
    this.socket?.off(event, callback as any);
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }
}
