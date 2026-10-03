import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  async fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    if (/^\/google[^/]+\.html$/.test(decodeURIComponent(url.pathname))) {
      const database = (env as any).DB as D1Database | undefined;
      if (!database) return new Response('Unavailable', {status:503});
      const row = await database.prepare('SELECT value FROM settings WHERE id=?').bind('site').first<{value:string}>();
      const config = row ? JSON.parse(row.value) : {};
      if (decodeURIComponent(url.pathname.slice(1)) === config.verificationFileName && config.verificationFileContent) {
        return new Response(config.verificationFileContent, {headers:{'Content-Type':'text/plain; charset=utf-8','X-Content-Type-Options':'nosniff'}});
      }
      return new Response('Not found', {status:404});
    }
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};
