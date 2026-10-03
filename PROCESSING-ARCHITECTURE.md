# Format Blink processing architecture

## Goal

Keep processing on the user's device whenever it is technically reasonable. Use server compute only for conversions that genuinely require native document engines, OCR/AI models, password-capable PDF tooling, or long-running media processing.

## Tier 1 — On-device browser processing

This is the default path and has the highest priority.

- All original PDF/image/video browser tools.
- 26 of the 39 added tools.
- PDF operations use PDF.js / pdf-lib.
- Image operations use Canvas, HEIC decoding and browser codecs.
- Video operations use FFmpeg WebAssembly.

Files stay in the browser. Vercel serves the application and engine assets, but conversion CPU/RAM is consumed on the user's device.

Current total: **80 of 93 conversion tools**.

## Tier 2 — Dedicated tools processor

Use this only where Tier 1 cannot provide a reliable implementation without materially weakening the tool.

Current processor tools:

- PDF to Word
- Word to PDF
- OCR PDF
- PDF to Excel
- Excel to PDF
- PDF to PowerPoint
- PowerPoint to PDF
- Protect PDF
- Unlock PDF
- HTML to PDF
- Background Remover
- Image to Text / OCR
- Video to Text / Transcription

The implementation is in `processor/tools`.

The browser uploads directly to the configured processor URL. The ordinary Vercel app route is not used as a large-file proxy. Temporary processor files are deleted after the response.

## Tier 3 — Clip Studio long-media processor

Clip Studio is separate from the tools processor because its workload is different.

Use it for:

- 2–3 hour source videos
- transcription of long recordings
- timestamp/segment generation
- caption rendering
- final short-clip rendering
- direct public media URLs that the processor is allowed to fetch

The browser may preview a local file, but long transcription and rendering should run on the dedicated Clip Studio processor.

## Vercel's role

Vercel is the frontend/control plane:

- Next.js pages
- UI and static assets
- browser engine delivery
- lightweight API routes
- future Supabase-backed account/settings integration

Do not make Vercel Functions the default conversion worker for large Office/PDF/video files. This avoids unnecessary server compute and request-payload/runtime pressure.

## Database role (next phase)

Supabase will be added after the processing architecture:

- Auth / signup / login
- profile and admin roles
- persistent site settings
- activity/job metadata if needed

Actual conversion files should not be stored in Postgres. Heavy processor storage should remain temporary/ephemeral with cleanup after completion.

## Privacy rule

The UI must always disclose the processing route:

- **Processed on your device** for Tier 1.
- **Uploaded to the connected processing service** for Tier 2.
- **Clip Studio processor** for long-media jobs.

A local tool must never silently upload a file as a fallback.
