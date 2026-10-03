# Supabase connection: next phase

This release provides a working demo backend. It does not claim that a Supabase project is connected.

## Existing data contract
- `settings`: one row `id = site`, `value` contains the site configuration JSON.
- `users`: internal ID, email, name, role, account status, creation time and last login.
- `sessions`: hashed random session token, user ID and expiry; replace with Supabase Auth sessions.
- `activity`: ID, actor user ID, action name, short detail and creation timestamp.

Keep site configuration access behind `lib/store.ts` and account authorization behind `lib/auth.ts`. The UI uses `/api/manage`; its public contract can stay stable when replacing the database/auth implementation.

## Migration steps
1. Create the Supabase project and configure production auth redirect URLs.
2. Use Supabase Auth for signup, login, email confirmation and password recovery. Do not import the demo PBKDF2 hashes into Supabase Auth; create the owner and invite real members to set passwords.
3. Map profile IDs to `auth.users.id`. Store server-controlled admin/member roles and active/suspended status in profiles. Do not allow users to edit their own role or status.
4. Create settings and activity tables. Enable RLS: only admins can update site configuration or view global account/activity records. Members may read only their own profile/activity; anonymous readers may read sanitized public configuration.
5. Keep the service-role secret on the server; never put it into a browser bundle or the admin form.
6. Replace session validation with Supabase Auth verification on every protected request. Preserve server-side role checks, mutation origin checks and suspended-account enforcement.
7. Export website settings from the current admin endpoint as the owner, import into the new store and test saves, metadata and Google verification routes.
8. Remove the demo seed and shared login UI. Test member signup, confirmed email, recovery, logout, admin authorization and account suspension.
9. Update final operator/privacy details and configure the final public website origin before Google Search Console or AdSense review.

## Clip processing
Deploy a separate compute service for FFmpeg and Whisper/transcription. Retained original request handlers describe `/api/process`, `/api/render`, `/api/source` and `/api/download` behavior. Add authentication, upload quotas, job ownership checks, explicit CORS allowlisting, private job storage and timed cleanup before public use. Connect its HTTPS URL under Admin → Integrations.
