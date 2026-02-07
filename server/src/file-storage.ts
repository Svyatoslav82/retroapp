import * as fs from 'fs';
import * as path from 'path';
import { RetroSession, AppConfig } from './types';

export class FileStorage {
  private dataDir: string;
  private retrosDir: string;
  private activeRetroPath: string;

  constructor(config: AppConfig) {
    this.dataDir = path.resolve(config.dataDir);
    this.retrosDir = path.join(this.dataDir, 'retros');
    this.activeRetroPath = path.join(this.dataDir, 'active-retro.json');

    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (!fs.existsSync(this.retrosDir)) {
      fs.mkdirSync(this.retrosDir, { recursive: true });
    }
  }

  saveActiveRetro(session: RetroSession): void {
    const data = JSON.stringify(session, null, 2);
    fs.writeFileSync(this.activeRetroPath, data, 'utf-8');
  }

  loadActiveRetro(): RetroSession | null {
    if (!fs.existsSync(this.activeRetroPath)) {
      return null;
    }
    const data = fs.readFileSync(this.activeRetroPath, 'utf-8');
    return JSON.parse(data) as RetroSession;
  }

  clearActiveRetro(): void {
    if (fs.existsSync(this.activeRetroPath)) {
      fs.unlinkSync(this.activeRetroPath);
    }
  }

  archiveRetro(session: RetroSession): void {
    const safeName = session.sprintName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const date = new Date().toISOString().split('T')[0];
    const baseName = `retro-${session.id}-${safeName}-${date}`;

    const jsonPath = path.join(this.retrosDir, `${baseName}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(session, null, 2), 'utf-8');

    const csvPath = path.join(this.retrosDir, `${baseName}.csv`);
    fs.writeFileSync(csvPath, this.generateCsv(session), 'utf-8');
  }

  listPastRetros(): Array<{ id: string; sprintName: string; date: string; file: string }> {
    if (!fs.existsSync(this.retrosDir)) return [];

    const files = fs.readdirSync(this.retrosDir).filter(f => f.endsWith('.json'));
    return files.map(file => {
      const data = JSON.parse(fs.readFileSync(path.join(this.retrosDir, file), 'utf-8')) as RetroSession;
      return {
        id: data.id,
        sprintName: data.sprintName,
        date: data.createdAt,
        file
      };
    });
  }

  loadRetroById(retroId: string): RetroSession | null {
    // Check active first
    const active = this.loadActiveRetro();
    if (active && active.id === retroId) return active;

    // Check archived
    if (!fs.existsSync(this.retrosDir)) return null;
    const files = fs.readdirSync(this.retrosDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(this.retrosDir, file), 'utf-8')) as RetroSession;
      if (data.id === retroId) return data;
    }
    return null;
  }

  generateCsv(session: RetroSession): string {
    const lines: string[] = [];
    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const participantNames = session.participants.map(p => p.name).join(', ');

    lines.push(`=== Sprint Retrospective: ${session.sprintName} ===`);
    lines.push(`=== Date: ${session.createdAt} ===`);
    lines.push(`=== Participants: ${participantNames} ===`);
    lines.push('');

    // Items section
    lines.push('Section,Item,Author,Votes,VotedBy');
    const goodItems = session.items.filter(i => i.category === 'good');
    const improveItems = session.items.filter(i => i.category === 'improve');

    for (const item of goodItems) {
      lines.push(`What Went Well,${esc(item.text)},${esc(item.author)},${item.votes.length},${esc(item.votes.join(', '))}`);
    }
    for (const item of improveItems) {
      lines.push(`What Could Be Better,${esc(item.text)},${esc(item.author)},${item.votes.length},${esc(item.votes.join(', '))}`);
    }

    // Brainstorming section
    if (session.brainstormComments.length > 0) {
      lines.push('');
      lines.push('=== Brainstorming Notes ===');
      lines.push('Item,Comment,Author');
      for (const comment of session.brainstormComments) {
        const item = session.items.find(i => i.id === comment.itemId);
        const itemText = item ? item.text : 'Unknown';
        lines.push(`${esc(itemText)},${esc(comment.text)},${esc(comment.author)}`);
      }
    }

    // Action Points section
    if (session.actionPoints.length > 0) {
      lines.push('');
      lines.push('=== Action Points ===');
      lines.push('Action,Assignee,CreatedBy');
      for (const ap of session.actionPoints) {
        lines.push(`${esc(ap.text)},${esc(ap.assignee)},${esc(ap.createdBy)}`);
      }
    }

    return lines.join('\n');
  }

  getExportCsvPath(session: RetroSession): string | null {
    const safeName = session.sprintName.replace(/[^a-zA-Z0-9-_]/g, '_');
    const date = new Date(session.createdAt).toISOString().split('T')[0];
    const baseName = `retro-${session.id}-${safeName}-${date}`;
    const csvPath = path.join(this.retrosDir, `${baseName}.csv`);
    if (fs.existsSync(csvPath)) return csvPath;
    return null;
  }
}
