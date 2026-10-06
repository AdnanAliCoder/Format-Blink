# October 6 Clip Studio and PDF processing update

- Compatible H.264/AAC MP4 uploads are used directly, without rewriting the entire video. Local browser previews keep using the selected file when compatible.
- Transcription remains an explicit button action. Fast mode uses multilingual Whisper base with CPU int8 and greedy decoding; Accurate mode uses small with beam search and word timestamps. `WHISPER_MODEL` still overrides the model. First use downloads model files; repeat transcripts are cached per source/mode.
- The UI shows transcription stage, audio position, percentage and elapsed time. Transcription has a duration-based timeout (5 minutes minimum, 2 hours maximum), instead of silently waiting four hours. An error returns control to manual clipping.
- Crop, captions, text and shapes render in one encoding pass per selected section. Joining sections copies streams. Windows filter paths and UTF-8 output are handled explicitly.
- PDF to Excel detects borderless tables and retains readable non-table pages as text sheets. PDF to Word avoids OCR on short native-text and blank pages; scanned pages still use editable OCR conversion.

Update the Windows Clip Processor by closing its running window and reopening its desktop shortcut; the existing launcher downloads the current worker files. Refresh Clip Studio afterwards. No setup reinstall is required for this update.

The Modal tools service is separate from the website. The existing GitHub workflow deploys it on changes to `processor/tools/**` when Modal Actions credentials are configured. Expected tools health version: `2026-10-06.1`. If deployment fails, run `python -m modal deploy modal_tools.py --strategy rolling` from an authenticated repository checkout, then `python scripts/verify-modal-tools.py`.

Verification: real FFmpeg import/seek/noncontiguous export/crop/captions/text/mute/download tests; transcript-cache and profile-validation checks; native and scanned Word/Excel sample conversions; borderless Excel and sparse Word regression fixtures; TypeScript check. Full Windows execution, the user's original media/PDFs and production speech speed require validation on the actual machine. A broader smoke test passed the relevant Word/Excel cases but could not run unrelated HTML conversion because WeasyPrint is absent from this test environment.

---

# October 5 conversion and indexing update

The Next.js deployment and the Modal tools service are separate deployments. After pulling this commit, deploy the latter from the repository root using an authenticated Modal account:

```sh
python -m pip install modal
python -m modal deploy modal_tools.py
```

Check `https://adnanalicoder--format-blink-tools-tools-api.modal.run/health`: it must include `version: 2026-10-05.4` with capabilities `pdf-word-auto-ocr-v3`, `pdf-excel-auto-ocr-v2` and `pdf-powerpoint-editable-v2`. The website refuses incompatible legacy conversion engines. Heavy tools use the Modal cloud service; visitors do not install the Tools Processor. Only Clip Studio uses the separate local processor.

PDF to Word is now automatic: searchable pages convert directly, while scanned or mixed pages are OCRed without asking the user to choose a mode. Word output keeps editable text and removes page-sized scan screenshots; smaller embedded images are retained when the source exposes them separately. PDF to PowerPoint likewise rebuilds text and embedded images as slide objects instead of rasterizing every page. Complex layouts and Office font substitution can still need small adjustments. PDF to Excel now automatically OCRs scanned pages and groups visually separated text into worksheet cells when native PDF tables are unavailable. HTML conversion no longer silently strips layout when rendering fails. Excel extraction retains table cells, uses wrapped text and usable column widths; it is table extraction, not a visual page replica.

Clip setup checks readiness and opens Studio after startup. Browser local-network permission must be allowed. Windows startup, paths containing spaces, FFmpeg discovery and process cleanup have been repaired. Full Windows installer execution still needs a Windows PC; Linux API tests cover video import, rendering, captions, download and deletion, not the Windows installer or real model transcription.

Sitemap uses valid public routes and normalized origins; About/Contact/admin/account pages are excluded. Icons use the existing brand with square PNG and ICO exports. Google sitelinks and favicon display remain Google's automated decisions. Submit `/sitemap.xml` in Search Console and request homepage recrawl after deployment.

Verification: production Next build/typecheck; converter smoke tests; tools HTTP API; real FFmpeg clip integration; 2-page editable Word fidelity fixture with editable-text validation. Background-removal model and speech model inference were not exercised in this environment.

## Cloud connection repair

- `FORMAT_BLINK_TOOLS_PROCESSOR_URL` (then `TOOLS_PROCESSOR_URL`) takes priority over old saved tool settings. Missing or local tool URLs resolve to the Format Blink Modal endpoint. Clip Studio configuration is separate.
- The health check allows 90 seconds for a cold container and distinguishes connectivity/HTTP errors from a confirmed capability mismatch. Cancellation remains cancellable.
- The previous workflow could finish green while skipping deployment when Modal secrets were missing. It now fails explicitly, then verifies the deployed version and capabilities after a successful deploy.
- For automatic updates, add `MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` in GitHub repository Settings → Secrets and variables → Actions. Rerun **Deploy Modal Tools Processor**. Never put token values in source files or chat.
- Alternatively, from an already authenticated Modal terminal, run `git pull origin main`, then `python -m modal deploy modal_tools.py --strategy rolling`, then `python scripts/verify-modal-tools.py`.
- Routing/health regression checks: `node --test tests/tools-processor.mjs` (Node 22.18+). These mock network responses and do not claim to test live conversions.

