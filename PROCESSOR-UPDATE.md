# October 5 conversion and indexing update

The Next.js deployment and the Modal tools service are separate deployments. After pulling this commit, deploy the latter from the repository root using an authenticated Modal account:

```sh
python -m pip install modal
python -m modal deploy modal_tools.py
```

Check `https://adnanalicoder--format-blink-tools-tools-api.modal.run/health`: it must include `version: 2026-10-05.2` and capability `pdf-word-editable-v2`. The website refuses legacy text-only Word conversion; an updated local tools processor is also supported as fallback. Existing local installations should close the processor window and rerun the setup to install updated code/dependencies.

PDF to Word now has one behavior only: reconstruct editable paragraphs, images and tables with pdf2docx. It never embeds complete PDF pages as Word screenshots. Scanned/image-only PDFs must go through OCR PDF first, because there is no selectable text to reconstruct. Complex editable layouts and Office font substitution can still need small adjustments. HTML conversion no longer silently strips layout when rendering fails. Excel extraction retains table cells, uses wrapped text and usable column widths; it is table extraction, not a visual page replica.

Clip setup checks readiness and opens Studio after startup. Browser local-network permission must be allowed. Windows startup, paths containing spaces, FFmpeg discovery and process cleanup have been repaired. Full Windows installer execution still needs a Windows PC; Linux API tests cover video import, rendering, captions, download and deletion, not the Windows installer or real model transcription.

Sitemap uses valid public routes and normalized origins; About/Contact/admin/account pages are excluded. Icons use the existing brand with square PNG and ICO exports. Google sitelinks and favicon display remain Google's automated decisions. Submit `/sitemap.xml` in Search Console and request homepage recrawl after deployment.

Verification: production Next build/typecheck; converter smoke tests; tools HTTP API; real FFmpeg clip integration; 2-page editable Word fidelity fixture with editable-text validation. Background-removal model and speech model inference were not exercised in this environment.
