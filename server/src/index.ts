import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { AppConfig } from './types';
import { FileStorage } from './file-storage';
import { RetroManager } from './retro-manager';
import { createRoutes } from './routes';
import { setupSocketHandlers } from './socket-handlers';

// Load config
const configPath = path.resolve(__dirname, '..', 'config', 'default.json');
const config: AppConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: config.corsOrigin,
    methods: ['GET', 'POST']
  }
});

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Initialize storage and manager
const storage = new FileStorage(config);
const manager = new RetroManager(storage);

// API routes
app.use(createRoutes(manager, storage));

// Serve client static files in production
const clientDist = path.resolve(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Socket.io
setupSocketHandlers(io, manager);

httpServer.listen(config.port, () => {
  console.log(`Retro server running on http://localhost:${config.port}`);
});
