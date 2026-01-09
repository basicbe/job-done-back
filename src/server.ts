import { createServer } from 'http';
import { Server } from 'socket.io';
import { CONFIG } from './config';
import { ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData, TypedSocket } from './types/socket';
import { testConnection, DockEventsService } from './database';

// HTTP 서버 생성
const httpServer = createServer();

// Socket.IO 서버 생성 (타입 지정)
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
  cors: {
    origin: CONFIG.CORS_ORIGIN,
    methods: ['GET', 'POST'],
  },
});

// 연결 이벤트 처리
io.on('connection', (socket: TypedSocket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // 연결 해제 이벤트 처리
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });

  // 도크 완료 이벤트 처리 (관리자 → 서버)
  socket.on('client:dock_done', async (data) => {
    try {
      console.log(`📦 Dock done request:`, data);

      // 데이터베이스에 이벤트 생성
      const event = await DockEventsService.createEvent(data.dockSetId, data.dockNo);

      if (!event) {
        socket.emit('server:error', {
          code: 'CREATE_EVENT_FAILED',
          message: 'Failed to create dock event',
          clientRequestId: data.clientRequestId,
        });
        return;
      }

      // 모든 클라이언트에게 이벤트 생성 알림
      io.emit('server:dock_event_created', {
        event,
      });

      console.log(`✅ Dock event created: ${event.id} (Dock ${event.dockNo})`);
    } catch (error) {
      console.error('Error handling dock_done:', error);
      socket.emit('server:error', {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        clientRequestId: data.clientRequestId,
      });
    }
  });

  // 이벤트 확인 이벤트 처리 (신호수 → 서버)
  socket.on('client:ack_event', async (data) => {
    try {
      console.log(`✅ Event ack request:`, data);

      // 데이터베이스에서 이벤트 확인 처리
      const success = await DockEventsService.ackEvent(data.eventId);

      if (!success) {
        socket.emit('server:error', {
          code: 'ACK_EVENT_FAILED',
          message: 'Failed to acknowledge event',
          clientRequestId: data.clientRequestId,
        });
        return;
      }

      // 모든 클라이언트에게 이벤트 확인 알림
      io.emit('server:event_acked', {
        eventId: data.eventId,
        status: 'acked',
        ackedAt: new Date().toISOString(),
      });

      console.log(`✅ Event acknowledged: ${data.eventId}`);
    } catch (error) {
      console.error('Error handling ack_event:', error);
      socket.emit('server:error', {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        clientRequestId: data.clientRequestId,
      });
    }
  });

  // 이벤트 삭제 이벤트 처리 (관리자 → 서버)
  socket.on('client:delete_event', async (data) => {
    try {
      console.log(`🗑️ Event delete request:`, data);

      // 데이터베이스에서 이벤트 삭제 처리
      const success = await DockEventsService.deleteEvent(data.eventId);

      if (!success) {
        socket.emit('server:error', {
          code: 'DELETE_EVENT_FAILED',
          message: 'Failed to delete event',
          clientRequestId: data.clientRequestId,
        });
        return;
      }

      // 모든 클라이언트에게 이벤트 삭제 알림
      io.emit('server:event_deleted', {
        eventId: data.eventId,
      });

      console.log(`🗑️ Event deleted: ${data.eventId}`);
    } catch (error) {
      console.error('Error handling delete_event:', error);
      socket.emit('server:error', {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        clientRequestId: data.clientRequestId,
      });
    }
  });

  // 동기화 이벤트 처리
  socket.on('client:sync', async (data) => {
    try {
      console.log(`🔄 Sync request:`, data);

      // 최근 이벤트 목록 조회
      const events = await DockEventsService.getRecentEvents(data.dockSetId, data.limit);

      // 요청한 클라이언트에게 동기화 결과 전송
      socket.emit('server:sync_result', {
        events,
      });

      console.log(`✅ Synced ${events.length} events for client ${socket.id}`);
    } catch (error) {
      console.error('Error handling sync:', error);
      socket.emit('server:error', {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
    }
  });
});

// 서버 시작
async function startServer() {
  // 데이터베이스 연결 테스트
  const dbConnected = await testConnection();
  if (!dbConnected) {
    console.error('❌ Server startup aborted due to database connection failure');
    process.exit(1);
  }

  httpServer.listen(CONFIG.PORT, () => {
    console.log(`🚀 Socket.IO server running on port ${CONFIG.PORT}`);
    console.log(`📡 CORS enabled for: ${CONFIG.CORS_ORIGIN}`);
    console.log(`🔧 Ready to handle dock management events`);
  });
}

startServer().catch((error) => {
  console.error('❌ Failed to start server:', error);
  process.exit(1);
});