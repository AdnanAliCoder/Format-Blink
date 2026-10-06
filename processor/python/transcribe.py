import os,sys,json,wave
from pathlib import Path
import numpy as np
from faster_whisper import WhisperModel

if len(sys.argv)<2:
    print(json.dumps({"error":"audio path required"}));raise SystemExit(1)

audio=sys.argv[1]
progress_path = Path(sys.argv[2]) if len(sys.argv) > 2 else None
profile = sys.argv[3] if len(sys.argv) > 3 else 'fast'
def progress(stage, percent):
    if progress_path:
        temporary = progress_path.with_suffix('.tmp')
        temporary.write_text(json.dumps({'stage': stage, 'progress': percent}), encoding='utf-8')
        temporary.replace(progress_path)

progress('Loading speech model (first use may download model files)', 5)
model=WhisperModel(
    os.environ.get("WHISPER_MODEL", "base" if profile == "fast" else "small"),
    device=os.environ.get("WHISPER_DEVICE","cpu"),
    compute_type=os.environ.get("WHISPER_COMPUTE_TYPE","int8"),
    cpu_threads=max(1, min(8, (os.cpu_count() or 2) - 1))
)
# FFmpeg supplies mono 16 kHz PCM. Pass samples directly: PyAV 19 removed
# metadata_errors used by faster-whisper 1.1.1's file decoder.
with wave.open(audio, "rb") as wav:
    if wav.getnchannels()!=1 or wav.getframerate()!=16000 or wav.getsampwidth()!=2:
        raise ValueError("Expected mono 16 kHz PCM16 audio")
    samples=np.frombuffer(wav.readframes(wav.getnframes()),dtype="<i2").astype(np.float32)/32768.0
progress('Detecting language and speech', 10)
segments,info=model.transcribe(samples,beam_size=1 if profile == 'fast' else 5,
    vad_filter=True,word_timestamps=(profile == 'accurate'),condition_on_previous_text=False)
duration = max(len(samples)/16000, 1)

raw=[]
for s in segments:
    progress(f"Transcribing {min(s.end, duration):.0f} / {duration:.0f} seconds", min(95, int(10 + 85*s.end/duration)))
    words=[]
    for w in (s.words or []):
        words.append({"start":round(float(w.start),3),"end":round(float(w.end),3),"word":w.word.strip()})
    raw.append({"start":round(float(s.start),3),"end":round(float(s.end),3),"text":s.text.strip(),"words":words})

paragraphs=[]
bucket=None
for seg in raw:
    if bucket is None:
        bucket=dict(seg);continue
    gap=seg["start"]-bucket["end"]
    combined=(bucket["text"]+" "+seg["text"]).strip()
    # Natural paragraphing: short pauses stay together; longer pauses/topic-like breaks start a new block.
    if gap < 1.15 and len(combined) <= 180 and seg['end']-bucket['start'] <= 15:
        bucket["text"]=combined
        bucket["end"]=seg["end"]
        bucket["words"].extend(seg["words"])
    else:
        paragraphs.append(bucket);bucket=dict(seg)
if bucket: paragraphs.append(bucket)
for i,p in enumerate(paragraphs,1):p["id"]=i

if not raw:
    raise ValueError('No speech detected. Use manual time ranges or try Accurate mode.')
progress('Transcript ready', 100)
print(json.dumps({"profile":profile,"language":info.language,"language_probability":info.language_probability,"segments":paragraphs},ensure_ascii=False))
