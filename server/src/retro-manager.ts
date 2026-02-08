import { v4 as uuidv4 } from 'uuid';
import {
  RetroSession, RetroPhase, PHASE_ORDER,
  RetroItem, ActionPoint, BrainstormComment, Participant
} from './types';
import { FileStorage } from './file-storage';

export class RetroManager {
  private session: RetroSession | null = null;
  private storage: FileStorage;

  constructor(storage: FileStorage) {
    this.storage = storage;
    // Try to restore active retro from disk
    this.session = this.storage.loadActiveRetro();
  }

  getSession(): RetroSession | null {
    return this.session;
  }

  getPublicSession(): Omit<RetroSession, 'adminToken'> | null {
    if (!this.session) return null;
    const { adminToken, ...publicData } = this.session;
    return publicData;
  }

  createRetro(sprintName: string, timerDuration: number): { retroId: string; adminToken: string } {
    if (this.session && this.session.phase !== RetroPhase.CLOSED) {
      throw new Error('A retro is already in progress. Close it first.');
    }

    const retroId = uuidv4().substring(0, 8);
    const adminToken = uuidv4();

    this.session = {
      id: retroId,
      sprintName,
      phase: RetroPhase.LOBBY,
      adminToken,
      participants: [],
      items: [],
      brainstormComments: [],
      brainstormItemIds: [],
      actionPoints: [],
      timerDuration,
      timerEndsAt: null,
      createdAt: new Date().toISOString(),
      closedAt: null
    };

    this.save();
    return { retroId, adminToken };
  }

  isAdmin(adminToken: string): boolean {
    return this.session !== null && this.session.adminToken === adminToken;
  }

  addParticipant(name: string, isAdmin: boolean): Participant {
    if (!this.session) throw new Error('No active retro');
    if (this.session.participants.find(p => p.name === name)) {
      throw new Error(`Participant "${name}" already exists`);
    }

    const participant: Participant = {
      name,
      isAdmin,
      joinedAt: new Date().toISOString()
    };
    this.session.participants.push(participant);
    this.save();
    return participant;
  }

  removeParticipant(name: string): void {
    if (!this.session) return;
    this.session.participants = this.session.participants.filter(p => p.name !== name);
    this.save();
  }

  hasParticipant(name: string): boolean {
    if (!this.session) return false;
    return this.session.participants.some(p => p.name === name);
  }

  changePhase(adminToken: string): RetroPhase {
    if (!this.session) throw new Error('No active retro');
    if (!this.isAdmin(adminToken)) throw new Error('Unauthorized');

    const currentIndex = PHASE_ORDER.indexOf(this.session.phase);
    if (currentIndex >= PHASE_ORDER.length - 1) {
      throw new Error('Already at the last phase');
    }

    const nextPhase = PHASE_ORDER[currentIndex + 1];
    this.session.phase = nextPhase;
    this.session.timerEndsAt = null;

    if (nextPhase === RetroPhase.CLOSED) {
      this.session.closedAt = new Date().toISOString();
      this.storage.archiveRetro(this.session);
      this.storage.clearActiveRetro();
    } else {
      this.save();
    }

    return nextPhase;
  }

  addItem(text: string, author: string, category: 'good' | 'improve'): RetroItem {
    if (!this.session) throw new Error('No active retro');

    const allowedPhase = category === 'good' ? RetroPhase.GOOD_ITEMS : RetroPhase.IMPROVE_ITEMS;
    if (this.session.phase !== allowedPhase) {
      throw new Error(`Cannot add ${category} items in phase ${this.session.phase}`);
    }

    const item: RetroItem = {
      id: uuidv4().substring(0, 8),
      text,
      author,
      votes: [],
      category,
      createdAt: new Date().toISOString()
    };
    this.session.items.push(item);
    this.save();
    return item;
  }

  vote(itemId: string, voterName: string): string[] {
    if (!this.session) throw new Error('No active retro');

    if (this.session.phase !== RetroPhase.GOOD_VOTING && this.session.phase !== RetroPhase.IMPROVE_VOTING) {
      throw new Error('Voting is not allowed in this phase');
    }

    const item = this.session.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    if (item.votes.includes(voterName)) {
      throw new Error('You already voted for this item');
    }

    item.votes.push(voterName);
    this.save();
    return item.votes;
  }

  unvote(itemId: string, voterName: string): string[] {
    if (!this.session) throw new Error('No active retro');

    if (this.session.phase !== RetroPhase.GOOD_VOTING && this.session.phase !== RetroPhase.IMPROVE_VOTING) {
      throw new Error('Voting is not allowed in this phase');
    }

    const item = this.session.items.find(i => i.id === itemId);
    if (!item) throw new Error('Item not found');

    item.votes = item.votes.filter(v => v !== voterName);
    this.save();
    return item.votes;
  }

  startTimer(adminToken: string, duration: number): string {
    if (!this.session) throw new Error('No active retro');
    if (!this.isAdmin(adminToken)) throw new Error('Unauthorized');

    const endsAt = new Date(Date.now() + duration * 1000).toISOString();
    this.session.timerEndsAt = endsAt;
    this.session.timerDuration = duration;
    this.save();
    return endsAt;
  }

  selectBrainstormItems(adminToken: string, itemIds: string[]): void {
    if (!this.session) throw new Error('No active retro');
    if (!this.isAdmin(adminToken)) throw new Error('Unauthorized');

    // Validate all items exist and are improvement items
    for (const id of itemIds) {
      const item = this.session.items.find(i => i.id === id && i.category === 'improve');
      if (!item) throw new Error(`Item ${id} not found or not an improvement item`);
    }

    this.session.brainstormItemIds = itemIds;
    this.save();
  }

  addBrainstormComment(itemId: string, text: string, author: string): BrainstormComment {
    if (!this.session) throw new Error('No active retro');
    if (this.session.phase !== RetroPhase.BRAINSTORMING) {
      throw new Error('Brainstorming is not active');
    }

    const comment: BrainstormComment = {
      id: uuidv4().substring(0, 8),
      itemId,
      text,
      author,
      createdAt: new Date().toISOString()
    };
    this.session.brainstormComments.push(comment);
    this.save();
    return comment;
  }

  addActionPoint(text: string, assignee: string, createdBy: string, itemId: string): ActionPoint {
    if (!this.session) throw new Error('No active retro');
    if (this.session.phase !== RetroPhase.ACTION_POINTS) {
      throw new Error('Action points phase is not active');
    }

    const actionPoint: ActionPoint = {
      id: uuidv4().substring(0, 8),
      text,
      assignee,
      createdBy,
      itemId
    };
    this.session.actionPoints.push(actionPoint);
    this.save();
    return actionPoint;
  }

  assignActionPoint(actionPointId: string, assignee: string): ActionPoint {
    if (!this.session) throw new Error('No active retro');
    if (this.session.phase !== RetroPhase.ACTION_POINTS) {
      throw new Error('Action points phase is not active');
    }

    const ap = this.session.actionPoints.find(a => a.id === actionPointId);
    if (!ap) throw new Error('Action point not found');

    ap.assignee = assignee;
    this.save();
    return ap;
  }

  getExportCsv(): string {
    if (!this.session) throw new Error('No active retro');
    return this.storage.generateCsv(this.session);
  }

  private save(): void {
    if (this.session) {
      this.storage.saveActiveRetro(this.session);
    }
  }
}
