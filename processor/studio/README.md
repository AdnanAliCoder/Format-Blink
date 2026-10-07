# Clip Studio processor

## Free local-PC mode (recommended for ConverToolIn)

Clip Studio can run its heavy work on each user's own Windows PC. The website checks `http://127.0.0.1:8765/health`. If the local service is not running, the Clip Studio page offers `/ConverToolIn-Clip-Processor-Setup.bat`.

The Windows setup installs/configures Python 3.11, FFmpeg, yt-dlp, Faster Whisper and the FastAPI processor, creates a Desktop shortcut, and starts the service bound to loopback only. Users must keep the processor window open while importing long videos, creating transcripts or exporting clips.

Local processing flow:

```
ConverToolIn website -> 127.0.0.1:8765 -> yt-dlp / FFmpeg / Faster Whisper -> transcript + rendered clips
```

Videos and temporary outputs stay under the user's local app-data directory and expire according to `MEDIA_TTL_HOURS`. The local service is not exposed to the LAN because Uvicorn binds to `127.0.0.1`.

## Optional dedicated-server mode

This is the executable backend for long videos. Deploy it separately from the Next.js/Vercel application. It supports uploaded recordings and public YouTube/direct HTTPS video URLs, seekable full-video preview, timestamped transcription, disjoint-section concatenation, platform cropping, captions, text, rectangle/title-bar overlays, mute and MP4 exports.

Build from the repository root:

```sh
docker build -f processor/studio/Dockerfile -t format-blink-studio .
docker run --restart unless-stopped -p 8080:8080 \
  -e ALLOWED_ORIGINS=https://your-format-blink-domain.com \
  -v studio-media:/tmp/format-blink-studio format-blink-studio
```

Use an HTTPS reverse proxy with streaming uploads, sufficient disk, an upload limit of 8 GB or your chosen maximum, and long upload timeouts. Run exactly one Uvicorn worker: jobs are in-process and execute one at a time. The worker returns a task ID immediately after upload; the editor polls status rather than holding a transcription/render request open. A restart loses pending tasks; reimport the video. First transcription downloads the Whisper model. CPU transcription of a three-hour video may take substantial time. Provision CPU/GPU and disk for the expected traffic.

Set **Admin → Integrations → Clip Studio processor URL** to the HTTPS service origin. Do not use the separate tools processor URL. Verify `/health` before saving. On Vercel deployments without persistent settings storage, set the `CLIP_STUDIO_PROCESSOR_URL` environment variable to the service HTTPS origin and redeploy; it fills an empty processor setting. `ALLOWED_ORIGINS` is a comma-separated list of exact website origins (no trailing slash). `MAX_UPLOAD_GB` defaults to 8; `MAX_VIDEO_HOURS` to 3; `MEDIA_TTL_HOURS` to 6. Source recordings and exports are removed after that idle lifetime; the editor's **Delete source & exports** removes them immediately once processing finishes.

Public YouTube import uses yt-dlp with no cookies, no playlists, no live videos and no authentication bypass. Use videos you own or are authorized to edit. YouTube can block downloads from a hosting provider; surface that error and use the original file upload. Keep yt-dlp updated. Watch-page URLs are processed on the server, never assigned directly to an HTML video element.

The opaque 128-bit job ID is a bearer capability for source/exports; do not share it. CORS and an origin check restrict browser mutations, but are not user authentication. Before exposing the processor publicly, restrict ingress/rate/concurrency at your reverse proxy or attach your application authentication. Restrict outbound networking to public addresses at the host firewall too; DNS checks alone cannot protect against rebinding. No paid infrastructure is provisioned by this code.

Endpoints: `POST /api/import` (streamed binary or `{sourceUrl}`), `POST /api/process` (`{jobId}`), `POST /api/render` (`{jobId,ranges,...settings}`), `GET /api/jobs/{taskId}`, ranged `GET /api/source/{jobId}`, `GET /api/download/{jobId}/{file}`, `DELETE /api/source/{jobId}`.

The old `processor/api` TypeScript handlers are historical reference only; the editor now uses this service.
