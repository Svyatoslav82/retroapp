import { customElement } from 'aurelia';
import { route } from '@aurelia/router-lite';
import template from './my-app.html';
import { HomePage } from './pages/home/home-page';
import { JoinPage } from './pages/join/join-page';
import { RetroRoom } from './pages/retro-room/retro-room';

@route({
  routes: [
    { path: '', component: HomePage, title: 'Home' },
    { path: 'join/:retroId', component: JoinPage, title: 'Join Retro' },
    { path: 'retro/:retroId', component: RetroRoom, title: 'Retro Room' }
  ]
})
@customElement({ name: 'my-app', template })
export class MyApp {}
