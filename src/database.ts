import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from './config';
import { DockEvent } from './types/socket';

// Supabase 클라이언트 생성 (서비스 롤 키 사용)
export const supabase: SupabaseClient = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// 데이터베이스 연결 테스트
export async function testConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('dock_events')
      .select('id')
      .limit(1);

    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection error:', error);
    return false;
  }
}

// dock_events 테이블 관련 함수들
export class DockEventsService {
  // 새 이벤트 생성
  static async createEvent(dockSetId: 1 | 2, dockNo: number): Promise<DockEvent | null> {
    try {
      const { data, error } = await supabase
        .from('dock_events')
        .insert({
          dock_set_id: dockSetId,
          dock_no: dockNo,
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create dock event:', error);
        return null;
      }

      return {
        id: data.id,
        dockSetId: data.dock_set_id,
        dockNo: data.dock_no,
        status: data.status,
        createdAt: data.created_at,
        ackedAt: data.acked_at,
      };
    } catch (error) {
      console.error('Error creating dock event:', error);
      return null;
    }
  }

  // 이벤트 확인 처리
  static async ackEvent(eventId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('dock_events')
        .update({
          status: 'acked',
          acked_at: new Date().toISOString(),
        })
        .eq('id', eventId)
        .eq('status', 'sent') // 이미 acked된 것은 업데이트하지 않음
        .select()
        .single();

      if (error) {
        console.error('Failed to ack event:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error acking event:', error);
      return false;
    }
  }

  // 이벤트 목록 조회 (동기화용)
  static async getRecentEvents(dockSetId?: 1 | 2, limit: number = 50): Promise<DockEvent[]> {
    try {
      let query = supabase
        .from('dock_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (dockSetId) {
        query = query.eq('dock_set_id', dockSetId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Failed to fetch events:', error);
        return [];
      }

      return data.map(row => ({
        id: row.id,
        dockSetId: row.dock_set_id,
        dockNo: row.dock_no,
        status: row.status,
        createdAt: row.created_at,
        ackedAt: row.acked_at,
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  // 특정 이벤트 조회
  static async getEventById(eventId: string): Promise<DockEvent | null> {
    try {
      const { data, error } = await supabase
        .from('dock_events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Failed to fetch event:', error);
        return null;
      }

      return {
        id: data.id,
        dockSetId: data.dock_set_id,
        dockNo: data.dock_no,
        status: data.status,
        createdAt: data.created_at,
        ackedAt: data.acked_at,
      };
    } catch (error) {
      console.error('Error fetching event:', error);
      return null;
    }
  }
}