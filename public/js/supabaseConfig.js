import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ ChatteePro専用Supabaseプロジェクト
// Supabase管理画面 > Settings > API から取得して設定してください
const SUPABASE_URL = 'https://pcpsocejjfvwtldhrdke.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjcHNvY2VqamZ2d3RsZGhyZGtlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNDQ5NzAsImV4cCI6MjA5NjgyMDk3MH0.0MyZueU_WOQYriOrpnMyLvVF_3D_VH7N2y2pVXo6cWo';

let supabaseTmp = null;
try {
  supabaseTmp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (e) {
  console.error('[supabaseConfig] createClient failed:', e);
}

export const supabase = supabaseTmp;

if (typeof window !== 'undefined') {
  window.supabase = supabase;
}
