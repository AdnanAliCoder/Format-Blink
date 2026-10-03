import os,sys,json
from faster_whisper import WhisperModel

if len(sys.argv)<2:
    print(json.dumps({"error":"audio path required"}));raise SystemExit(1)

audio=sys.argv[1]
model=WhisperModel(
    os.environ.get("WHISPER_MODEL","small"),
    device=os.environ.get("WHISPER_DEVICE","cpu"),
    compute_type=os.environ.get("WHISPER_COMPUTE_TYPE","int8")
)
segments,info=model.transcribe(audio,beam_size=5,vad_filter=True,word_timestamps=True)

raw=[]
for s in segments:
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
    if gap < 1.15 and len(combined) <= 430:
        bucket["text"]=combined
        bucket["end"]=seg["end"]
        bucket["words"].extend(seg["words"])
    else:
        paragraphs.append(bucket);bucket=dict(seg)
if bucket: paragraphs.append(bucket)
for i,p in enumerate(paragraphs,1):p["id"]=i

print(json.dumps({"language":info.language,"language_probability":info.language_probability,"segments":paragraphs},ensure_ascii=False))
