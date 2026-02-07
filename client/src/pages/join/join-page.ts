import { customElement, resolve } from 'aurelia';
import { IRouter, IRouteViewModel, Params, RouteNode } from '@aurelia/router-lite';
import { RetroService } from '../../services/retro-service';
import template from './join-page.html';

@customElement({ name: 'join-page', template })
export class JoinPage implements IRouteViewModel {
  retroId: string = '';
  participantName: string = '';
  errorMessage: string = '';
  retroInfo: any = null;
  isLoading: boolean = true;

  private router: IRouter = resolve(IRouter);
  private retroService: RetroService = resolve(RetroService);

  async loading(params: Params, next: RouteNode): Promise<void> {
    this.retroId = params.retroId as string;
    try {
      const res = await fetch(`/api/retro/${this.retroId}`);
      if (res.ok) {
        this.retroInfo = await res.json();
      } else {
        this.errorMessage = 'Retro not found';
      }
    } catch {
      this.errorMessage = 'Failed to load retro';
    } finally {
      this.isLoading = false;
    }
  }

  joinRetro(): void {
    if (!this.participantName.trim()) {
      this.errorMessage = 'Please enter your name';
      return;
    }
    this.errorMessage = '';
    sessionStorage.setItem('participantName', this.participantName.trim());
    this.router.load(`retro/${this.retroId}`);
  }

  get isAdmin(): boolean {
    return sessionStorage.getItem('adminToken') !== null
      && sessionStorage.getItem('retroId') === this.retroId;
  }
}
