import Aurelia, { Registration } from 'aurelia';
import { RouterConfiguration } from '@aurelia/router-lite';
import { MyApp } from './my-app';
import { SocketService } from './services/socket-service';
import { RetroService } from './services/retro-service';
import './styles.css';

const au = new Aurelia();

// Register singletons
const socketService = new SocketService();
const retroService = new RetroService(socketService);

au.register(
  RouterConfiguration.customize({ useUrlFragmentHash: false }),
  Registration.instance(SocketService, socketService),
  Registration.instance(RetroService, retroService)
);

au.app({ host: document.querySelector('my-app')!, component: MyApp });
au.start();
