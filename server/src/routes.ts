import { Router, Request, Response } from 'express';
import { RetroManager } from './retro-manager';
import { FileStorage } from './file-storage';

export function createRoutes(manager: RetroManager, storage: FileStorage): Router {
  const router = Router();

  // Create a new retro
  router.post('/api/retro', (req: Request, res: Response) => {
    try {
      const { sprintName, timerDuration } = req.body;
      if (!sprintName) {
        return res.status(400).json({ error: 'sprintName is required' });
      }

      const result = manager.createRetro(sprintName, timerDuration || 300);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Get retro state
  router.get('/api/retro/:id', (req: Request, res: Response) => {
    const session = manager.getSession();
    if (session && session.id === req.params.id) {
      return res.json(manager.getPublicSession());
    }

    // Check archived
    const archived = storage.loadRetroById(req.params.id);
    if (archived) {
      const { adminToken, ...publicData } = archived;
      return res.json(publicData);
    }

    res.status(404).json({ error: 'Retro not found' });
  });

  // Export retro as CSV
  router.get('/api/retro/:id/export', (req: Request, res: Response) => {
    const session = manager.getSession();
    let retroData;

    if (session && session.id === req.params.id) {
      retroData = session;
    } else {
      retroData = storage.loadRetroById(req.params.id);
    }

    if (!retroData) {
      return res.status(404).json({ error: 'Retro not found' });
    }

    const csv = storage.generateCsv(retroData);
    const safeName = retroData.sprintName.replace(/[^a-zA-Z0-9-_]/g, '_');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="retro-${safeName}.csv"`);
    res.send(csv);
  });

  // List past retros
  router.get('/api/retros', (_req: Request, res: Response) => {
    const pastRetros = storage.listPastRetros();
    const active = manager.getPublicSession();
    res.json({ active, pastRetros });
  });

  return router;
}
