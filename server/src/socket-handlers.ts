import { Server, Socket } from 'socket.io';
import { RetroManager } from './retro-manager';

interface SocketData {
  participantName?: string;
  adminToken?: string;
  retroId?: string;
}

export function setupSocketHandlers(io: Server, manager: RetroManager): void {
  io.on('connection', (socket: Socket) => {
    const data: SocketData = {};

    socket.on('retro:join', ({ retroId, participantName, adminToken }) => {
      const session = manager.getSession();
      if (!session || session.id !== retroId) {
        socket.emit('retro:error', { message: 'Retro not found' });
        return;
      }

      data.retroId = retroId;
      data.participantName = participantName;
      data.adminToken = adminToken;

      // Join the socket room
      socket.join(retroId);

      // Add participant if not already in
      if (!manager.hasParticipant(participantName)) {
        try {
          const isAdmin = manager.isAdmin(adminToken || '');
          const participant = manager.addParticipant(participantName, isAdmin);
          io.to(retroId).emit('retro:participant-joined', participant);
        } catch (err: any) {
          socket.emit('retro:error', { message: err.message });
          return;
        }
      }

      // Send full state to the joining client
      socket.emit('retro:state', manager.getPublicSession());
    });

    socket.on('retro:add-item', ({ text, category }) => {
      if (!data.retroId || !data.participantName) return;
      try {
        const item = manager.addItem(text, data.participantName, category);
        io.to(data.retroId).emit('retro:item-added', item);
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:vote', ({ itemId }) => {
      if (!data.retroId || !data.participantName) return;
      try {
        const votes = manager.vote(itemId, data.participantName);
        io.to(data.retroId).emit('retro:vote-updated', { itemId, votes });
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:unvote', ({ itemId }) => {
      if (!data.retroId || !data.participantName) return;
      try {
        const votes = manager.unvote(itemId, data.participantName);
        io.to(data.retroId).emit('retro:vote-updated', { itemId, votes });
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:change-phase', () => {
      if (!data.retroId || !data.adminToken) return;
      try {
        const newPhase = manager.changePhase(data.adminToken);
        io.to(data.retroId).emit('retro:phase-changed', { phase: newPhase });

        if (newPhase === 'closed') {
          io.to(data.retroId).emit('retro:closed', {
            closedAt: new Date().toISOString()
          });
        }
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:start-timer', ({ duration }) => {
      if (!data.retroId || !data.adminToken) return;
      try {
        const endsAt = manager.startTimer(data.adminToken, duration);
        io.to(data.retroId).emit('retro:timer-started', { endsAt });
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:select-brainstorm-items', ({ itemIds }) => {
      if (!data.retroId || !data.adminToken) return;
      try {
        manager.selectBrainstormItems(data.adminToken, itemIds);
        io.to(data.retroId).emit('retro:brainstorm-items-selected', { itemIds });
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:add-brainstorm-comment', ({ itemId, text }) => {
      if (!data.retroId || !data.participantName) return;
      try {
        const comment = manager.addBrainstormComment(itemId, text, data.participantName);
        io.to(data.retroId).emit('retro:brainstorm-comment-added', comment);
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:add-action-point', ({ text, assignee }) => {
      if (!data.retroId || !data.participantName) return;
      try {
        const actionPoint = manager.addActionPoint(text, assignee, data.participantName);
        io.to(data.retroId).emit('retro:action-point-added', actionPoint);
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('retro:assign-action-point', ({ actionPointId, assignee }) => {
      if (!data.retroId || !data.participantName) return;
      try {
        const actionPoint = manager.assignActionPoint(actionPointId, assignee);
        io.to(data.retroId).emit('retro:action-point-updated', actionPoint);
      } catch (err: any) {
        socket.emit('retro:error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      if (data.retroId && data.participantName) {
        io.to(data.retroId).emit('retro:participant-left', { name: data.participantName });
      }
    });
  });
}
