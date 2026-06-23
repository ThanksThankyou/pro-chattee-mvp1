// ChatteePro UI — パネル表示・スクロール管理

let autoScroll = true;

function scrollToBottom() {
  const area = document.getElementById('chatArea');
  if (!area || !autoScroll) return;
  setTimeout(() => { area.scrollTop = area.scrollHeight; }, 20);
}

// ユーザーが手動スクロールしたら自動スクロールを止める
export function initScrollBehavior() {
  const area = document.getElementById('chatArea');
  if (!area) return;

  let userScrolling = false;
  let timer = null;

  const onUserScroll = () => {
    userScrolling = true;
    clearTimeout(timer);
    timer = setTimeout(() => { userScrolling = false; }, 200);
  };

  area.addEventListener('wheel',     onUserScroll, { passive: true });
  area.addEventListener('touchmove', onUserScroll, { passive: true });

  area.addEventListener('scroll', () => {
    if (!userScrolling) return;
    const distFromBottom = area.scrollHeight - area.scrollTop - area.clientHeight;
    autoScroll = distFromBottom <= 60;
  });
}

// パネル1件追加
// isSelf=true → 右（自分）、false → 左（相手）
export function addBubble({ text, isSelf = false, senderId = '', isFinal = true }) {
  const area = document.getElementById('chatArea');
  if (!area || !text?.trim()) return;

  const wrapper = document.createElement('div');
  wrapper.classList.add('panel-wrapper', isSelf ? 'panel-right' : 'panel-left');

  const sender = document.createElement('div');
  sender.classList.add('panel-sender');
  sender.textContent = 'ユーザーID:' + senderId;

  const panel = document.createElement('div');
  panel.classList.add('panel');
  panel.textContent = text.trim();
  if (!isFinal) panel.classList.add('panel-partial');

  const ts = document.createElement('div');
  ts.classList.add('panel-ts');
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm   = (now.getMonth()+1).toString().padStart(2,'0');
  const dd   = now.getDate().toString().padStart(2,'0');
  const hh   = now.getHours().toString().padStart(2,'0');
  const mi   = now.getMinutes().toString().padStart(2,'0');
  const ss   = now.getSeconds().toString().padStart(2,'0');
  ts.textContent = `${yyyy}/${mm}/${dd} ${hh}:${mi}:${ss}`;

  wrapper.appendChild(sender);
  wrapper.appendChild(panel);
  wrapper.appendChild(ts);
  area.appendChild(wrapper);
  scrollToBottom();

  return wrapper;
}

// 仮パネル（音声認識途中・右側に表示）
let _tempPanel = null;

export function createTempBubble() {
  removeTempBubble();
  const area = document.getElementById('chatArea');
  if (!area) return null;

  const wrapper = document.createElement('div');
  wrapper.classList.add('panel-wrapper', 'panel-right', 'temp-panel');

  const panel = document.createElement('div');
  panel.classList.add('panel', 'panel-partial');
  panel.textContent = '…';

  wrapper.appendChild(panel);
  area.appendChild(wrapper);
  scrollToBottom();

  _tempPanel = wrapper;
  return wrapper;
}

export function updateTempBubble(wrapper, text) {
  if (!wrapper) return;
  const panel = wrapper.querySelector('.panel');
  if (panel && text?.trim()) panel.textContent = text.trim();
  scrollToBottom();
}

export function removeTempBubble() {
  if (_tempPanel?.parentNode) _tempPanel.remove();
  _tempPanel = null;
}

// 録音ボタンの状態切替
export function updateMicButton(isRecording) {
  const btn = document.getElementById('micBtn');
  if (!btn) return;
  if (isRecording) {
    btn.textContent = '■ 停止';
    btn.classList.add('recording');
  } else {
    btn.textContent = '🎤 録音開始';
    btn.classList.remove('recording');
  }
}

// ステータスメッセージ
export function showStatus(message, type = 'info') {
  const el = document.getElementById('statusMsg');
  if (!el) return;
  el.textContent = message;
  el.className = `status-${type}`;
  el.style.display = 'block';
}

export function hideStatus() {
  const el = document.getElementById('statusMsg');
  if (el) el.style.display = 'none';
}
