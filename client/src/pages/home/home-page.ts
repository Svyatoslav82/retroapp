import { customElement, resolve } from 'aurelia';
import { IRouter } from '@aurelia/router-lite';
import { RetroService } from '../../services/retro-service';
import template from './home-page.html';

@customElement({ name: 'home-page', template })
export class HomePage {
  sprintName: string = '';
  timerDuration: number = 300;
  errorMessage: string = '';
  isLoading: boolean = true;
  activeRetro: any = null;
  pastRetros: any[] = [];

  private router: IRouter = resolve(IRouter);
  private retroService: RetroService = resolve(RetroService);

  async binding(): Promise<void> {
    try {
      const data = await this.retroService.fetchRetroList();
      this.activeRetro = data.active;
      this.pastRetros = data.pastRetros || [];
    } catch {
      // ignore
    } finally {
      this.isLoading = false;
    }
  }

  async createRetro(): Promise<void> {
    if (!this.sprintName.trim()) {
      this.errorMessage = 'Please enter a sprint name';
      return;
    }
    this.errorMessage = '';
    try {
      const { retroId, adminToken } = await this.retroService.createRetro(
        this.sprintName.trim(),
        this.timerDuration
      );
      sessionStorage.setItem('adminToken', adminToken);
      sessionStorage.setItem('retroId', retroId);
      this.router.load(`join/${retroId}`);
    } catch (err: any) {
      this.errorMessage = err.message;
    }
  }

  joinActive(): void {
    if (this.activeRetro) {
      this.router.load(`join/${this.activeRetro.id}`);
    }
  }

  get timerMinutes(): number {
    return Math.floor(this.timerDuration / 60);
  }

  set timerMinutes(val: number) {
    this.timerDuration = val * 60;
  }

  exportCsv(retroId: string): void {
    window.open(this.retroService.exportCsvUrl(retroId), '_blank');
  }
}
