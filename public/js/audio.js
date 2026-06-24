import { startAmiVoice, sendAudioChunk, stopAmiVoice } from './amivoice.js';

let audioContext = null;
let mediaStream = null;
let scriptProcessor = null;
let isRecording = false;

// PCM16(16kHz)に変換してAmiVoiceへ送信
function float32ToPcm16(float32Array) {
  const buffer = new ArrayBuffer(float32Array.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export async function startRecording(appKey) {
  if (isRecording) return;

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioContext = new AudioContext({ sampleRate: 16000 });

    const source = audioContext.createMediaStreamSource(mediaStream);
    scriptProcessor = audioContext.createScriptProcessor(1024, 1, 1);

    source.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);

    await startAmiVoice(appKey);

    scriptProcessor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);
      const pcm16 = float32ToPcm16(float32);
      sendAudioChunk(pcm16);

      // RMSで発話開始を直接検出してAmiVoiceの認識遅延を補正
      let sumSq = 0;
      for (let i = 0; i < float32.length; i++) sumSq += float32[i] * float32[i];
      if (Math.sqrt(sumSq / float32.length) > 0.01) {
        window.dispatchEvent(new CustomEvent('audio:activity'));
      }
    };

    isRecording = true;
    window.dispatchEvent(new CustomEvent('recording:start'));
  } catch (e) {
    console.error('[audio] startRecording failed:', e);
    throw e;
  }
}

export function stopRecording() {
  if (!isRecording) return;

  stopAmiVoice();

  if (scriptProcessor) {
    scriptProcessor.disconnect();
    scriptProcessor = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }

  isRecording = false;
  window.dispatchEvent(new CustomEvent('recording:stop'));
}

export function getIsRecording() {
  return isRecording;
}
