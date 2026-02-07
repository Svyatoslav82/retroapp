export enum RetroPhase {
  LOBBY = 'lobby',
  GOOD_ITEMS = 'good_items',
  GOOD_VOTING = 'good_voting',
  IMPROVE_ITEMS = 'improve_items',
  IMPROVE_VOTING = 'improve_voting',
  BRAINSTORMING = 'brainstorming',
  ACTION_POINTS = 'action_points',
  CLOSED = 'closed'
}

export const PHASE_ORDER: RetroPhase[] = [
  RetroPhase.LOBBY,
  RetroPhase.GOOD_ITEMS,
  RetroPhase.GOOD_VOTING,
  RetroPhase.IMPROVE_ITEMS,
  RetroPhase.IMPROVE_VOTING,
  RetroPhase.BRAINSTORMING,
  RetroPhase.ACTION_POINTS,
  RetroPhase.CLOSED
];

export const PHASE_LABELS: Record<RetroPhase, string> = {
  [RetroPhase.LOBBY]: 'Lobby - Waiting for participants',
  [RetroPhase.GOOD_ITEMS]: 'What Went Well',
  [RetroPhase.GOOD_VOTING]: 'Vote: What Went Well',
  [RetroPhase.IMPROVE_ITEMS]: 'What Could Be Better',
  [RetroPhase.IMPROVE_VOTING]: 'Vote: What Could Be Better',
  [RetroPhase.BRAINSTORMING]: 'Brainstorming',
  [RetroPhase.ACTION_POINTS]: 'Action Points',
  [RetroPhase.CLOSED]: 'Retrospective Closed'
};

export const NEXT_PHASE_LABELS: Record<string, string> = {
  [RetroPhase.LOBBY]: 'Start: What Went Well',
  [RetroPhase.GOOD_ITEMS]: 'Start Voting: What Went Well',
  [RetroPhase.GOOD_VOTING]: 'Start: What Could Be Better',
  [RetroPhase.IMPROVE_ITEMS]: 'Start Voting: What Could Be Better',
  [RetroPhase.IMPROVE_VOTING]: 'Start Brainstorming',
  [RetroPhase.BRAINSTORMING]: 'Move to Action Points',
  [RetroPhase.ACTION_POINTS]: 'Close Retrospective'
};

export interface RetroItem {
  id: string;
  text: string;
  author: string;
  votes: string[];
  category: 'good' | 'improve';
  createdAt: string;
}

export interface ActionPoint {
  id: string;
  text: string;
  assignee: string;
  createdBy: string;
}

export interface BrainstormComment {
  id: string;
  itemId: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Participant {
  name: string;
  isAdmin: boolean;
  joinedAt: string;
}

export interface RetroSession {
  id: string;
  sprintName: string;
  phase: RetroPhase;
  participants: Participant[];
  items: RetroItem[];
  brainstormComments: BrainstormComment[];
  brainstormItemIds: string[];
  actionPoints: ActionPoint[];
  timerDuration: number;
  timerEndsAt: string | null;
  createdAt: string;
  closedAt: string | null;
}
