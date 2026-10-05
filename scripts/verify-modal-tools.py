"""Verify the deployed release without importing native conversion dependencies."""
import ast
import json
from pathlib import Path
import time
from urllib.request import urlopen

source = ast.parse(Path('processor/tools/server.py').read_text())
health = next(node for node in source.body if isinstance(node, ast.FunctionDef) and node.name == 'health')
payload = next(node.value for node in health.body if isinstance(node, ast.Return))
expected = {key.value: ast.literal_eval(value) for key, value in zip(payload.keys, payload.values)
            if key.value in ('version', 'capabilities')}
url = 'https://adnanalicoder--format-blink-tools-tools-api.modal.run/health'
for attempt in range(3):
    try:
        with urlopen(url, timeout=45) as response:
            actual = json.load(response)
        if actual.get('ok') is not True or actual.get('mode') != 'server':
            raise RuntimeError('The endpoint is not a healthy cloud processor.')
        if actual.get('version') != expected['version']:
            raise RuntimeError(f"Expected {expected['version']}, received {actual.get('version')}.")
        if not set(expected['capabilities']).issubset(actual.get('capabilities', [])):
            raise RuntimeError('The deployed processor is missing required conversion capabilities.')
        print('Verified Modal Tools Processor:', actual['version'])
        break
    except Exception as error:
        if attempt == 2:
            raise SystemExit(f'Modal deployment verification failed: {error}')
        time.sleep(5)
