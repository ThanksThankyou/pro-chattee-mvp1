import { addBubble, createTempBubble, updateTempBubble, removeTempBubble } from './ui.js';
import { broadcastMessage } from './room.js';

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

export async function startAmiVoice(appKey, engine = '-a-general') {
  ws = new WebSocket('wss://acp-api.amivoice.com/v1/nolog/');
  ws.binaryType = 'arraybuffer';

  ws.onopen = () => {
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

    // 確定認識（A/R）→ 確定表示 + broadcast
    if (msgType === 'A' || msgType === 'R') {
      removeTempBubble();
      tempBubble = null;

      const tokens = parsed.results?.[0]?.tokens || [];
      const blocks = buildSpeakerBlocks(tokens);

      const userId = localStorage.getItem('chattee_user_id') || '';
      if (blocks.length > 0) {
        for (const block of blocks) {
          addBubble({ text: block.text, senderId: userId, isSelf: true, isFinal: true });
          broadcastMessage({ text: block.text, senderId: userId });
        }
      } else if (text) {
        addBubble({ text, senderId: userId, isSelf: true, isFinal: true });
        broadcastMessage({ text, senderId: userId });
      }
    }
  };

  ws.onerror = () => {
    removeTempBubble();
    window.dispatchEvent(new CustomEvent('amivoice:error'));
  };

  ws.onclose = () => {
    removeTempBubble();
    tempBubble = null;
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
