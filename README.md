# Dock Management Backend

실시간 도크 관리 시스템의 백엔드 서버입니다. Socket.IO를 사용하여 관리자와 신호수 간 실시간 통신을 구현합니다.

## 기능

- **실시간 알림**: 관리자가 도크 작업 완료를 누르면 신호수가 즉시 알림을 받음
- **공용 확인**: 신호수가 알림을 확인하면 모든 클라이언트에 반영
- **데이터 동기화**: 재연결 시 최신 이벤트 동기화
- **타입 안전**: TypeScript를 통한 완전한 타입 안전성

## 기술 스택

- **Node.js** + **TypeScript**
- **Socket.IO** (Express 없이 순수 구현)
- **Supabase** (PostgreSQL 데이터베이스)
- **UUID** (고유 식별자 생성)

## 프로젝트 구조

```
src/
├── config.ts          # 환경변수 설정
├── database.ts        # Supabase 클라이언트 및 DB 서비스
├── server.ts          # 메인 서버 파일
└── types/
    └── socket.ts      # Socket.IO 이벤트 타입 정의
```

## 환경변수 설정

프로젝트 루트에 `.env` 파일을 생성하고 다음 변수를 설정하세요:

```env
# 서버 설정
PORT=3001

# Supabase 설정
SUPABASE_URL=your-supabase-project-url
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# CORS 설정 (프론트엔드 URL)
CORS_ORIGIN=http://localhost:3000
```

## Supabase 데이터베이스 설정

다음 테이블을 Supabase에서 생성하세요:

### dock_events 테이블

```sql
CREATE TABLE dock_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dock_set_id INTEGER NOT NULL,
    dock_no INTEGER NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'acked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acked_at TIMESTAMPTZ NULL
);

-- 인덱스
CREATE INDEX idx_dock_events_dock_set_created ON dock_events(dock_set_id, created_at DESC);
CREATE INDEX idx_dock_events_dock_no_created ON dock_events(dock_no, created_at DESC);
```

### dock_sets 테이블 (선택사항)

```sql
CREATE TABLE dock_sets (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    dock_from INTEGER NOT NULL,
    dock_to INTEGER NOT NULL
);

-- 초기 데이터
INSERT INTO dock_sets (id, name, dock_from, dock_to) VALUES
(1, '1번 대형', 32, 41),
(2, '2번 대형', 22, 31);
```

## 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 빌드 후 실행
npm run build
npm start
```

## Socket.IO 이벤트

### 클라이언트 → 서버

#### `client:dock_done`
관리자가 도크 작업 완료를 알릴 때 사용

```typescript
socket.emit('client:dock_done', {
  dockSetId: 1,        // 1 또는 2
  dockNo: 32,          // 도크 번호
  clientRequestId: 'unique-id'  // 중복 방지용
});
```

#### `client:ack_event`
신호수가 알림을 확인할 때 사용

```typescript
socket.emit('client:ack_event', {
  eventId: 'event-uuid',
  clientRequestId: 'unique-id'
});
```

#### `client:sync`
클라이언트가 최신 이벤트를 동기화할 때 사용

```typescript
socket.emit('client:sync', {
  dockSetId: 1,        // 선택사항: 특정 대형만 동기화
  limit: 50            // 선택사항: 최대 이벤트 수
});
```

### 서버 → 클라이언트

#### `server:dock_event_created`
새로운 도크 이벤트가 생성되었을 때 브로드캐스트

```typescript
{
  event: {
    id: "uuid",
    dockSetId: 1,
    dockNo: 32,
    status: "sent",
    createdAt: "2024-01-01T00:00:00.000Z",
    ackedAt: null
  }
}
```

#### `server:event_acked`
이벤트가 확인되었을 때 브로드캐스트

```typescript
{
  eventId: "uuid",
  status: "acked",
  ackedAt: "2024-01-01T00:00:00.000Z"
}
```

#### `server:sync_result`
동기화 요청에 대한 응답

```typescript
{
  events: [/* DockEvent 배열 */]
}
```

#### `server:error`
에러 발생 시 전송

```typescript
{
  code: "ERROR_CODE",
  message: "Error message",
  clientRequestId: "original-request-id"  // 선택사항
}
```

## API 설계 원칙

- **타입 안전성**: 모든 이벤트에 대한 TypeScript 타입 정의
- **에러 처리**: 모든 작업에 대한 적절한 에러 처리 및 로깅
- **중복 방지**: `clientRequestId`를 통한 중복 요청 방지
- **실시간성**: Socket.IO를 통한 즉시 브로드캐스트
- **보안**: Supabase Service Role Key를 통한 서버 전용 DB 접근

## 개발 노트

- Express를 사용하지 않고 순수 Node.js HTTP 서버 + Socket.IO 구현
- Supabase RLS 우회를 위해 Service Role Key 사용
- MVP 요구사항에 따라 로그인/인증 기능 제거
- 공용 체크 개념으로 구현 (개별 사용자 추적 없음)