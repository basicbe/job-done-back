import 'dotenv/config';

export const CONFIG = {
  // 서버 설정
  PORT: parseInt(process.env.PORT || '3001', 10),

  // Supabase 설정
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',

  // CORS 설정 (선택사항)
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
} as const;

// 필수 환경변수 검증
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
const missingVars = requiredEnvVars.filter(key => !CONFIG[key as keyof typeof CONFIG]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('Please set the following environment variables:');
  console.error('- SUPABASE_URL: Your Supabase project URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY: Your Supabase service role key');
  process.exit(1);
}

console.log('✅ Configuration loaded successfully');
console.log(`🚀 Server will run on port ${CONFIG.PORT}`);