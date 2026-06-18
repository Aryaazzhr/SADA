import { useCallback, useRef, useState } from "react";
import { UploadCloud, FileAudio, Loader2 } from "lucide-react";
import { useApp } from "../context/AppContext";

const MAX_BYTES = 25 * 1024 * 1024;

export const UploadZone = ({ onSubmit, busy }) => {
  const { t } = useApp();
  const inputRef = useRef(null);
  const [drag, setDrag] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const handleFiles = useCallback((files) => {
    setError("");
    if (!files || !files.length) return;
    const f = files[0];
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|ogg|webm|aac|flac)$/i.test(f.name)) {
      setError("Invalid audio file");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File too large (max 25 MB)");
      return;
    }
    setFile(f);
  }, []);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    handleFiles(e.dataTransfer.files);
  };

  const submit = async () => {
    if (!file) return;
    // estimate duration via Audio element
    let duration = 0;
    try {
      duration = await new Promise((resolve) => {
        const url = URL.createObjectURL(file);
        const a = new Audio();
        a.preload = "metadata";
        a.src = url;
        a.onloadedmetadata = () => {
          resolve(a.duration || 0);
          URL.revokeObjectURL(url);
        };
        a.onerror = () => resolve(0);
      });
    } catch (e) {
      duration = 0;
    }
    onSubmit?.({
      file,
      filename: file.name,
      durationSeconds: Number(duration?.toFixed?.(2) || 0),
      sizeBytes: file.size,
      mimeType: file.type || null,
      source: "upload",
    });
  };

  return (
    <div data-testid="upload-zone" className="relative">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        data-testid="upload-dropzone"
        className={`group cursor-pointer rounded-3xl border-2 border-dashed transition-all duration-300 p-10 sm:p-14 text-center glass-hover ${
          drag
            ? "border-white/40 bg-white/[0.08]"
            : "border-white/15 hover:border-white/25"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.m4a,.ogg,.webm,.aac,.flac"
          className="hidden"
          data-testid="upload-file-input"
          onChange={(e) => handleFiles(e.target.files)}
        />

        <div className="flex flex-col items-center">
          <div className="relative mb-5 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/10">
            <UploadCloud className="h-7 w-7 text-rose-300" />
            <span className="absolute inset-0 -z-10 rounded-2xl bg-rose-500/20 blur-xl opacity-60" />
          </div>
          <h3 className="font-heading text-xl sm:text-2xl font-medium text-white">
            {drag ? t.upload.drop_active : t.upload.title}
          </h3>
          <p className="mt-2 text-sm text-zinc-400 max-w-md">
            {t.upload.subtitle}
          </p>
          <p className="mt-4 text-[11px] tracking-wider uppercase text-zinc-500">
            {t.upload.formats}
          </p>
        </div>
      </div>

      {file && !busy && (
        <div
          data-testid="upload-selected"
          className="mt-4 flex items-center justify-between glass rounded-2xl p-4"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-center">
              <FileAudio className="h-5 w-5 text-rose-300" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white truncate max-w-[18rem]">
                {file.name}
              </p>
              <p className="text-xs text-zinc-500">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              data-testid="upload-clear-btn"
              type="button"
              onClick={() => setFile(null)}
              className="text-xs text-zinc-400 hover:text-white px-3 py-2 rounded-full border border-white/10"
            >
              {t.record.reset}
            </button>
            <button
              data-testid="upload-analyze-btn"
              type="button"
              onClick={submit}
              className="text-xs font-semibold uppercase tracking-wider px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-white transition-colors"
            >
              {t.record.analyze}
            </button>
          </div>
        </div>
      )}

      {busy && (
        <div className="mt-4 flex items-center gap-3 glass rounded-2xl p-4 text-sm text-zinc-300">
          <Loader2 className="h-4 w-4 animate-spin text-rose-300" />
          {t.upload.analyzing}
        </div>
      )}

      {error && (
        <p data-testid="upload-error" className="mt-3 text-xs text-rose-400">
          {error}
        </p>
      )}
    </div>
  );
};
