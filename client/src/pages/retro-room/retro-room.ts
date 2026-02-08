import { customElement, observable, resolve } from 'aurelia';
import { IRouter, IRouteViewModel, Params, RouteNode } from '@aurelia/router-lite';
import { RetroService } from '../../services/retro-service';
import { SocketService } from '../../services/socket-service';
import {
  RetroPhase, PHASE_LABELS, NEXT_PHASE_LABELS,
  RetroItem, RetroSession, ActionPoint, BrainstormComment, Participant
} from '../../models/interfaces';
import template from './retro-room.html';

@customElement({ name: 'retro-room', template })
export class RetroRoom implements IRouteViewModel {
  retroId: string = '';

  // Local copies of session state (Aurelia observes these)
  @observable phase: RetroPhase | null = null;
  @observable session: RetroSession | null = null;
  @observable items: RetroItem[] = [];
  @observable participants: Participant[] = [];
  @observable actionPoints: ActionPoint[] = [];
  @observable brainstormComments: BrainstormComment[] = [];
  @observable brainstormItemIds: string[] = [];

  // Dialog state
  showAddDialog: boolean = false;
  newItemText: string = '';

  // Timer
  timerDisplay: string = '';
  timerInterval: any = null;
  customTimerMinutes: number = 5;

  // Brainstorm
  selectedBrainstormIds: string[] = [];

  // Action points
  newActionText: string = '';
  selectedActionItemId: string = '';
  editingAssigneeId: string = '';
  assigneeValue: string = '';

  // Confirm next phase
  showConfirmNext: boolean = false;

  private router: IRouter = resolve(IRouter);
  public retroService: RetroService = resolve(RetroService);
  private socketService: SocketService = resolve(SocketService);

