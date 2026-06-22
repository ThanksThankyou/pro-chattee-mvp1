import { supabase } from './supabaseConfig.js';

const SITE_URL = 'https://pro.chattee-ai.com';

function lockBtn(el) {
  if (!el) return () => {};
  const old = { pe: el.style.pointerEvents, op: el.style.opacity };
  el.style.pointerEvents = 'none';
  el.style.opacity = '0.6';
  return () => {
    el.style.pointerEvents = old.pe;
    el.style.opacity = old.op;
  };
}

// Googleログイン
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${SITE_URL}/room.html` },
  });
  if (error) throw error;
}

// ログアウト
export async function signOut() {
  await supabase.auth.signOut();
  location.href = '/';
}

// 現在のセッション取得
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data?.session ?? null;
}

// 認証状態変化の監視
export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback);
}

// index.html用の初期化
export function initLoginPage() {
  const googleBtn = document.getElementById('googleLoginBtn');
  if (!googleBtn) return;

  googleBtn.addEventListener('click', async () => {
    const unlock = lockBtn(googleBtn);
    try {
      await signInWithGoogle();
    } catch (e) {
      alert('Googleログインを開始できませんでした：' + (e?.message || e));
      unlock();
    }
  });

  // すでにログイン済みならルーム画面へ
  getSession().then(session => {
    if (session) location.href = '/room.html';
  });
}
