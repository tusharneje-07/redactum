#!/usr/bin/env node
import { spawnSync } from 'child_process';
import path from 'path';

// Runs a lightweight python test harness that uses Flask test_client to
// simulate the refine flow (no live server required). Kept intentionally
// minimal so CI can invoke it quickly.
const script = path.join(new URL('..', import.meta.url).pathname, 'run_refine_flow_test.py');
const res = spawnSync('python3', [script], { encoding: 'utf8' });
if (res.error) {
  console.error('Failed to run python test helper:', res.error);
  process.exit(2);
}
process.stdout.write(res.stdout);
process.stderr.write(res.stderr);
process.exit(res.status || 0);
