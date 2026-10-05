// Heavy conversion tools use the cloud service. Clip Studio has its own local URL.
export const DEFAULT_TOOLS_PROCESSOR_URL = 'https://adnanalicoder--format-blink-tools-tools-api.modal.run';

export function resolveToolsProcessor(...values: (string | undefined)[]): string {
  for (const value of values) {
    if (!value?.trim()) continue;
    try {
      const url = new URL(value.trim());
      if (url.protocol !== 'https:' || url.username || url.password ||
          ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) continue;
      url.search = '';
      url.hash = '';
      url.pathname = url.pathname.replace(/\/(?:health|api\/tools(?:\/[^/]+)?)\/?$/, '').replace(/\/+$/, '');
      return url.href.replace(/\/+$/, '');
    } catch { /* Try the next configured cloud endpoint. */ }
  }
  return DEFAULT_TOOLS_PROCESSOR_URL;
}

export function requiredToolCapability(slug: string): string {
  return ({
    'pdf-to-word': 'pdf-word-auto-ocr-v3',
    'pdf-to-excel': 'pdf-excel-auto-ocr-v2',
    'pdf-to-powerpoint': 'pdf-powerpoint-editable-v2',
  } as Record<string, string>)[slug] || '';
}

export async function checkToolsProcessor(base: string, slug: string, signal: AbortSignal): Promise<void> {
  let response: Response;
  try {
    response = await fetch(base + '/health', {
      // Modal scales to zero; allow the container time to start before uploading.
      signal: AbortSignal.any([signal, AbortSignal.timeout(90000)]),
      cache: 'no-store',
    });
  } catch {
    signal.throwIfAborted();
    throw new Error('Format Blink cloud processor could not be reached or is still starting. Please retry shortly. No installation is needed.');
  }
  signal.throwIfAborted();
  if (!response.ok) throw new Error(`Format Blink cloud processor is unavailable (HTTP ${response.status}). Please retry shortly.`);
  const health = await response.json().catch(() => null);
  if (!health?.ok || !Array.isArray(health.tools) || !health.tools.includes(slug)) {
    throw new Error('The connected cloud service does not support this tool. The site administrator needs to check the Tools Processor connection.');
  }
  const capability = requiredToolCapability(slug);
  if (capability && (!Array.isArray(health.capabilities) || !health.capabilities.includes(capability))) {
    throw new Error('Format Blink cloud processor is running an older release. The site administrator must redeploy the Modal tools service. No installation is needed on your device.');
  }
}
