const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const files = [
  ['测试设备授权平台V2.html', 'index.html'],
  ['logo.jpg', 'logo.jpg'],
  ['authorization-application-rules.js', 'authorization-application-rules.js'],
  ['info-collection-model.js', 'info-collection-model.js'],
  ['info-collection-ui.js', 'info-collection-ui.js'],
  ['info-collection.css', 'info-collection.css'],
  ['info-upload.html', 'info-upload.html'],
  ['info-upload.js', 'info-upload.js'],
  ['operations-dashboard.html', 'operations-dashboard.html'],
  ['operations-dashboard.css', 'operations-dashboard.css'],
  ['operations-dashboard.js', 'operations-dashboard.js'],
  ['operations-dashboard-model.js', 'operations-dashboard-model.js'],
  ['operations-events.js', 'operations-events.js'],
  ['operations-dashboard-mock.js', 'operations-dashboard-mock.js'],
  ['operations-mock-view.js', 'operations-mock-view.js'],
  ['vendor/vue/vue.global.prod.js', 'vendor/vue/vue.global.prod.js'],
  ['vendor/vue/LICENSE', 'vendor/vue/LICENSE'],
  ['vendor/element-plus/index.full.min.js', 'vendor/element-plus/index.full.min.js'],
  ['vendor/element-plus/index.css', 'vendor/element-plus/index.css'],
  ['vendor/element-plus/LICENSE', 'vendor/element-plus/LICENSE'],
];

fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(dist, { recursive: true });

for (const [sourceName, targetName] of files) {
  const source = path.join(root, sourceName);
  if (!fs.existsSync(source)) {
    throw new Error(`Missing build input: ${sourceName}`);
  }
  const target = path.join(dist, targetName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log(`Static build created at ${dist}`);
