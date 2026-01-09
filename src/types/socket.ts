import { Socket } from 'socket.io';

// 클라이언트에서 서버로 보내는 이벤트
export interface ClientToServerEvents {
  // 도크 완료 이벤트 (관리자 → 서버)
  'client:dock_done': (data: {
    dockSetId: 1 | 2;
    dockNo: number;
    clientRequestId: string;
  }) => void;

  // 이벤트 확인 이벤트 (신호수 → 서버)
  'client:ack_event': (data: {
    eventId: string;
    clientRequestId: string;
  }) => void;

  // 동기화 요청 이벤트
  'client:sync': (data: {
    dockSetId?: 1 | 2;
    limit?: number;
  }) => void;
}

// 서버에서 클라이언트로 보내는 이벤트
export interface ServerToClientEvents {
  // 도크 이벤트 생성 알림 (서버 → 모두)
  'server:dock_event_created': (data: {
    event: DockEvent;
  }) => void;

  // 이벤트 확인 알림 (서버 → 모두)
  'server:event_acked': (data: {
    eventId: string;
    status: 'acked';
    ackedAt: string;
  }) => void;

  // 동기화 응답 (서버 → 요청한 클라이언트)
  'server:sync_result': (data: {
    events: DockEvent[];
  }) => void;

  // 에러 알림
  'server:error': (data: {
    code: string;
    message: string;
    clientRequestId?: string;
  }) => void;
}

// 서버 간 이벤트 (현재 사용하지 않음)
export interface InterServerEvents {
  // 필요한 경우 추가
}

// 소켓 데이터 타입
export interface SocketData {
  // 필요한 경우 추가 (예: 사용자 ID, 역할 등)
}

// 데이터베이스 이벤트 타입
export interface DockEvent {
  id: string;
  dockSetId: 1 | 2;
  dockNo: number;
  status: 'sent' | 'acked';
  createdAt: string;
  ackedAt: string | null;
}

// 도크 세트 타입
export interface DockSet {
  id: 1 | 2;
  name: string;
  dockFrom: number;
  dockTo: number;
}

// 타이핑된 소켓 타입
export type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;