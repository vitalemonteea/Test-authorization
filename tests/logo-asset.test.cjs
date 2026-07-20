'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');

const root = path.join(__dirname, '..');
const htmlPath = path.join(root, '测试设备授权平台V2.html');

test('V2 侧边栏引用项目内可用的 JPEG Logo', () => {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const document = new JSDOM(html).window.document;
  const logo = document.querySelector('.sidebar-brand .brand-logo');

  assert.ok(logo, '侧边栏 Logo 元素应存在');
  assert.equal(logo.getAttribute('src'), 'logo.jpg');

  const logoPath = path.join(root, logo.getAttribute('src'));
  assert.equal(fs.existsSync(logoPath), true, 'Logo 文件应随 V2 项目提供');
  const bytes = fs.readFileSync(logoPath);
  assert.ok(bytes.length > 0, 'Logo 文件不应为空');
  assert.deepEqual(Array.from(bytes.subarray(0, 3)), [0xff, 0xd8, 0xff], 'Logo 文件应为有效 JPEG');
});
