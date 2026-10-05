import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_TOOLS_PROCESSOR_URL, resolveToolsProcessor, checkToolsProcessor} from '../lib/tools-processor.ts';

test('heavy tools stay in the cloud with missing, invalid, or legacy local settings', () => {
  for (const value of [undefined, '', '  ', 'bad-url', 'http://127.0.0.1:8766', 'https://localhost:8766', 'https://user:secret@example.com']) {
    assert.equal(resolveToolsProcessor(value), DEFAULT_TOOLS_PROCESSOR_URL);
  }
});

test('deployment endpoint takes priority and pasted health URLs normalize to the base', () => {
  assert.equal(resolveToolsProcessor(' https://cloud.example/health/ ', 'https://old.example'), 'https://cloud.example');
  assert.equal(resolveToolsProcessor('', 'https://admin.example/api/tools/pdf-to-word'), 'https://admin.example');
});

const healthy = {ok:true,tools:['pdf-to-word'],capabilities:['pdf-word-clean-layout-v4']};
test('current editable OCR capability succeeds', async t => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, DEFAULT_TOOLS_PROCESSOR_URL + '/health');
    assert.equal(options.cache, 'no-store');
    return Response.json(healthy);
  });
  await checkToolsProcessor(DEFAULT_TOOLS_PROCESSOR_URL, 'pdf-to-word', new AbortController().signal);
});

test('network failure is not misreported as an outdated release', async t => {
  t.mock.method(globalThis, 'fetch', async () => {throw new TypeError('Failed to fetch');});
  await assert.rejects(checkToolsProcessor(DEFAULT_TOOLS_PROCESSOR_URL, 'pdf-to-word', new AbortController().signal), /could not be reached or is still starting/);
});

test('old capability still blocks incompatible editable conversion', async t => {
  t.mock.method(globalThis, 'fetch', async () => Response.json({...healthy, capabilities:['pdf-word-layout-v1']}));
  await assert.rejects(checkToolsProcessor(DEFAULT_TOOLS_PROCESSOR_URL, 'pdf-to-word', new AbortController().signal), /older release/);
});

test('unavailable HTTP response reports its status', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Starting', {status:503}));
  await assert.rejects(checkToolsProcessor(DEFAULT_TOOLS_PROCESSOR_URL, 'pdf-to-word', new AbortController().signal), /HTTP 503/);
});

test('wrong service or non-JSON health response reports configuration issue', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('<html>Login</html>'));
  await assert.rejects(checkToolsProcessor(DEFAULT_TOOLS_PROCESSOR_URL, 'pdf-to-word', new AbortController().signal), /does not support this tool/);
});

test('cancellation retains AbortError', async t => {
  const controller = new AbortController();
  controller.abort();
  t.mock.method(globalThis, 'fetch', async () => {throw controller.signal.reason;});
  await assert.rejects(checkToolsProcessor(DEFAULT_TOOLS_PROCESSOR_URL, 'pdf-to-word', controller.signal), {name:'AbortError'});
});
