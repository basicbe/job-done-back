좋아. **로그인/공통(C) 완전 제거**하고, “작업 번호”를 **도크 번호**로 바꾸고, **대형(세트) 2종**(1번 대형: 32~41 / 2번 대형: 22~31) 기준으로 다시 정리해줄게.

---

## 1) MVP 목표와 규칙(로그인 없음)

### 목표

- 관리자(현장 안)가 **도크 번호 버튼**을 누르면
- 신호수(현장 밖) 화면에 **“도크 n 작업 완료”**가 **실시간**으로 뜸
- 신호수는 알림을 **한 번 탭하면 체크(확인 완료)**

### 최소 규칙

- 인증/로그인 없이 **URL로 역할별 페이지 접속**만 한다.
- “누가 확인했는지”는 MVP에선 필요 없음(로그인 없으니 사용자 식별도 없음)
- 대신 “이 알림이 확인 처리됨” 상태만 관리 (전체 공용 체크)

> 즉, MVP는 “개별 신호수별 체크”가 아니라 **해당 도크 완료 알림을 현장 밖에서 확인했다는 ‘공용 체크’** 개념으로 간다.

---

## 2) 페이지(React) 구성: 2페이지

### A. 관리자 페이지 `/admin`

**UI**

- 상단: **대형 선택 토글**

  - `1번 대형 (32~41)`
  - `2번 대형 (22~31)`

- 본문: 선택된 대형의 도크 번호 버튼 그리드

  - 예) 1번 대형 선택 시 `32, 33, ... 41` 버튼만 표시

- 하단: 최근 전송 로그(최근 20개)

**동작**

- 버튼 `23`(예시) 클릭 → 신호수에게 `23 도크 작업 완료` 실시간 전송
- 전송 즉시 관리자 화면에도 로그가 추가됨

### B. 신호수 페이지 `/signal`

**UI**

- 상단: 최신 알림(큰 카드) “도크 n 작업 완료”
- 하단: 알림 리스트 (미확인 우선)
- 각 알림 항목 우측에 체크 상태(미확인/확인)

**동작**

- 알림 탭 → 해당 알림이 **확인(체크)** 상태로 변함
- 확인 상태는 모든 신호수 화면에 동일하게 반영(공용 체크)

---

## 3) “대형(도크 세트)” 정의(고정 규칙)

- **1번 대형:** 도크 번호 `32 ~ 41`
- **2번 대형:** 도크 번호 `22 ~ 31`

프론트에서 버튼을 생성할 때 이 규칙을 사용한다.

---

## 4) 데이터 모델(Supabase) — 로그인 없는 버전

로그인이 없으니 `profiles`, `auth.users`, “누가 체크했는지” 테이블은 제거.

### 4-1. 테이블: `dock_sets` (선택이지만 깔끔해서 추천)

대형 정의를 DB에 넣고 싶으면 사용. (하드코딩도 가능)

- `id` int PK // 1, 2
- `name` text // '1번 대형', '2번 대형'
- `dock_from` int // 32
- `dock_to` int // 41

초기 데이터:

- (1, '1번 대형', 32, 41)
- (2, '2번 대형', 22, 31)

### 4-2. 테이블: `dock_events`

관리자가 “도크 n 작업 완료”를 누른 기록(원본 이벤트)

- `id` uuid PK
- `dock_set_id` int // 1 or 2
- `dock_no` int // 22~31 or 32~41
- `status` text default 'sent' // sent | acked (공용 체크)
- `created_at` timestamptz default now()
- `acked_at` timestamptz nullable

인덱스 추천

- `(dock_set_id, created_at desc)`
- `(dock_no, created_at desc)`

> 공용 체크라서 `status/acked_at`만 있으면 충분.

---

## 5) 권한(RLS) 방향 — 로그인 없을 때의 현실적인 선택지

로그인이 없으면 Supabase의 RLS는 “누구냐”를 구분할 수 없어서,
**DB를 클라이언트에서 직접 쓰게 하면 보안이 사실상 열려버려.**

그래서 MVP 구조는 이렇게 추천:

### 권장 구조(안전/단순)

- **클라이언트(React)는 DB에 직접 쓰지 않음**
- **Socket.IO 서버만 DB에 write** (insert/update)
- React는 Socket으로만 이벤트 주고받음

Supabase는 서버에서 **Service Role Key**로 접근해서 기록/업데이트 수행.

> 이렇게 하면 로그인 없이도 “DB는 서버만 만진다”가 가능해서 안전해.

---

## 6) Socket.IO 이벤트 설계 (로그인 없음 버전)

룸 개념이 필요하면 “현장/프로젝트 id”가 있어야 하는데, 아직 없으니 MVP는 단일 룸으로 가정하거나, URL 쿼리로 `siteKey` 하나만 받아도 됨.
(여기서는 최소로 “단일 현장”으로 작성)

### 이벤트 목록

#### 6-1. 도크 완료 전송(관리자 → 서버 → 신호수)

- `client:dock_done`

  - payload: `{ dockSetId: 1|2, dockNo: number, clientRequestId: string }`

서버 동작:

1. `dock_events`에 insert (status='sent')
2. 모두에게 브로드캐스트

- `server:dock_event_created`

  - payload:

    ```json
    {
      "event": {
        "id": "uuid",
        "dockSetId": 1,
        "dockNo": 32,
        "status": "sent",
        "createdAt": "ISO",
        "ackedAt": null
      }
    }
    ```

#### 6-2. 체크(공용 확인) 처리(신호수 → 서버 → 모두)

- `client:ack_event`

  - payload: `{ eventId: string, clientRequestId: string }`

서버 동작:

1. `dock_events`를 update: `status='acked', acked_at=now()` (이미 acked면 무시)
2. 모두에게 브로드캐스트

- `server:event_acked`

  - payload:

    ```json
    {
      "eventId": "uuid",
      "status": "acked",
      "ackedAt": "ISO"
    }
    ```

#### 6-3. 에러

- `server:error`

  - payload: `{ code: string, message: string, clientRequestId?: string }`

---

## 7) React에서 필요한 데이터 동기화

### 초기 로딩

- 신호수/관리자 페이지 진입 시 서버에 `client:sync` 요청(또는 REST)

  - 서버가 `dock_events` 최신 N개를 읽어서 보내줌

- `client:sync`

  - payload: `{ dockSetId?: 1|2, limit?: number }`

- `server:sync_result`

  - payload: `{ events: [...] }`

### 실시간 반영

- `server:dock_event_created` 받으면 리스트 prepend
- `server:event_acked` 받으면 해당 이벤트 상태 업데이트

---

## 8) MVP 체크리스트(로그인 없는 기준)

### Must

- [ ] 관리자: 대형 선택(1번/2번) + 해당 도크 번호 버튼만 노출
- [ ] 관리자: 버튼 클릭 → “도크 n 작업 완료” 전송/로그
- [ ] 신호수: 실시간 알림 수신
- [ ] 신호수: 탭 1번으로 확인(공용 체크)
- [ ] DB 기록: 이벤트 생성/체크 상태 저장

### Should

- [ ] 재연결 시 최신 이벤트 동기화(sync)
- [ ] 중복 클릭 디바운스 + 서버에서 idempotency 처리(clientRequestId)

---

원하면 바로 다음으로 **(1) Supabase 테이블 생성 SQL**, **(2) Socket.IO 서버 코드 골격(Express + supabase-js service role)**, **(3) React 라우트/컴포넌트 구조**를 “복붙 가능한 코드”로 만들어줄게.
지금은 서버는 Node(Express)로 가는 걸로 작성해도 괜찮지?
