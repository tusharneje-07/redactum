import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read backend UNIFIED_SYSTEM_MESSAGE from app.py (simple regex)
const backendPath = path.join(__dirname, '..', '..', 'redactum-web', 'app.py');
const frontendPath = path.join(__dirname, '..', 'src', 'config', 'prompts.ts');

const backend = fs.readFileSync(backendPath, 'utf8');
const m = backend.match(/UNIFIED_SYSTEM_MESSAGE\s*=\s*"""([\s\S]*?)"""/m);
if (!m) {
  console.error('Backend UNIFIED_SYSTEM_MESSAGE not found');
  process.exit(2);
}
const backendMsg = m[1].trim().replace(/\r\n/g, '\n');

const frontend = fs.readFileSync(frontendPath, 'utf8');
const fm = frontend.match(/export const UNIFIED_SYSTEM_MESSAGE = `([\s\S]*?)`;/m);
if (!fm) {
  console.error('Frontend UNIFIED_SYSTEM_MESSAGE not found');
  process.exit(2);
}
const frontendMsg = fm[1].trim().replace(/\r\n/g, '\n');

if (backendMsg !== frontendMsg) {
  console.error('UNIFIED_SYSTEM_MESSAGE mismatch between backend and frontend');
  process.exit(1);
}
console.log('UNIFIED_SYSTEM_MESSAGE is in sync');
process.exit(0);
