const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const files = [
  ['测试设备授权平台V2.html', 'index.html'],
  ['logo.jpg', 'logo.jpg'],
  ['authorization-application-rules.js', 'authorization-application-rules.js'],
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const [sourceName, targetName] of files) {
  const source = path.join(root, sourceName);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing build input: ${sourceName}`);
  }
  fs.copyFileSync(source, path.join(dist, targetName));
}

console.log(`Static build created at ${dist}`);
