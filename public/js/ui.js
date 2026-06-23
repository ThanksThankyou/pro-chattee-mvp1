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

// パネル編集モードに入る（PC・スマホ共通）
function enterEditMode(panel, text, isFinal, panelId) {
  let committed = false;

  const ta = document.createElement('textarea');
  ta.classList.add('panel-edit-textarea');
  ta.value = text;
  panel.replaceWith(ta);
  ta.focus();
  ta.setSelectionRange(ta.value.length, ta.value.length);

  const cleanup = () => {
    document.removeEventListener('touchstart', onOutsideTap, true);
    document.removeEventListener('mousedown',  onOutsideTap, true);
  };

  const commit = () => {
    if (committed) return;
    committed = true;
    cleanup();
    const newText = ta.value.trim() || text;
    const newPanel = makePanel(newText, true, panelId);
    ta.replaceWith(newPanel);
    if (newText !== text) {
      window.dispatchEvent(new CustomEvent('panel:edit', {
        detail: { panelId, newText }
      }));
    }
  };

  // テキストエリア外タップで確定（スマホで blur が発火しない場合の対策）
  const onOutsideTap = (e) => {
    if (e.target !== ta) commit();
  };
  document.addEventListener('touchstart', onOutsideTap, true);
  document.addEventListener('mousedown',  onOutsideTap, true);

  ta.addEventListener('blur', commit);
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing && !e.shiftKey) {
      e.preventDefault();
      commit();
    }
    if (e.key === 'Escape') {
      committed = true;
      cleanup();
      const restored = makePanel(text, isFinal, panelId);
      ta.replaceWith(restored);
    }
  });
}

// パネル本文を生成（PC:ダブルクリック・スマホ:長押しで編集）
function makePanel(text, isFinal, panelId) {
  const panel = document.createElement('div');
  panel.classList.add('panel');
  panel.textContent = text;
  if (!isFinal) panel.classList.add('panel-partial');

  // PC：ダブルクリック
  panel.addEventListener('dblclick', () => {
    enterEditMode(panel, panel.textContent, isFinal, panelId);
  });

  // スマホ：長押し（500ms）
  let pressTimer = null;
  panel.addEventListener('touchstart', () => {
    pressTimer = setTimeout(() => {
      enterEditMode(panel, panel.textContent, isFinal, panelId);
    }, 500);
  }, { passive: true });
  panel.addEventListener('touchend',  () => clearTimeout(pressTimer), { passive: true });
  panel.addEventListener('touchmove', () => clearTimeout(pressTimer), { passive: true });

  return panel;
}

// パネル1件追加
// isSelf=true → 右（自分）、false → 左（相手）
export function addBubble({ text, isSelf = false, senderId = '', isFinal = true, panelId = null }) {
  const area = document.getElementById('chatArea');
  if (!area || !text?.trim()) return;

  if (!panelId) panelId = crypto.randomUUID();

  const wrapper = document.createElement('div');
  wrapper.classList.add('panel-wrapper', isSelf ? 'panel-right' : 'panel-left');
  wrapper.dataset.panelId = panelId;

  const sender = document.createElement('div');
  sender.classList.add('panel-sender');
  sender.textContent = 'ユーザーID:' + senderId;

  const panel = makePanel(text.trim(), isFinal, panelId);

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

// 他端末からの編集を受信してパネルを更新
export function applyEdit(panelId, newText) {
  const wrapper = document.querySelector(`[data-panel-id="${panelId}"]`);
  if (!wrapper) return;
  const panel = wrapper.querySelector('.panel');
  if (panel) {
    panel.textContent = newText;
    scrollToBottom();
  }
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
