-- =================================================
-- Dock Management System Database Schema
-- Supabase PostgreSQL
-- =================================================

-- =================================================
-- 1. dock_sets 테이블 (선택사항: 대형 정의)
-- =================================================
CREATE TABLE IF NOT EXISTS dock_sets (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    dock_from INTEGER NOT NULL,
    dock_to INTEGER NOT NULL
);

-- 초기 데이터 삽입
INSERT INTO dock_sets (id, name, dock_from, dock_to) VALUES
(1, '1번 대형', 32, 41),
(2, '2번 대형', 22, 31)
ON CONFLICT (id) DO NOTHING;

-- =================================================
-- 2. dock_events 테이블 (필수: 이벤트 기록)
-- =================================================
CREATE TABLE IF NOT EXISTS dock_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dock_set_id INTEGER NOT NULL,
    dock_no INTEGER NOT NULL,
    status TEXT DEFAULT 'sent' CHECK (status IN ('sent', 'acked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    acked_at TIMESTAMPTZ NULL
);

-- =================================================
-- 인덱스 생성 (성능 최적화)
-- =================================================
CREATE INDEX IF NOT EXISTS idx_dock_events_dock_set_created
    ON dock_events(dock_set_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dock_events_dock_no_created
    ON dock_events(dock_no, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dock_events_status
    ON dock_events(status);

-- =================================================
-- RLS (Row Level Security) 설정
-- =================================================

-- dock_sets 테이블 RLS 활성화
ALTER TABLE dock_sets ENABLE ROW LEVEL SECURITY;

-- dock_events 테이블 RLS 활성화
ALTER TABLE dock_events ENABLE ROW LEVEL SECURITY;

-- Service Role Key를 사용하는 백엔드만 접근 가능하도록 정책 설정
-- (실제로는 Supabase 대시보드에서 Service Role Key로만 접근 가능하도록 설정)

-- 모든 작업을 허용하는 정책 (Service Role Key 전용)
CREATE POLICY "Service role can do everything on dock_sets"
    ON dock_sets
    FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role can do everything on dock_events"
    ON dock_events
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- =================================================
-- 유용한 쿼리들 (선택사항)
-- =================================================

-- 최근 이벤트 조회 (동기화용)
-- SELECT * FROM dock_events
-- ORDER BY created_at DESC
-- LIMIT 50;

-- 특정 대형의 최근 이벤트 조회
-- SELECT * FROM dock_events
-- WHERE dock_set_id = 1
-- ORDER BY created_at DESC
-- LIMIT 20;

-- 미확인 이벤트 수 조회
-- SELECT COUNT(*) as unacked_count
-- FROM dock_events
-- WHERE status = 'sent';

-- 오늘의 이벤트 통계
-- SELECT
--     COUNT(*) as total_events,
--     COUNT(CASE WHEN status = 'acked' THEN 1 END) as acked_events,
--     COUNT(CASE WHEN status = 'sent' THEN 1 END) as pending_events
-- FROM dock_events
-- WHERE DATE(created_at) = CURRENT_DATE;

-- =================================================
-- 데이터 정리 쿼리 (필요시 사용)
-- =================================================

-- 오래된 이벤트 삭제 (예: 30일 이상 된 이벤트)
-- DELETE FROM dock_events
-- WHERE created_at < NOW() - INTERVAL '30 days';

-- 모든 데이터 초기화 (개발용)
-- TRUNCATE TABLE dock_events;
-- ALTER SEQUENCE IF EXISTS dock_events_id_seq RESTART WITH 1;