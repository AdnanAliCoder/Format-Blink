# ConverToolIn

Combined PDF, image, video and Clip Studio website, using the supplied ConverToolIn icon with a text-based ConverToolIn brand name.

## What is included
- All original browser PDF, image and video tools, with their original conversion engines.
- Four category homepages: `/pdf`, `/image`, `/video`, `/clips`.
- Individual tool routes, guides, format explanations and public information pages.
- Clip Studio uploads and public YouTube/direct-video-link import, full seekable preview, timestamped transcript batch selection, gap-free clip grouping, per-clip crop/text/shape/caption controls and asynchronous batch MP4 export. A processing server must be connected before transcription/rendering can run.
- Persistent demo accounts, administrator settings and activity records.
- Shared header/footer, mobile navigation, persistent light/dark mode, local fonts and supplied branding.
- Consent-controlled GA4 and AdSense integration, sponsor slots, Google verification HTML uploads and meta-token support.
- Editable page titles, descriptions and text, events and social links.
- Public HTML sitemap; XML sitemap includes homepage/category/tool URLs. Legal pages remain accessible.

## Demo account
Email: `admin@formatblink.demo`
Password: `BlinkDemo!2026`

Go to `/login` and select **Use demo account**, then **Log in**. The demo administrator can access `/admin`. The shared account is intentionally for preview only. Ordinary signup creates a member, never an administrator. No email verification or password-reset email service is connected in this phase.

## Current backend
The application uses Cloudflare Workers/D1 for settings, salted PBKDF2 password hashes, hashed opaque sessions and activity records. Sessions use HttpOnly, SameSite=Strict cookies and expire after eight hours. Admin mutations are authorized server-side. Account suspension revokes sessions. Conversion contents and file names are not logged.

Supabase is **not connected yet**. The current database makes the demo functional and persistent. Before a production launch, migrate identity to Supabase Auth, configure the owner's administrator role server-side, remove the shared demo account, configure email verification/recovery and apply Row Level Security. See `SUPABASE-HANDOFF.md`.

## Development
Node.js 22.13+ is required.

```sh
npm ci
npm run prepare:engines
npm run db:generate   # only after changing db/schema.ts
npm run build
```

Apply unapplied local migrations once, in order:

```sh
node ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_amusing_sally_floyd.sql
```

Start with `npm run dev` or `npm start` after building. This source uses Vinext and the supplied Sites/Cloudflare build integration; it is not a drop-in static hosting build. Production hosting applies D1 migrations independently of the local preview.

## Admin workflow
1. **Brand & homepage:** website URL, default metadata, homepage title/subtitle, announcement, contact and file-size limits.
2. **Pages & SEO:** select any page, edit its title, short description and plain-text body. Save changes. Customized homepage text overrides the general homepage text; resetting that page restores the general settings.
3. **Integrations:** save GA4 measurement ID, AdSense publisher ID, Search Console verification file/meta token, and optional Clip Studio processor URL.
4. **Ad placements:** configure each placement as disabled, placeholder, AdSense or sponsor. Desktop side rails display only on wide screens.
5. **Footer & social:** update text and enable individual social URLs.
6. **News & events:** add, edit, publish or remove entries.
7. **User accounts:** inspect member records, suspend/restore or delete. The shared demo admin cannot delete/suspend itself.
8. **Activity records:** inspect or export the most recent 500 records.

## Processing limits
- PDF/image tools process on-device using pdf-lib, PDF.js, canvas and the original format libraries.
- Browser video tools use FFmpeg WebAssembly loaded only when processing starts. They are designed for short videos, not 2–3 hour source recordings. Browser codec, memory and format limitations still apply.
- Clip Studio needs an HTTPS service with the supplied API contract. Supabase itself is not an FFmpeg/transcription worker. The runnable dedicated service is in `processor/studio` with Docker deployment instructions. A live service URL must be configured; source code alone does not provision the processor.
- AdSense needs a valid, approved publisher/site configuration. Saving an ID does not grant Google approval.
- The private preview cannot be crawled by Google. Search Console verification becomes useful after deployment to the final publicly accessible origin.

## Validation
TypeScript and production build checks are run on this source. Local HTTP checks cover page responses, login/signup, role enforcement, settings round-trip, exact Google verification file routing, member suspension/deletion and metadata rendering. Generated-PDF checks passed for merging, page extraction, rotation and watermarking. Interactive browser visual QA and image/video end-to-end conversion tests were not available in this session; those conversion engines were retained from the supplied projects.

## 39 additional tools

The catalogue contains **93 conversion tools: 29 PDF, 35 image and 29 video**, plus Clip Studio. The 39 added tools are included automatically in navigation, search, individual metadata and the tool sitemap.

### Processing priority

ConverToolIn is intentionally **device-first**:

1. **On-device first** — all existing browser tools plus 26 of the 39 added tools run in the user's browser. This keeps conversion CPU/RAM on the user's device and avoids uploading the file.
2. **Dedicated tools processor only when browser processing is not practical** — 13 tools use `processor/tools`: Office conversion, OCR, PDF password operations, HTML-to-PDF, background removal and transcription.
3. **Clip Studio has its own long-media processor** — 2–3 hour video transcription/rendering belongs in the separate Clip Studio processor. Large media is not routed through the ordinary Vercel request path.
4. **Vercel remains the app/control layer** — pages, UI, lightweight APIs and configuration live on Vercel. Heavy file bytes are not intentionally proxied through Vercel Functions.

This means **80 of 93 conversion tools are on-device** (the original 54 plus 26 new browser tools). Only the 13 conversions that need native/AI/document engines require the separate tools processor.

No processor is deployed automatically. Pages requiring it remain visibly unavailable until a processor URL is configured. Files are uploaded only after the user explicitly starts one of those processor tools.

For deployments without a settings database, `toolsProcessorUrl` can temporarily be supplied through `FORMAT_BLINK_CONFIG_JSON`. After the Supabase migration, the same setting can be persisted from Admin.

See [PROCESSING-ARCHITECTURE.md](PROCESSING-ARCHITECTURE.md), [verification results](VERIFICATION-39-TOOLS.md) and [processor deployment notes](processor/tools/README.md).

## Clip Studio long-video service

See [deployment and API instructions](processor/studio/README.md). Run `python tests/clip-studio-api.py` after installing the studio requirements to verify real upload, seeking, noncontiguous rendering, captions, crop, overlays, mute and deletion.
