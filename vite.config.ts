import vinext from "vinext";
import { defineConfig } from "vite";
import { readExecutionProfile } from "./scripts/execution-profile.mjs";

const DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || "00000000-0000-4000-8000-000000000000";
const managedLinux = readExecutionProfile() === "managed-linux";

export default defineConfig(async () => {
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= "false";
  process.env.WRANGLER_SEND_METRICS ??= "false";
  process.env.WRANGLER_WRITE_LOGS ??= "false";
  process.env.WRANGLER_LOG_PATH ??= ".wrangler/logs";
  process.env.WRANGLER_REGISTRY_PATH ??= ".wrangler/dev-registry";
  process.env.MINIFLARE_REGISTRY_PATH ??= ".wrangler/registry";

  const { cloudflare } = await import("@cloudflare/vite-plugin");

  return {
    server: managedLinux ? { host: "0.0.0.0", allowedHosts: true } : undefined,
    plugins: [
      vinext(),
      cloudflare({
        viteEnvironment: { name: "rsc", childEnvironments: ["ssr"] },
        inspectorPort: false,
        config: {
          main: "./build/sites-worker.ts",
          compatibility_flags: ["nodejs_compat"],
          d1_databases: [
            {
              binding: "DB",
              database_name: "format-blink-db",
              database_id: DATABASE_ID,
            },
          ],
        },
      }),
    ],
  };
});
