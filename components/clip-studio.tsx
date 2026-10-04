"use client";
import { useEffect, useMemo, useRef, useState } from "react";
type Seg = { id: number; start: number; end: number; text: string };
type Range = { start: number; end: number };
type ProcessorData = {
  taskId?: string;
  jobId: string;
  sourceUrl: string;
  duration: number;
  width: number;
  height: number;
  status?: string;
  error?: string;
  detail?: string;
  transcript: { segments: Seg[]; language: string };
  url: string;
};
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Processing failed. Please retry.";
type Clip = {
  id: string;
  title: string;
  ranges: Range[];
  url?: string;
  settings: Settings;
};
type Settings = {
  aspect: string;
  cropX: number;
  cropY: number;
  captions: boolean;
  fontSize: number;
  textColor: string;
  background: boolean;
  backgroundColor: string;
  position: string;
  overlayText: string;
  overlayColor: string;
  overlaySize: number;
  shape: string;
  shapeColor: string;
  mute: boolean;
};
const defaults: Settings = {
  aspect: "9:16",
  cropX: 0.5,
  cropY: 0.5,
  captions: true,
  fontSize: 52,
  textColor: "#ffffff",
  background: true,
  backgroundColor: "#000000",
  position: "bottom",
  overlayText: "",
  overlayColor: "#ffffff",
  overlaySize: 46,
  shape: "none",
  shapeColor: "#000000",
  mute: false,
};
const time = (s: number) =>
  `${Math.floor(s / 3600) ? Math.floor(s / 3600) + ":" : ""}${String(Math.floor(s / 60) % 60).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
const duration = (ranges: Range[]) =>
  ranges.reduce((sum, r) => sum + r.end - r.start, 0);
function mergeRanges(items: Range[]) {
  const result: Range[] = [];
  for (const item of [...items].sort((a, b) => a.start - b.start)) {
    const last = result.at(-1);
    if (last && item.start <= last.end + 0.03)
      last.end = Math.max(last.end, item.end);
    else result.push({ ...item });
  }
  return result;
}
const LOCAL_PROCESSOR_BASE = "http://127.0.0.1:8765";

export default function ClipStudio({
  processorBase = "",
}: {
  processorBase?: string;
}) {
  const configuredBase = processorBase.replace(/\/$/, "");
  const [runtimeBase, setRuntimeBase] = useState("");
  const [processorState, setProcessorState] = useState<"checking" | "connected" | "missing">("checking");
  const base = runtimeBase || configuredBase;
  const [file, setFile] = useState<File | null>(null),
    [link, setLink] = useState(""),
    [source, setSource] = useState(""),
    [jobId, setJobId] = useState(""),
    [seconds, setSeconds] = useState(0),
    [dimensions, setDimensions] = useState({ width: 16, height: 9 });
  const [segments, setSegments] = useState<Seg[]>([]),
    [language, setLanguage] = useState(""),
    [selected, setSelected] = useState<Set<number>>(new Set()),
    [clips, setClips] = useState<Clip[]>([]),
    [activeId, setActiveId] = useState("");
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0),
    [current, setCurrent] = useState(0),
    [manualStart, setManualStart] = useState(0),
    [manualEnd, setManualEnd] = useState(60),
    [batchLength, setBatchLength] = useState(60);
  const video = useRef<HTMLVideoElement>(null),
    local = useRef(""),
    generation = useRef(0),
    mounted = useRef(true),
    part = useRef(0);
  async function checkLocalProcessor() {
    setProcessorState("checking");
    try {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 2200);
      const r = await fetch(LOCAL_PROCESSOR_BASE + "/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      window.clearTimeout(timer);
      const d = await r.json();
      if (!r.ok || !d?.ok) throw new Error("Local processor is not ready.");
      setRuntimeBase(LOCAL_PROCESSOR_BASE);
      setProcessorState("connected");
      setError("");
      setStatus("Local processor connected. Video processing will run on this computer.");
      return true;
    } catch {
      setRuntimeBase("");
      setProcessorState(configuredBase ? "connected" : "missing");
      return false;
    }
  }

  useEffect(() => {
    mounted.current = true;
    void checkLocalProcessor();
    return () => {
      mounted.current = false;
      if (local.current) URL.revokeObjectURL(local.current);
    };
  }, []);
  const active = clips.find((c) => c.id === activeId),
    settings = active?.settings || defaults;
  const selectedRanges = useMemo(
    () => mergeRanges(segments.filter((s) => selected.has(s.id))),
    [segments, selected],
  );
  function update(patch: Partial<Clip>) {
    setClips((all) =>
      all.map((c) =>
        c.id === activeId ? { ...c, ...patch, url: undefined } : c,
      ),
    );
  }
  function style(patch: Partial<Settings>) {
    update({ settings: { ...settings, ...patch } });
  }
  const absolute = (url: string) => (url.startsWith("http") ? url : base + url);
  async function response(r: Response) {
    const raw = await r.text();
    let d: ProcessorData;
    try {
      d = JSON.parse(raw);
    } catch {
      throw new Error(
        `Processor returned HTTP ${r.status}. Check its URL and connection.`,
      );
    }
    if (!r.ok) throw new Error(d.error || d.detail || `HTTP ${r.status}`);
    return d;
  }
  async function request(path: string, body: unknown) {
    return response(
      await fetch(base + path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }
  async function wait(task: ProcessorData, token: number) {
    if (!task.taskId) return task;
    for (;;) {
      if (!mounted.current || token !== generation.current)
        throw new Error("Source changed.");
      const d = await response(await fetch(base + "/api/jobs/" + task.taskId));
      if (d.status === "failed") throw new Error(d.error);
      if (d.status === "ready") return d;
      setStatus(
        d.status === "queued"
          ? "Waiting for the processor…"
          : "Processing video… Long recordings take more time.",
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  function connected() {
    if (base) return true;
    setProcessorState("missing");
    setError(
      "Format Blink Local Processor is not running. Install it on this Windows PC, start it, then click Check again.",
    );
    return false;
  }
  function reset() {
    generation.current++;
    setJobId("");
    setSegments([]);
    setClips([]);
    setSelected(new Set());
    setActiveId("");
    setError("");
    setStatus("");
    setProgress(0);
    setCurrent(0);
    setSeconds(0);
  }
  function choose(f: File | null) {
    if (!f || busy) return;
    reset();
    if (local.current) URL.revokeObjectURL(local.current);
    local.current = URL.createObjectURL(f);
    setFile(f);
    setLink("");
    setSource(local.current);
  }
  async function importVideo() {
    if (!connected() || (!file && !link.trim())) return;
    setBusy(true);
    setError("");
    setStatus(file ? "Uploading video…" : "Importing video link…");
    const token = generation.current;
    try {
      let task;
      if (file) {
        task = await new Promise<ProcessorData>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", base + "/api/import");
          xhr.setRequestHeader(
            "Content-Type",
            file.type || "application/octet-stream",
          );
          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable)
              setProgress(Math.round((e.loaded / e.total) * 100));
          };
          xhr.upload.onload = () =>
            setStatus("Preparing a seekable video preview…");
          xhr.onerror = () =>
            reject(new Error("Upload failed. Check the processor connection."));
          xhr.onload = () => {
            response(
              new Response(xhr.responseText, { status: xhr.status }),
            ).then(resolve, reject);
          };
          xhr.send(file);
        });
      } else {
        const u = new URL(link);
        if (u.protocol !== "https:")
          throw new Error("Use an HTTPS YouTube or direct video link.");
        task = await request("/api/import", { sourceUrl: link.trim() });
      }
      const d = await wait(task, token);
      if (token !== generation.current) return;
      setJobId(d.jobId);
      setSource(absolute(d.sourceUrl));
      setSeconds(d.duration);
      setDimensions({ width: d.width, height: d.height });
      setManualEnd(Math.min(60, d.duration));
      setStatus(
        "Full video ready. Create a transcript or select a time range.",
      );
    } catch (e: unknown) {
      setError(message(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  }
  async function transcribe() {
    if (!jobId || !connected()) return;
    setBusy(true);
    setError("");
    setStatus("Creating timestamped transcript…");
    try {
      const d = await wait(
        await request("/api/process", { jobId }),
        generation.current,
      );
      setSegments(d.transcript.segments);
      setLanguage(d.transcript.language);
      setStatus("Transcript ready. Select sections to make your clips.");
    } catch (e: unknown) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function create(items: Range[][]) {
    const next = items
      .filter((r) => r.length)
      .map((ranges, i) => ({
        id: crypto.randomUUID(),
        title: `Clip ${clips.length + i + 1}`,
        ranges,
        settings: { ...defaults },
      }));
    setClips((all) => [...all, ...next]);
    setSelected(new Set());
    if (next.length) setActiveId(next[0].id);
  }
  function manual() {
    if (!(
      manualStart >= 0 &&
      manualEnd > manualStart &&
      manualEnd <= seconds
    )) {
      setError("Choose start and end times within the video.");
      return;
    }
    create([[{ start: manualStart, end: manualEnd }]]);
  }
  function batches() {
    if (batchLength < 5 || batchLength > 600) return;
    const result: Range[][] = [];
    let bucket: Range[] = [],
      used = 0;
    for (const r of selectedRanges) {
      let at = r.start;
      while (at < r.end - 0.01) {
        const end = Math.min(r.end, at + batchLength - used);
        bucket.push({ start: at, end });
        used += end - at;
        at = end;
        if (used >= batchLength - 0.01) {
          result.push(bucket);
          bucket = [];
          used = 0;
        }
      }
    }
    if (bucket.length) result.push(bucket);
    create(result);
  }
  function seek(s: number) {
    if (video.current) {
      video.current.currentTime = s;
      setCurrent(s);
    }
  }
  async function exportClip(clip: Clip) {
    const s = clip.settings;
    const d = await wait(
      await request("/api/render", {
        jobId,
        ranges: clip.ranges,
        ...s,
        captionStyle: {
          fontSize: s.fontSize,
          textColor: s.textColor,
          background: s.background,
          backgroundColor: s.backgroundColor,
          position: s.position,
        },
      }),
      generation.current,
    );
    setClips((all) =>
      all.map((c) => (c.id === clip.id ? { ...c, url: absolute(d.url) } : c)),
    );
  }
  async function exportClips(all = false) {
    if (!connected() || !jobId || (!active && !all)) return;
    setBusy(true);
    setError("");
    try {
      const targets = all ? clips : active ? [active] : [];
      for (let i = 0; i < targets.length; i++) {
        setStatus(`Exporting ${i + 1} of ${targets.length} clips…`);
        await exportClip(targets[i]);
      }
      setStatus("MP4 export ready. Download your clips below.");
    } catch (e: unknown) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteSource() {
    if (!jobId || busy) return;
    setBusy(true);
    try {
      await response(
        await fetch(base + "/api/source/" + jobId, { method: "DELETE" }),
      );
      reset();
      setSource("");
      setFile(null);
      setLink("");
      setStatus("Source and exported clips deleted from the processor.");
    } catch (e: unknown) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  const ratio =
    settings.aspect === "source"
      ? dimensions.width / dimensions.height
      : Number(settings.aspect.split(":")[0]) /
        Number(settings.aspect.split(":")[1]);
  const captions = segments.find(
    (seg) => current >= seg.start && current < seg.end,
  )?.text;
  return (
    <div className="clip-workspace workspace">
      <div className="container">
        <section className="panel studio">
          <div className="toolbar">
            <div>
              <h2>Clip Studio</h2>
              <p>Long video → transcript → selected clips → MP4</p>
            </div>
            {jobId && (
              <button
                className="btn btn-light"
                disabled={busy}
                onClick={deleteSource}
              >
                Delete source & exports
              </button>
            )}
          </div>
          {!jobId && processorState === "checking" && (
            <div className="notice" role="status">
              Checking for the Format Blink Local Processor…
            </div>
          )}
          {!jobId && processorState === "missing" && !configuredBase && (
            <div className="notice" role="alert" style={{ marginBottom: 18 }}>
              <strong>Local Processor required</strong>
              <p>
                Long-video import, YouTube links, transcription and clip export run on your own Windows PC.
                Install the free Format Blink Local Processor, keep it running while you use Clip Studio, then check the connection again.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a className="btn btn-primary" href="/FormatBlink-Clip-Processor-Setup.bat" download>
                  Download for Windows
                </a>
                <button className="btn btn-light" type="button" onClick={() => void checkLocalProcessor()}>
                  Check again
                </button>
              </div>
              <small>Your source video is processed locally on this computer instead of being uploaded to Format Blink.</small>
            </div>
          )}
          {!jobId && (processorState === "connected" || !!configuredBase) && (
            <div className="video-link-box">
              <label>
                Upload a video (up to 3 hours with the connected processor)
                <input
                  type="file"
                  disabled={busy}
                  accept="video/*,.mkv,.avi"
                  onChange={(e) => choose(e.target.files?.[0] || null)}
                />
              </label>
              <div className="source-divider">
                <span>OR</span>
              </div>
              <label>
                YouTube or direct video link
                <input
                  type="url"
                  disabled={busy}
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={link}
                  onChange={(e) => {
                    reset();
                    setFile(null);
                    setSource("");
                    setLink(e.target.value);
                  }}
                />
              </label>
              <button
                className="btn btn-primary"
                disabled={busy || (!file && !link)}
                onClick={importVideo}
              >
                {busy ? "Preparing video…" : "Load full video"}
              </button>
              {file && progress > 0 && (
                <progress
                  max="100"
                  value={progress}
                  aria-label="Upload progress"
                />
              )}
            </div>
          )}
          {source && (
            <div className="editor-grid" style={{ marginTop: 20 }}>
              <div>
                <div
                  style={{
                    position: "relative",
                    background: "#111",
                    overflow: "hidden",
                    aspectRatio: active
                      ? ratio
                      : dimensions.width / dimensions.height,
                    maxHeight: 600,
                    containerType: "inline-size",
                  }}
                >
                  <video
                    ref={video}
                    key={source + activeId}
                    src={active?.url || source}
                    controls
                    playsInline
                    muted={settings.mute}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: active ? "cover" : "contain",
                      objectPosition: `${settings.cropX * 100}% ${settings.cropY * 100}%`,
                    }}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      if (!jobId) {
                        setSeconds(v.duration);
                        setDimensions({
                          width: v.videoWidth,
                          height: v.videoHeight,
                        });
                      }
                      if (active && !active.url) {
                        part.current = 0;
                        v.currentTime = active.ranges[0].start;
                      }
                    }}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      setCurrent(v.currentTime);
                      if (!active || active.url) return;
                      const r = active.ranges[part.current] || active.ranges[0];
                      if (v.currentTime < r.start - 0.2)
                        v.currentTime = r.start;
                      if (v.currentTime >= r.end) {
                        if (part.current < active.ranges.length - 1) {
                          part.current++;
                          v.currentTime = active.ranges[part.current].start;
                        } else {
                          v.pause();
                          part.current = 0;
                          v.currentTime = active.ranges[0].start;
                        }
                      }
                    }}
                  />
                  {active && !active.url && (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        pointerEvents: "none",
                      }}
                    >
                      {settings.shape !== "none" && (
                        <div
                          style={{
                            position: "absolute",
                            left: "10%",
                            top: "8%",
                            width: "80%",
                            height: settings.shape === "bar" ? "12%" : "25%",
                            background:
                              settings.shape === "outline"
                                ? "transparent"
                                : settings.shapeColor + "99",
                            border:
                              settings.shape === "outline"
                                ? `4px solid ${settings.shapeColor}`
                                : undefined,
                          }}
                        />
                      )}
                      {settings.overlayText && (
                        <div
                          style={{
                            position: "absolute",
                            top: "10%",
                            width: "100%",
                            textAlign: "center",
                            whiteSpace: "pre-wrap",
                            color: settings.overlayColor,
                            fontSize: `${settings.overlaySize / 10}cqw`,
                            lineHeight: 1.2,
                          }}
                        >
                          {settings.overlayText}
                        </div>
                      )}
                      {settings.captions && captions && (
                        <div
                          style={{
                            position: "absolute",
                            left: "5%",
                            width: "90%",
                            textAlign: "center",
                            bottom:
                              settings.position === "bottom"
                                ? "12%"
                                : undefined,
                            top:
                              settings.position === "top"
                                ? "5%"
                                : settings.position === "center"
                                  ? "45%"
                                  : undefined,
                            color: settings.textColor,
                            background: settings.background
                              ? settings.backgroundColor + "bb"
                              : undefined,
                            fontSize: Math.max(14, settings.fontSize / 3),
                            lineHeight: 1.25,
                          }}
                        >
                          {captions}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p>
                  {time(current)} / {time(seconds)}
                  {active &&
                    ` · Selected duration: ${time(duration(active.ranges))}`}
                </p>
                {jobId && (
                  <>
                    <label>
                      Source timeline
                      <input
                        aria-label="Seek source video"
                        type="range"
                        min="0"
                        max={seconds || 1}
                        step=".1"
                        value={Math.min(current, seconds)}
                        disabled={!!active?.url}
                        onChange={(e) => seek(Number(e.target.value))}
                      />
                    </label>
                    <div className="row2">
                      <label>
                        Start (seconds)
                        <input
                          type="number"
                          min="0"
                          max={seconds}
                          step=".1"
                          value={manualStart}
                          onChange={(e) =>
                            setManualStart(Number(e.target.value))
                          }
                        />
                      </label>
                      <button
                        className="btn btn-light"
                        onClick={() => setManualStart(current)}
                      >
                        Use current time as start
                      </button>
                      <label>
                        End (seconds)
                        <input
                          type="number"
                          min="0"
                          max={seconds}
                          step=".1"
                          value={manualEnd}
                          onChange={(e) => setManualEnd(Number(e.target.value))}
                        />
                      </label>
                      <button
                        className="btn btn-light"
                        onClick={() => setManualEnd(current)}
                      >
                        Use current time as end
                      </button>
                    </div>
                    <button
                      className="btn btn-light"
                      disabled={busy}
                      onClick={manual}
                    >
                      Create clip from time range
                    </button>
                    <button
                      className="btn btn-primary"
                      disabled={busy}
                      onClick={transcribe}
                    >
                      {segments.length
                        ? "Recreate transcript"
                        : "Create transcript"}
                    </button>
                  </>
                )}
              </div>
              {active && (
                <div className="panel controls">
                  <label>
                    Clip title
                    <input
                      value={active.title}
                      disabled={busy}
                      onChange={(e) => update({ title: e.target.value })}
                    />
                  </label>
                  <label>
                    Platform / video size
                    <select
                      value={settings.aspect}
                      disabled={busy}
                      onChange={(e) => style({ aspect: e.target.value })}
                    >
                      <option value="source">Original size</option>
                      <option value="9:16">
                        YouTube Shorts / Facebook Reels · 1080 × 1920
                      </option>
                      <option value="16:9">
                        YouTube / Facebook landscape · 1920 × 1080
                      </option>
                      <option value="1:1">Facebook square · 1080 × 1080</option>
                      <option value="4:5">
                        Facebook portrait · 1080 × 1350
                      </option>
                    </select>
                  </label>
                  {(["cropX", "cropY"] as const).map((key) => (
                    <label key={key}>
                      {key === "cropX"
                        ? "Horizontal crop position"
                        : "Vertical crop position"}
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step=".01"
                        disabled={busy}
                        value={settings[key]}
                        onChange={(e) =>
                          style({ [key]: Number(e.target.value) })
                        }
                      />
                    </label>
                  ))}
                  <label>
                    <input
                      type="checkbox"
                      disabled={busy}
                      checked={settings.mute}
                      onChange={(e) => style({ mute: e.target.checked })}
                    />{" "}
                    Mute audio
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      disabled={busy || !segments.length}
                      checked={settings.captions && !!segments.length}
                      onChange={(e) => style({ captions: e.target.checked })}
                    />{" "}
                    Timed captions
                  </label>
                  {settings.captions && segments.length > 0 && (
                    <>
                      <label>
                        Caption size
                        <input
                          type="number"
                          min="20"
                          max="96"
                          value={settings.fontSize}
                          disabled={busy}
                          onChange={(e) =>
                            style({ fontSize: Number(e.target.value) })
                          }
                        />
                      </label>
                      <label>
                        Caption position
                        <select
                          value={settings.position}
                          disabled={busy}
                          onChange={(e) => style({ position: e.target.value })}
                        >
                          {["bottom", "center", "top"].map((x) => (
                            <option key={x}>{x}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Caption color
                        <input
                          type="color"
                          disabled={busy}
                          value={settings.textColor}
                          onChange={(e) => style({ textColor: e.target.value })}
                        />
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          disabled={busy}
                          checked={settings.background}
                          onChange={(e) =>
                            style({ background: e.target.checked })
                          }
                        />{" "}
                        Caption background
                      </label>
                      <label>
                        Background color
                        <input
                          type="color"
                          disabled={busy}
                          value={settings.backgroundColor}
                          onChange={(e) =>
                            style({ backgroundColor: e.target.value })
                          }
                        />
                      </label>
                    </>
                  )}
                  <label>
                    Add text
                    <textarea
                      value={settings.overlayText}
                      disabled={busy}
                      rows={3}
                      onChange={(e) => style({ overlayText: e.target.value })}
                    />
                  </label>
                  <div className="row2">
                    <label>
                      Text color
                      <input
                        type="color"
                        disabled={busy}
                        value={settings.overlayColor}
                        onChange={(e) =>
                          style({ overlayColor: e.target.value })
                        }
                      />
                    </label>
                    <label>
                      Text size
                      <input
                        type="number"
                        min="20"
                        max="100"
                        disabled={busy}
                        value={settings.overlaySize}
                        onChange={(e) =>
                          style({ overlaySize: Number(e.target.value) })
                        }
                      />
                    </label>
                  </div>
                  <label>
                    Add shape
                    <select
                      disabled={busy}
                      value={settings.shape}
                      onChange={(e) => style({ shape: e.target.value })}
                    >
                      <option value="none">No shape</option>
                      <option value="box">Rectangle</option>
                      <option value="bar">Title bar</option>
                      <option value="outline">Rectangle outline</option>
                    </select>
                  </label>
                  <label>
                    Shape color
                    <input
                      type="color"
                      disabled={busy}
                      value={settings.shapeColor}
                      onChange={(e) => style({ shapeColor: e.target.value })}
                    />
                  </label>
                  <p>
                    {active.ranges.length} selected section(s); gaps are
                    removed.
                  </p>
                  {active.ranges.map((r, i) => (
                    <div className="row2" key={i}>
                      <label>
                        Section {i + 1} start
                        <input
                          disabled={busy}
                          type="number"
                          min="0"
                          max={seconds}
                          step=".1"
                          value={r.start}
                          onChange={(e) =>
                            update({
                              ranges: active.ranges.map((x, j) =>
                                j === i
                                  ? { ...x, start: Number(e.target.value) }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        End
                        <input
                          disabled={busy}
                          type="number"
                          min="0"
                          max={seconds}
                          step=".1"
                          value={r.end}
                          onChange={(e) =>
                            update({
                              ranges: active.ranges.map((x, j) =>
                                j === i
                                  ? { ...x, end: Number(e.target.value) }
                                  : x,
                              ),
                            })
                          }
                        />
                      </label>
                    </div>
                  ))}
                  <button
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => exportClips()}
                  >
                    Export this clip
                  </button>
                  {active.url && (
                    <a className="btn btn-primary" href={active.url} download>
                      Download MP4
                    </a>
                  )}
                  <button
                    className="btn btn-light"
                    disabled={busy}
                    onClick={() => setActiveId("")}
                  >
                    Full video preview
                  </button>
                </div>
              )}
            </div>
          )}
          {status && <p role="status">{status}</p>}
          {error && (
            <div role="alert" className="notice" style={{ color: "#b42318" }}>
              {error}
            </div>
          )}
          {segments.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <div className="toolbar">
                <div>
                  <h3>Transcript · {language.toUpperCase()}</h3>
                  <p>
                    {selected.size} paragraphs selected ·{" "}
                    {time(duration(selectedRanges))}
                  </p>
                </div>
                <div>
                  <button
                    className="btn btn-light"
                    disabled={busy}
                    onClick={() =>
                      setSelected(new Set(segments.map((s) => s.id)))
                    }
                  >
                    Select all
                  </button>
                  <button
                    className="btn btn-light"
                    disabled={busy}
                    onClick={() => setSelected(new Set())}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                  marginBottom: 12,
                }}
              >
                <button
                  className="btn btn-primary"
                  disabled={busy || !selected.size}
                  onClick={() => create([selectedRanges])}
                >
                  Combine selected sections
                </button>
                <button
                  className="btn btn-light"
                  disabled={busy || !selected.size}
                  onClick={() =>
                    create(
                      segments
                        .filter((s) => selected.has(s.id))
                        .map((s) => [{ start: s.start, end: s.end }]),
                    )
                  }
                >
                  One clip per paragraph
                </button>
                <label>
                  Batch clip duration (seconds)
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={batchLength}
                    onChange={(e) => setBatchLength(Number(e.target.value))}
                  />
                </label>
                <button
                  className="btn btn-light"
                  disabled={
                    busy ||
                    !selected.size ||
                    batchLength < 5 ||
                    batchLength > 600
                  }
                  onClick={batches}
                >
                  Create batches
                </button>
              </div>
              <div
                className="transcript-list"
                style={{ maxHeight: 480, overflowY: "auto" }}
              >
                {segments.map((seg) => (
                  <div
                    className={`segment ${selected.has(seg.id) ? "selected" : ""}`}
                    key={seg.id}
                  >
                    <input
                      type="checkbox"
                      aria-label={`Select paragraph at ${time(seg.start)}`}
                      disabled={busy}
                      checked={selected.has(seg.id)}
                      onChange={() =>
                        setSelected((old) => {
                          const n = new Set(old);
                          if (n.has(seg.id)) n.delete(seg.id);
                          else n.add(seg.id);
                          return n;
                        })
                      }
                    />
                    <button
                      className="btn btn-light time"
                      disabled={!!active?.url}
                      onClick={() => {
                        setActiveId("");
                        setTimeout(() => seek(seg.start), 0);
                      }}
                    >
                      {time(seg.start)}–{time(seg.end)}
                    </button>
                    <span dir="auto">{seg.text}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
          {clips.length > 0 && (
            <section style={{ marginTop: 24 }}>
              <div className="toolbar">
                <h3>{clips.length} clips</h3>
                <button
                  className="btn btn-primary"
                  disabled={busy}
                  onClick={() => exportClips(true)}
                >
                  Export all clips
                </button>
              </div>
              <div
                className="cards"
                style={{
                  gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
                }}
              >
                {clips.map((c) => (
                  <article className="card" key={c.id}>
                    <h3>{c.title}</h3>
                    <p>
                      {time(duration(c.ranges))} · {c.ranges.length} sections ·{" "}
                      {c.settings.aspect}
                    </p>
                    <button
                      className="btn btn-light"
                      disabled={busy}
                      onClick={() => {
                        part.current = 0;
                        setActiveId(c.id);
                      }}
                    >
                      Preview & edit
                    </button>
                    <button
                      className="btn btn-danger"
                      disabled={busy}
                      onClick={() => {
                        setClips((all) => all.filter((x) => x.id !== c.id));
                        if (activeId === c.id) setActiveId("");
                      }}
                    >
                      Remove
                    </button>
                    {c.url && (
                      <>
                        <video
                          controls
                          playsInline
                          src={c.url}
                          style={{ width: "100%", marginTop: 12 }}
                        />
                        <a className="btn btn-primary" href={c.url} download>
                          Download MP4
                        </a>
                      </>
                    )}
                  </article>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
