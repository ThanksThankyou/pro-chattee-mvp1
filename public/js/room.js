import { supabase } from './supabaseConfig.js';
import { addBubble } from './ui.js';

let channel = null;
let myUserId = null;

// Realtimeチャンネルに参加してメッセージ受信を開始
export function joinChannel(roomId, userId) {
  myUserId = userId;

  channel = supabase
    .channel(`room:${roomId}`)
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      // 自分が送ったメッセージは表示しない（送信時にすでに表示済み）
      if (payload.senderId === myUserId) return;

      addBubble({
        text:     payload.text,
        senderId: payload.senderId,
        isSelf:   false,
        isFinal:  true,
      });
    })
    .subscribe();
}

// テキストをbroadcast（DBには保存しない・Phase1保存なし設計）
export function broadcastMessage({ text, senderId, isSelf = false }) {
  if (!channel || !text?.trim()) return;

  // 自分の画面には即時表示（送信と同時）
  if (isSelf) {
    addBubble({ text, senderId, isSelf: true, isFinal: true });
  }

  channel.send({
    type:    'broadcast',
    event:   'message',
    payload: {
      text,
      senderId,
      ts: Date.now(),
    },
  });
}

// PCへの招待通知をbroadcast（個人チャンネル経由）
export function sendInvite(targetUserId, roomId, fromUserId) {
  const inviteChannel = supabase.channel(`user:${targetUserId}`);
  inviteChannel.subscribe((status) => {
    if (status !== 'SUBSCRIBED') return;
    inviteChannel.send({
      type:    'broadcast',
      event:   'invite',
      payload: { roomId, fromUserId },
    });
    // 送信後に即チャンネルを閉じる
    setTimeout(() => supabase.removeChannel(inviteChannel), 2000);
  });
}

// チャンネルから退出
export function leaveChannel() {
  if (channel) {
    supabase.removeChannel(channel);
    channel = null;
  }
  myUserId = null;
}

// QRコード用URL生成
export function buildJoinUrl(roomId) {
  return `${location.origin}/room.html?role=guest&id=${roomId}`;
}
