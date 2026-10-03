# Conversion checks

Run from the repository root on Linux, with Node dependencies and the processor system/Python dependencies installed. Test-only dependencies: Python `reportlab`, `httpx`, `pillow-heif`; Node `playwright` plus Chromium. `CHROMIUM_PATH` and `PLAYWRIGHT_MODULE` may point to external test installations.

```sh
python tests/processor-smoke.py
python tests/media-fixtures.py
npm run build -- --webpack
npm start -- --hostname 127.0.0.1
# In another terminal:
node tests/browser-tools.cjs
python tests/verify-outputs.py
python tests/processor-api.py
```

The first test generates synthetic document/image fixtures under `/tmp/formatblink-fixtures`. The browser test writes real downloads to `/tmp/formatblink-results`, validates success states and checks unavailable-processor behavior and mobile overflow. The output test independently reads PDFs/images and probes/decodes every video.

`remote-browser.cjs` tests the 13 remote tools against a second frontend at port 3001 configured with `toolsProcessorUrl=http://127.0.0.1:8080`, and a running tools processor allowing that origin. Supply a short spoken-video fixture as `/tmp/formatblink-fixtures/speech.mp4`. Verification used the OpenAI Whisper repository's public `tests/jfk.flac` fixture remuxed into MP4 and the multilingual `tiny` model.

The backend tests verify Office rendering, OCR, table extraction, encryption/password rejection, MIME types, origin restrictions and temporary-file deletion. They do not test arbitrary documents, all fonts/languages, hosting load, or production deployment.
