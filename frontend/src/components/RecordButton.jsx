import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";

// ── WAV encoder (PCM 16-bit, mono, 16 kHz) ─────────────────────────────
const TARGET_SR = 16000;

function encodeWav(samples, sampleRate) {
  // samples: Float32Array, sampleRate: number
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeStr = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true); // subchunk1 size
  view.setUint16(20, 1, true);  // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  // Float32 → Int16
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: "audio/wav" });
}

// Simple downsampler (linear interpolation)
function downsample(buffer, fromRate, toRate) {
  if (fromRate === toRate) return buffer;
  const ratio = fromRate / toRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const pos = i * ratio;
    const idx = Math.floor(pos);
    const frac = pos - idx;
    result[i] = buffer[idx] + (buffer[idx + 1] !== undefined ? frac * (buffer[idx + 1] - buffer[idx]) : 0);
  }
  return result;
}

// ─────────────────────────────────────────────────────────────────────────

export const RecordButton = ({ onSubmit, busy }) => {
  const { t } = useApp();
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState("idle"); // idle | granted | denied
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [blob, setBlob] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);

  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!navigator.mediaDevices) {
      setSupported(false);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") audioCtxRef.current.close();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: TARGET_SR,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,   // let the model see raw audio
          autoGainControl: false,
        },
      });
      streamRef.current = stream;
      setPermission("granted");

      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: TARGET_SR });
      audioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // Use ScriptProcessorNode to capture raw PCM float32 chunks
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      chunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        chunksRef.current.push(new Float32Array(data));
      };

      source.connect(processor);
      processor.connect(ctx.destination); // required for onaudioprocess to fire

      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      setPermission("denied");
    }
  };

  const stop = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    // Disconnect audio nodes
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Combine PCM chunks
    const chunks = chunksRef.current;
    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.length;
    }

    // Downsample to 16 kHz if the AudioContext ran at a different rate
    const ctxRate = audioCtxRef.current?.sampleRate || TARGET_SR;
    const finalSamples = downsample(merged, ctxRate, TARGET_SR);

    // Encode as WAV
    const wavBlob = encodeWav(finalSamples, TARGET_SR);
    setBlob(wavBlob);
    setAudioUrl(URL.createObjectURL(wavBlob));
    setRecording(false);

    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setBlob(null);
    setAudioUrl(null);
    setSeconds(0);
  };

  const analyze = () => {
    if (!blob) return;
    const fname = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.wav`;
    const audioFile = new File([blob], fname, { type: "audio/wav" });
    onSubmit?.({
      file: audioFile,
      filename: fname,
      durationSeconds: seconds,
      sizeBytes: blob.size,
      mimeType: "audio/wav",
      source: "record",
    });
  };

  return (
    <div data-testid="record-zone" className="flex flex-col items-center justify-center py-2">
      {!supported && (
        <p className="text-sm text-zinc-400">Recording is not supported in this browser.</p>
      )}

      <div className="relative mb-4">
        {recording && (
          <span className="absolute inset-0 -m-2 rounded-full border border-rose-500/40 animate-ping" aria-hidden="true" />
        )}
        <button
          data-testid="record-button"
          type="button"
          onClick={recording ? stop : start}
          disabled={!supported || busy}
          className={`relative h-24 w-24 rounded-full flex items-center justify-center transition-all duration-300 ${
            recording
              ? "bg-rose-600 shadow-[0_0_60px_rgba(244,63,94,0.5)]"
              : "bg-rose-600/90 hover:bg-rose-500 shadow-[0_0_40px_rgba(244,63,94,0.35)]"
          } disabled:opacity-50`}
          aria-label={recording ? "Stop recording" : "Start recording"}
        >
          {recording ? (
            <Square className="h-8 w-8 text-white fill-white" />
          ) : (
            <Mic className="h-9 w-9 text-white" />
          )}
        </button>
      </div>

      {recording ? (
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-1 h-8 mb-2" aria-hidden="true">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-rose-400/80 wave-bar"
                style={{
                  height: "100%",
                  animationDelay: `${i * 80}ms`,
                }}
              />
            ))}
          </div>
          <p className="text-xs uppercase tracking-[0.22em] text-rose-300">
            {t.record.live}
          </p>
          <p className="font-mono text-2xl text-white mt-1" data-testid="record-timer">
            {formatTime(seconds)}
          </p>
        </div>
      ) : blob ? (
        <div className="flex flex-col items-center w-full">
          <audio
            data-testid="record-playback"
            src={audioUrl}
            controls
            className="w-full max-w-sm rounded-full bg-white/[0.04] border border-white/10"
          />
          <p className="font-mono text-sm text-zinc-400 mt-2">
            {t.record.duration}: {formatTime(seconds)}
          </p>
          <div className="mt-4 flex gap-2">
            <button
              data-testid="record-reset-btn"
              onClick={reset}
              type="button"
              className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-full border border-white/10"
            >
              {t.record.reset}
            </button>
            <button
              data-testid="record-analyze-btn"
              onClick={analyze}
              type="button"
              disabled={busy}
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full bg-white text-black hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {t.record.analyze}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="font-heading text-base text-white">{t.record.title}</p>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">{t.record.subtitle}</p>
        </div>
      )}

      {permission === "denied" && (
        <p className="mt-3 text-xs text-rose-400" data-testid="record-permission-error">
          {t.record.permission_denied}
        </p>
      )}
    </div>
  );
};

const formatTime = (s) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const r = (s % 60).toString().padStart(2, "0");
  return `${m}:${r}`;
};
