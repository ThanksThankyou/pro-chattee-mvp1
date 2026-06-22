// Cloudflare Pages Function
// AmiVoice APIキーを環境変数から安全に返す
// Phase1: 認証なし（フェーズ2でSupabase認証を追加予定）

export async function onRequestGet({ env }) {
  const appKey = env.AMIVOICE_API_KEY;
  if (!appKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ key: appKey }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
