# Verification: 39 additional Format Blink tools

Verified on 2026-10-03 using generated sample documents, images and short videos.

## Result

- 39 new unique tool entries: 17 PDF, 8 image, 14 video.
- Total: 93 conversion tools (29 PDF, 35 image, 29 video). Clip Studio remains separate.
- 93 unique tool URLs in the XML sitemap; new tools use the existing route, metadata, search and category systems.
- TypeScript: pass.
- Production Next.js build with Webpack: pass. Turbopack was blocked by the test environment's subprocess/port restrictions, so its build was not verified here.
- 26 browser-only tools: real file selection → processing → downloaded output, all pass in Chromium 134.
- 13 processor tools: real browser upload → local Python service → downloaded output, all pass.
- Phone-width PDF editor: no horizontal overflow; loaded page preview and editing controls inspected.
- Error checks: absent processor disables processing; wrong PDF password, unknown tool, wrong extension, invalid settings and disallowed origin are rejected.
- Temporary upload/output deletion verified after API responses; response cleanup also runs on download interruption.

## Browser tools tested

| Category | Tools |
|---|---|
| PDF | Compress PDF, PDF Editor, Sign PDF, Crop PDF, Redact PDF, Fill PDF Form, HEIC to PDF |
| Image | Image Upscaler, Watermark Image, SVG to JPG, GIF Compressor, Add Text to Image, Blur Image |
| Video | Merge, Crop, Speed Changer, Rotate, Reverse, Add Subtitles, Add Audio, Loop, Change Aspect Ratio, Video to 9:16, MP4 to MOV, MP4 to AVI, MP4 to MKV |

Independent output checks read PDF text, form values, crop dimensions and page counts; check flattened redaction has no recoverable text/embedded-file payload; verify image dimensions and changed pixels; verify GIF animation; and inspect video geometry, duration, audio and subtitle streams. FFmpeg decoded every generated video to completion.

## Processor tools tested

PDF to Word, Word to PDF, OCR PDF, PDF to Excel, Excel to PDF, PDF to PowerPoint, PowerPoint to PDF, Protect PDF, Unlock PDF, HTML to PDF, Background Remover, Image to Text and Video to Text.

Document fixtures include a two-page text/table PDF, a scanned text PDF, DOCX, XLSX and PPTX files, and HTML. Background removal used U2NetP and produced a PNG containing transparent pixels. Transcription recognized speech in the OpenAI Whisper public JFK test recording, using the multilingual `tiny` model. Docker's default `small` model is not the model used in this test. The Docker image itself was not built in this environment; engines were tested on the installed local runtime.

## Fixes found during testing

- Use PDF.js legacy browser build and matching worker for typed-array compatibility in older Chromium.
- Validate ffprobe JSON rather than assuming its exit code is zero; this WebAssembly core can return -1 with valid output.
- Decode transcription audio through FFmpeg to avoid an incompatible PyAV API.
- Build scripts now automatically prepare PDF/FFmpeg browser assets before deployment.
- Added explicit accessible labels for form values and secondary media uploads.

## Intentional behavior and remaining deployment step

13 tools require the separate service in `processor/tools`. Its production URL is **not configured or deployed by this change**. Those pages show their requirement and disable processing until configured. The other 26 new tools run on the user's device.

Tool-specific limitations are visible in the UI: compression/redaction flatten PDFs; the editor adds text/shapes; signing is a visible typed signature; upscaling resamples pixels; PDF-to-Word extracts text; PDF-to-PowerPoint creates page-image slides; subtitles are selectable MKV tracks. These are functioning, limited implementations, not claims of full desktop-editor or AI-reconstruction equivalence.

These tests establish sample-file correctness, not compatibility with every font, encrypted document variant, codec, language, device, large file or hosting configuration. Production deployment, sustained load and arbitrary-file coverage remain outside this verification.

See `tests/README.md` for reproducible checks and `processor/tools/README.md` for deployment.
