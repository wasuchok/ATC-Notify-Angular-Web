import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const packageJsonPath = path.join(rootDir, 'package.json');
const outputPath = path.join(rootDir, 'src', 'assets', 'version-manifest.json');

const packageRaw = await readFile(packageJsonPath, 'utf8');
const packageJson = JSON.parse(packageRaw);
const packageStat = await stat(packageJsonPath);

const manifest = {
  name: String(packageJson?.name ?? ''),
  version: String(packageJson?.version ?? ''),
  packageManager: String(packageJson?.packageManager ?? ''),
  generatedAt: packageStat.mtime.toISOString(),
  dependencies: packageJson?.dependencies ?? {},
  devDependencies: packageJson?.devDependencies ?? {},
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`synced ${path.relative(rootDir, outputPath)}`);
