import fs from 'fs';
import path from 'path';

const apiRoot = path.resolve(process.cwd());
const repoRoot = path.resolve(apiRoot, '..', '..');
const webEndpointsPath = path.join(repoRoot, 'apps', 'web', 'src', 'api', 'endpoints.js');
const indexRoutesPath = path.join(apiRoot, 'src', 'routes', 'index.routes.js');

function normalizePath(p) {
  if (!p) return p;
  let out = p
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\/:[^/]+/g, '/:param')
    .replace(/\/+/g, '/');
  if (out.length > 1 && out.endsWith('/')) out = out.slice(0, -1);
  return out;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function getWebApiPaths() {
  const src = read(webEndpointsPath);
  const matches = [...src.matchAll(/["'`](\/api\/[^"'`]+)["'`]/g)].map((m) => m[1]);
  const cleaned = matches
    .map((p) => p.replace(/\$\{[^}]+\}/g, ':param'))
    .map(normalizePath)
    .filter((p) => p.startsWith('/api/'));
  return [...new Set(cleaned)].sort();
}

function getApiMountedRoutes() {
  const indexSrc = read(indexRoutesPath);

  const importMap = new Map();
  for (const m of indexSrc.matchAll(/import\s+(\w+)\s+from\s+"([^"]+)";/g)) {
    importMap.set(m[1], m[2]);
  }

  const mounted = [];
  for (const m of indexSrc.matchAll(/router\.use\("([^"]+)",\s*(\w+)\);/g)) {
    mounted.push({ mountPath: m[1], importName: m[2] });
  }

  const out = [];
  for (const r of mounted) {
    const importPath = importMap.get(r.importName);
    if (!importPath) continue;
    const abs = path.resolve(path.dirname(indexRoutesPath), importPath);
    if (!fs.existsSync(abs)) continue;
    const src = read(abs);
    for (const m of src.matchAll(/\br\.(get|post|put|patch|delete)\("([^"]+)"/g)) {
      out.push({
        method: m[1].toUpperCase(),
        path: normalizePath(`${r.mountPath}${m[2]}`),
      });
    }
  }

  return out;
}

const webPaths = getWebApiPaths();
const apiRoutes = getApiMountedRoutes();
const apiPathSet = new Set(apiRoutes.map((r) => r.path));

const missing = webPaths.filter((p) => !apiPathSet.has(p));

console.log('Web endpoint paths:', webPaths.length);
console.log('API mounted route paths:', apiPathSet.size);

if (missing.length) {
  console.log('\nPotential mismatches (web path not mounted in API):');
  for (const p of missing) console.log(`- ${p}`);
  process.exitCode = 1;
} else {
  console.log('\nRoute contract check passed.');
}
