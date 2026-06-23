import { createTempBubble, updateTempBubble, removeTempBubble, applyEdit } from './ui.js';
import { broadcastMessage, broadcastEdit } from './room.js';

function decodeUnicode(str) {
  try {
    return JSON.parse('"' + str.replace(/"/g, '\\"') + '"');
  } catch {
    return str;
  }
}

// speaker0/1ごとにテキストをまとめる
function buildSpeakerBlocks(tokens) {
  if (!tokens || tokens.length === 0) return [];
  const blocks = [];
  let currentLabel = tokens[0]?.label || 'speaker0';
  let currentText = '';

  for (const t of tokens) {
    const w = decodeUnicode(t.written || t.spoken || '').trim();
    if (!w) continue;
    const label = t.label || currentLabel;
    if (label !== currentLabel) {
      blocks.push({ label: currentLabel, text: currentText });
      currentLabel = label;
      currentText = w;
    } else {
      currentText += w;
    }
  }
  if (currentText) blocks.push({ label: currentLabel, text: currentText });
  return blocks;
}

let ws = null;
let tempBubble = null;

// 同一ユーザーの音声をひとつのパネルに蓄積する
let activePanelId   = null;
let activeText      = '';
let panelResetTimer = null;
const PANEL_RESET_MS = 2000; // 2秒無音でパネルを「閉じる」

function resetActivePanel() {
  activePanelId = null;
  activeText    = '';
}

export async function startAmiVoice(appKey, engine = '-a-general') {
  ws = new WebSocket('wss://acp-api.amivoice.com/v1/nolog/');
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
    // 新しい録音セッション開始時にパネル蓄積をリセット
    clearTimeout(panelResetTimer);
    resetActivePanel();

    const trimmedKey = appKey.trim();
    // ChatteePro Phase1: 話者区別なし（1対1・シンプル設定）
    const wsCmd = `s 16k ${engine} authorization=${trimmedKey} segmenterProperties="powerThreshold=10000 threshold=9000"`;
    ws.send(wsCmd);
    window.dispatchEvent(new CustomEvent('amivoice:start'));
  };

  ws.onmessage = (event) => {
    const msg = event.data.trim();
    let msgType = null;
    let parsed = null;

    if (msg[0] === '{') {
      try { parsed = JSON.parse(msg); msgType = parsed.type || ''; } catch { return; }
    } else if (['U', 'A', 'R'].includes(msg[0])) {
      msgType = msg[0];
      const jsonStart = msg.indexOf('{');
      if (jsonStart === -1) return;
      try { parsed = JSON.parse(msg.substring(jsonStart)); } catch { return; }
    } else {
      return;
    }

    let text = (parsed.text || '').trim().replace(/\.{3,}$/g, '');
    if (!text || /^\.+$/.test(text)) {
      if (msgType !== 'U') removeTempBubble();
      return;
    }

    // 部分認識（U）→ 仮表示
    if (msgType === 'U') {
      if (!tempBubble) tempBubble = createTempBubble();
      updateTempBubble(tempBubble, text);
    }

    // 確定認識（A/R）→ 同一ユーザーのパネルに蓄積、2秒無音で閉じる
    if (msgType === 'A' || msgType === 'R') {
      removeTempBubble();
      tempBubble = null;
      if (!text) return;

      const userId = localStorage.getItem('chattee_user_id') || '';
      clearTimeout(panelResetTimer);

      if (activePanelId) {
        // 既存パネルにテキストを追加して全端末に同期
        activeText += text;
        applyEdit(activePanelId, activeText);
        broadcastEdit({ panelId: activePanelId, newText: activeText });
      } else {
        // 新しいパネルを作成（panelIdを先に確定してから渡す）
        activePanelId = crypto.randomUUID();
        activeText    = text;
        broadcastMessage({ text, senderId: userId, isSelf: true, panelId: activePanelId });
      }

      // 2秒後にパネルを閉じる（次の発言は新しいパネル）
      panelResetTimer = setTimeout(resetActivePanel, PANEL_RESET_MS);
    }
  };

  ws.onerror = () => {
    removeTempBubble();
    window.dispatchEvent(new CustomEvent('amivoice:error'));
  };

  ws.onclose = () => {
    removeTempBubble();
    tempBubble = null;
    // リセットは次回onopen時に行う（瞬断でも蓄積中パネルを維持するため）
    window.dispatchEvent(new CustomEvent('amivoice:stop'));
  };
}

export function sendAudioChunk(chunkArrayBuffer) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    const chunk = new Uint8Array(chunkArrayBuffer);
    const pChunk = new Uint8Array(chunk.length + 1);
    pChunk[0] = 0x70;
    pChunk.set(chunk, 1);
    ws.send(pChunk.buffer);
  }
}

export function stopAmiVoice() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send('e');
    ws.close();
  }
}
