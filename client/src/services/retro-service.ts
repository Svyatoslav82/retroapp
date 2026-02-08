import { SocketService } from './socket-service';
import {
  RetroSession, RetroPhase, RetroItem,
  ActionPoint, BrainstormComment, Participant
} from '../models/interfaces';

export class RetroService {
  private socketService: SocketService;

  public session: RetroSession | null = null;
  public participantName: string = '';
  public adminToken: string = '';
  public error: string = '';

  // Callbacks for UI updates
  public onStateChange: (() => void) | null = null;

  constructor(socketService: SocketService) {
    this.socketService = socketService;
  }

  get isAdmin(): boolean {
    return this.adminToken !== '';
  }

  get currentPhase(): RetroPhase | null {
    return this.session?.phase ?? null;
  }

  connect(): void {
    this.socketService.connect();
    this.setupListeners();
  }

  private setupListeners(): void {
    this.socketService.on('retro:state', (data: RetroSession) => {
      this.session = data;
      this.notify();
    });

    this.socketService.on('retro:participant-joined', (participant: Participant) => {
      if (this.session && !this.session.participants.find(p => p.name === participant.name)) {
        this.session.participants.push(participant);
        this.notify();
      }
    });

    this.socketService.on('retro:participant-left', ({ name }: { name: string }) => {
      if (this.session) {
        this.session.participants = this.session.participants.filter(p => p.name !== name);
        this.notify();
      }
    });

    this.socketService.on('retro:item-added', (item: RetroItem) => {
      if (this.session) {
        this.session.items.push(item);
        this.notify();
      }
    });

    this.socketService.on('retro:vote-updated', ({ itemId, votes }: { itemId: string; votes: string[] }) => {
      if (this.session) {
        const item = this.session.items.find(i => i.id === itemId);
        if (item) {
          item.votes = votes;
          this.notify();
        }
      }
    });

    this.socketService.on('retro:phase-changed', ({ phase }: { phase: RetroPhase }) => {
      if (this.session) {
        this.session.phase = phase;
        if (phase === RetroPhase.CLOSED) {
          this.session.closedAt = new Date().toISOString();
        }
        this.notify();
      }
    });

    this.socketService.on('retro:timer-started', ({ endsAt }: { endsAt: string }) => {
      if (this.session) {
        this.session.timerEndsAt = endsAt;
        this.notify();
      }
    });

    this.socketService.on('retro:brainstorm-items-selected', ({ itemIds }: { itemIds: string[] }) => {
      if (this.session) {
        this.session.brainstormItemIds = itemIds;
        this.notify();
      }
    });

    this.socketService.on('retro:brainstorm-comment-added', (comment: BrainstormComment) => {
      if (this.session) {
        this.session.brainstormComments.push(comment);
        this.notify();
      }
    });

    this.socketService.on('retro:action-point-added', (actionPoint: ActionPoint) => {
      if (this.session) {
        this.session.actionPoints.push(actionPoint);
        this.notify();
      }
    });

    this.socketService.on('retro:action-point-updated', (actionPoint: ActionPoint) => {
      if (this.session) {
        const idx = this.session.actionPoints.findIndex(a => a.id === actionPoint.id);
        if (idx >= 0) {
          this.session.actionPoints[idx] = actionPoint;
        }
        this.notify();
      }
    });

    this.socketService.on('retro:closed', ({ closedAt }: { closedAt: string }) => {
      if (this.session) {
        this.session.phase = RetroPhase.CLOSED;
        this.session.closedAt = closedAt;
        this.notify();
      }
    });

    this.socketService.on('retro:error', ({ message }: { message: string }) => {
      this.error = message;
      this.notify();
    });
  }

  joinRetro(retroId: string, name: string, adminToken?: string): void {
    this.participantName = name;
    if (adminToken) this.adminToken = adminToken;
    this.socketService.emit('retro:join', { retroId, participantName: name, adminToken });
  }

  addItem(text: string, category: 'good' | 'improve'): void {
    this.socketService.emit('retro:add-item', { text, category });
  }

  vote(itemId: string): void {
    this.socketService.emit('retro:vote', { itemId });
  }

  unvote(itemId: string): void {
    this.socketService.emit('retro:unvote', { itemId });
  }

  changePhase(): void {
    this.socketService.emit('retro:change-phase', {});
  }

  startTimer(duration: number): void {
    this.socketService.emit('retro:start-timer', { duration });
  }

  selectBrainstormItems(itemIds: string[]): void {
    this.socketService.emit('retro:select-brainstorm-items', { itemIds });
  }

  addBrainstormComment(itemId: string, text: string): void {
    this.socketService.emit('retro:add-brainstorm-comment', { itemId, text });
  }

  addActionPoint(text: string, assignee: string, itemId: string): void {
    this.socketService.emit('retro:add-action-point', { text, assignee, itemId });
  }

  assignActionPoint(actionPointId: string, assignee: string): void {
    this.socketService.emit('retro:assign-action-point', { actionPointId, assignee });
  }

  async createRetro(sprintName: string, timerDuration: number): Promise<{ retroId: string; adminToken: string }> {
    const res = await fetch('/api/retro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sprintName, timerDuration })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error);
    }
    const data = await res.json();
    this.adminToken = data.adminToken;
    return data;
  }

  async fetchRetroList(): Promise<any> {
    const res = await fetch('/api/retros');
    return res.json();
  }

  exportCsvUrl(retroId: string): string {
    return `/api/retro/${retroId}/export`;
  }

  clearError(): void {
    this.error = '';
  }

  private notify(): void {
    this.onStateChange?.();
  }
}
