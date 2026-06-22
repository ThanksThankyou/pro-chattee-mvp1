-- ChatteePro Supabase セットアップSQL
-- Supabase管理画面 > SQL Editor で実行してください

-- ===== roomsテーブル =====
-- セッション管理のみ。会話ログは一切保存しない。
CREATE TABLE IF NOT EXISTS rooms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by  uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT now() + INTERVAL '24 hours',
  is_active   boolean DEFAULT true
);

-- ===== Row Level Security =====
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

-- ルーム作成者は自分のルームを管理できる
CREATE POLICY "rooms_owner_all" ON rooms
  FOR ALL
  USING (auth.uid() = created_by);

-- 認証済みユーザーはアクティブなルームを読める（QRコードからの参加用）
CREATE POLICY "rooms_authenticated_read" ON rooms
  FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND is_active = true
    AND expires_at > now()
  );

-- ===== Realtimeを有効化 =====
-- Supabase管理画面 > Database > Replication で rooms テーブルを有効化するか、
-- 以下のコマンドで有効化してください（管理者権限必要）:
-- ALTER PUBLICATION supabase_realtime ADD TABLE rooms;

-- ===== 期限切れルームの自動クリーンアップ（オプション） =====
-- Supabase管理画面 > Edge Functions または pg_cron で定期実行
-- DELETE FROM rooms WHERE expires_at < now() - INTERVAL '7 days';

-- ===== Google OAuthの設定（Supabase管理画面で実施） =====
-- Authentication > Providers > Google を有効化
-- Redirect URL に以下を追加:
-- https://pro.chattee-ai.com/room.html
-- http://localhost:5173/room.html  （ローカル開発用）