  loading(params: Params, next: RouteNode): void {
    this.retroId = params.retroId as string;

    const participantName = sessionStorage.getItem('participantName');
    if (!participantName) {
      this.router.load(`join/${this.retroId}`);
      return;
    }

    this.retroService.connect();
    const adminToken = sessionStorage.getItem('adminToken') || '';
    this.retroService.joinRetro(this.retroId, participantName, adminToken || undefined);

    this.retroService.onStateChange = () => {
      this.syncState();
    };

    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  detaching(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
    this.retroService.onStateChange = null;
  }

  // Sync service state → local observable properties
  private syncState(): void {
    const s = this.retroService.session;
    this.session = s;
    this.phase = s?.phase ?? null;
    this.items = s?.items ? [...s.items] : [];
    this.participants = s?.participants ? [...s.participants] : [];
    this.actionPoints = s?.actionPoints ? [...s.actionPoints] : [];
    this.brainstormComments = s?.brainstormComments ? [...s.brainstormComments] : [];
    this.brainstormItemIds = s?.brainstormItemIds ? [...s.brainstormItemIds] : [];
    this.updateTimer();
  }

  // Phase helpers
  get phaseLabel(): string {
    return this.phase ? PHASE_LABELS[this.phase] : '';
  }

  get nextPhaseLabel(): string {
    return this.phase ? (NEXT_PHASE_LABELS[this.phase] || '') : '';
  }

  get isAdmin(): boolean {
    return this.retroService.isAdmin;
  }

  get isItemPhase(): boolean {
    return this.phase === RetroPhase.GOOD_ITEMS || this.phase === RetroPhase.IMPROVE_ITEMS;
  }

  get isVotingPhase(): boolean {
    return this.phase === RetroPhase.GOOD_VOTING || this.phase === RetroPhase.IMPROVE_VOTING;
  }

  get currentCategory(): 'good' | 'improve' {
    if (this.phase === RetroPhase.IMPROVE_ITEMS || this.phase === RetroPhase.IMPROVE_VOTING) {
      return 'improve';
    }
    return 'good';
  }

  get visibleItems(): RetroItem[] {
    if (this.phase === RetroPhase.GOOD_ITEMS || this.phase === RetroPhase.GOOD_VOTING) {
      return this.items.filter(i => i.category === 'good');
    }
    if (this.phase === RetroPhase.IMPROVE_ITEMS || this.phase === RetroPhase.IMPROVE_VOTING) {
      return this.items.filter(i => i.category === 'improve');
    }
    if (this.phase === RetroPhase.BRAINSTORMING) {
      return this.items.filter(i => this.brainstormItemIds.includes(i.id));
    }
    return this.items;
  }

  get sortedVisibleItems(): RetroItem[] {
    if (this.isVotingPhase || this.phase === RetroPhase.BRAINSTORMING || this.phase === RetroPhase.CLOSED) {
      return [...this.visibleItems].sort((a, b) => b.votes.length - a.votes.length);
    }
    return this.visibleItems;
  }

  get goodItems(): RetroItem[] {
    return this.items.filter(i => i.category === 'good').sort((a, b) => b.votes.length - a.votes.length);
  }

  get improveItems(): RetroItem[] {
    return this.items.filter(i => i.category === 'improve').sort((a, b) => b.votes.length - a.votes.length);
  }

  get brainstormItems(): RetroItem[] {
    return this.items.filter(i => this.brainstormItemIds.includes(i.id));
  }

  // Actions
  openAddDialog(): void {
    this.newItemText = '';
    this.showAddDialog = true;
  }

  closeAddDialog(): void {
    this.showAddDialog = false;
    this.newItemText = '';
  }

  saveItem(): void {
    if (!this.newItemText.trim()) return;
    this.retroService.addItem(this.newItemText.trim(), this.currentCategory);
    this.closeAddDialog();
  }

  toggleVote(itemId: string): void {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return;
    const name = this.retroService.participantName;
    if (item.votes.includes(name)) {
      this.retroService.unvote(itemId);
    } else {
      this.retroService.vote(itemId);
    }
  }

  hasVoted(item: RetroItem): boolean {
    return item.votes.includes(this.retroService.participantName);
  }

  confirmNextPhase(): void {
    this.showConfirmNext = true;
  }

  cancelNextPhase(): void {
    this.showConfirmNext = false;
  }

  nextPhase(): void {
    this.showConfirmNext = false;
    this.retroService.changePhase();
  }

  startTimer(): void {
    this.retroService.startTimer(this.customTimerMinutes * 60);
  }

  updateTimer(): void {
    const s = this.retroService.session;
    if (!s?.timerEndsAt) {
      this.timerDisplay = '';
      return;
    }
    const remaining = Math.max(0, new Date(s.timerEndsAt).getTime() - Date.now());
    if (remaining <= 0) {
      this.timerDisplay = 'Time is up!';
      return;
    }
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    this.timerDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // Brainstorm
  toggleBrainstormItem(itemId: string): void {
    const idx = this.selectedBrainstormIds.indexOf(itemId);
    if (idx >= 0) {
      this.selectedBrainstormIds = this.selectedBrainstormIds.filter(id => id !== itemId);
    } else {
      this.selectedBrainstormIds = [...this.selectedBrainstormIds, itemId];
    }
  }

  confirmBrainstormSelection(): void {
    this.retroService.selectBrainstormItems([...this.selectedBrainstormIds]);
  }

  // Action points — linked to brainstorm items
  addActionPoint(): void {
    if (!this.newActionText.trim() || !this.selectedActionItemId) return;
    this.retroService.addActionPoint(this.newActionText.trim(), '', this.selectedActionItemId);
    this.newActionText = '';
  }

  getActionPointsForItem(itemId: string): ActionPoint[] {
    return this.actionPoints.filter(ap => ap.itemId === itemId);
  }

  startAssigning(apId: string): void {
    this.editingAssigneeId = apId;
    this.assigneeValue = '';
  }

  cancelAssigning(): void {
    this.editingAssigneeId = '';
    this.assigneeValue = '';
  }

  confirmAssignee(apId: string): void {
    if (!this.assigneeValue) return;
    this.retroService.assignActionPoint(apId, this.assigneeValue);
    this.editingAssigneeId = '';
    this.assigneeValue = '';
  }

  // Links & export
  get joinLink(): string {
    return `${window.location.origin}/join/${this.retroId}`;
  }

  copyJoinLink(): void {
    navigator.clipboard.writeText(this.joinLink);
  }

  exportCsv(): void {
    window.open(this.retroService.exportCsvUrl(this.retroId), '_blank');
  }

  dismissError(): void {
    this.retroService.clearError();
  }
}
