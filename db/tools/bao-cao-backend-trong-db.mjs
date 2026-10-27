// Chỉ chuyển nơi lưu cache/báo cáo khi chạy backend npm test trong phạm vi db/.
// Không thay SQL, command, đồng hồ, assertion hay mã nguồn backend/security.
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dbDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backendDir = resolve(dbDir, '..', 'backend');
const prefix = process.env.DB_REPORT_PREFIX || '0053';
if (!/^[a-zA-Z0-9-]+$/.test(prefix)) throw new Error('DB_REPORT_PREFIX không hợp lệ');
const outputDir = join(dbDir, `${prefix}-backend-artifacts`);
const cacheDir = join(backendDir, '.du-lieu');
const resultFile = join(backendDir, 'test', 'ket-qua.json');
const remap = (path) => {
  if (typeof path !== 'string') return path;
  const full = resolve(path);
  if (full === resultFile) return join(dbDir, `${prefix}-backend-results.json`);
  if (full === cacheDir || full.startsWith(cacheDir + '/')) return outputDir + full.slice(cacheDir.length);
  return path;
};
for (const method of ['existsSync', 'readFileSync', 'readdirSync', 'writeFileSync', 'mkdirSync']) {
  const original = fs[method];
  fs[method] = (path, ...args) => original(remap(path), ...args);
}
syncBuiltinESMExports();
process.env.AGV_DOC_DIR = join(outputDir, 'tai-lieu');
