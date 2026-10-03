# Original Clip Studio processing reference

These API handlers, Python transcription code and FFmpeg invocation helper are retained from the uploaded Clip Refit project. They are reference source for the next integration phase, not a running server in this release.

The merged frontend calls the configured processor URL. Without that URL it allows local video preview and explains that transcription/rendering are not connected.

Port the handlers into a dedicated Node.js service with FFmpeg and the Python dependencies. Adjust the original `@/lib/process` imports to the service's file layout. Add account authentication, job ownership authorization, request limits, CORS restricted to the final frontend origin and media expiry/deletion. Do not run unbounded jobs inside the website request worker.


## Video-link input contract
The current frontend supports both uploads and video URLs. It first tries to fetch a direct public video URL in the browser and then sends the resulting binary to the existing `POST /api/process?name=...` upload endpoint. If browser CORS blocks that download, it falls back to `POST /api/process` with JSON `{ "sourceUrl": "https://..." }`. A production processor may implement that JSON form by downloading the public video server-side, applying URL allow/deny rules, size/time limits and SSRF protection, then returning the same `{ jobId, transcript }` response used by file uploads. Web-page URLs such as ordinary YouTube watch pages are not direct video files and need a dedicated, policy-compliant server-side integration before they can be processed.
