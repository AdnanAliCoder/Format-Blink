# Format Blink tools processor

This separate Python service implements the 13 tools marked `processing: 'server'` in `lib/additional-tools.ts`. The other 26 new tools run entirely in the browser.

## Deploy

Build from this directory on a Docker-capable host (not inside a Vercel function):

```sh
docker build -t formatblink-tools .
docker run --rm --name formatblink-tools \
  --memory=4g --cpus=2 --pids-limit=128 \
  --read-only --tmpfs /tmp:rw,noexec,nosuid,size=2g \
  -p 8080:8080 \
  -e ALLOWED_ORIGINS=https://YOUR-FRONTEND-DOMAIN \
  formatblink-tools
```

Put the service behind HTTPS. Set **Admin → Integrations → Tools processor URL** to that HTTPS origin. This field is separate from the existing Clip Studio processor URL. For deployments without a settings database, add `toolsProcessorUrl` to the existing `FORMAT_BLINK_CONFIG_JSON` object; preserve its other keys.

Check `GET /health`: it returns the 13 supported slugs. `POST /api/tools/{slug}` accepts multipart `file` and JSON-string `settings` and responds with the actual downloadable file. Passwords are sent only in the request body and are never stored in configuration or activity records. The browser does not send account cookies to the processor.

The frontend blocks processing when the URL is absent and discloses the upload before starting. No production processor has been deployed as part of this change.

## Runtime and limits

- 100 MB upload limit, 100 PDF pages, 25-megapixel images; two active jobs per process.
- Whole-job timeout: ten minutes. Individual external commands have shorter timeouts.
- Video transcription: maximum ten minutes per input. Long videos still belong in Clip Studio.
- Temporary input/output/profile files are removed on completion, validation failure, timeout, and download interruption. Container crashes require the host to discard its temporary volume; use an ephemeral `/tmp` as above.
- One Uvicorn worker is intentional: it enforces the in-process concurrency limit.
- Models are downloaded at image build time; runtime Hugging Face downloading is disabled. Default transcription model: multilingual Whisper `small`; `tiny` was used for smoke tests. Model accuracy varies with language and recording quality.
- Restrict incoming traffic/rate limits at your hosting proxy and deny outbound network access from the conversion container after build. CORS is an origin policy, not authentication. The public endpoint intentionally supports anonymous tools.
- LibreOffice runs with a dedicated job profile and macros disabled. HTML conversion uses a resource fetcher that rejects both remote URLs and local files. HTML scripts are not executed.
- Dependencies have their own licenses. Keep dependency license notices when distributing the container.

## Supported conversions

| Input tool | Output behavior |
|---|---|
| PDF to Word | Editable extracted text in DOCX; not original-layout reconstruction |
| Word / Excel / PowerPoint to PDF | LibreOffice rendering; installed fonts and print settings affect layout |
| PDF to Excel | Detected text tables; rejects documents without tables; extracted strings remain literal text |
| PDF to PowerPoint | One rasterized PDF page per slide; slide text is not separately editable |
| OCR PDF | Rasterizes pages, recognizes text, returns a searchable PDF |
| Protect / Unlock PDF | AES-256 protection / decryption with the supplied correct password |
| HTML to PDF | Self-contained uploaded HTML; external assets are blocked |
| Background Remover | U2NetP foreground mask, transparent PNG |
| Image to Text | Tesseract OCR; English, Urdu, Hindi and selected combinations |
| Video to Text | Whisper timestamps plus recognized speech; audio extracted by FFmpeg |

## Local development

Install Python requirements, LibreOffice, Poppler, FFmpeg, Tesseract plus `eng`, `urd`, `hin` language packs, and the system libraries listed in the Dockerfile. Then run:

```sh
python -m pip install -r requirements.txt
ALLOWED_ORIGINS=http://localhost:3000 uvicorn server:app --port 8080
```

The frontend allows `http://localhost` / `http://127.0.0.1` only for local development. Public processor endpoints must use HTTPS.
