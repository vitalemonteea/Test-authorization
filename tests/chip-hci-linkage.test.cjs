'use strict';

/**
 * 基本信息表单「完整联动」测试（V1 -> V2 迁移：Chip 输入 + HCI 模式）
 *
 * 目标：验证 `测试设备授权平台V2.html` 已恢复 V1 的：
 *  1. 设备ID / 设备SN 多 Chip 输入（#chipContainer / #snChipContainer）
 *  2. window.addChip / window.addSnChip 暴露
 *  3. HCI/SCP 产品线(45/19) applyPlMode 强制模式：
 *     申请类型隐藏、设备ID固定为 DEV-<pl>-AUTO-001 且禁用、硬件信息区显示
 *  4. 非 HCI 产品线：申请类型显示、硬件信息隐藏、设备ID清空可编辑
 *  5. 硬件申请类型下输入设备ID Chip 自动关联借测信息（syncBorrowInfoByDevice）
 *
 * 采用 jsdom 执行页面脚本（runScripts）+ 事件驱动验证行为。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const htmlPath = path.join(__dirname, '..', '测试设备授权平台V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const authorizationRules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

function loadDom() {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => {
    const detail = e && e.detail;
    errors.push(detail ? (detail.message || String(detail)) : e.message);
  });
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    virtualConsole: vc,
    url: 'http://localhost/',
    beforeParse(window) {
      // Tailwind CDN 在 jsdom 中未加载，注入 stub 避免内联 tailwind.config 报错中断脚本
      window.tailwind = { config: {} };
      window.AuthorizationApplicationRules = authorizationRules;
    }
  });
  return { dom, errors };
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function fireChange(el, win) {
  el.dispatchEvent(new win.Event('change', { bubbles: true }));
}

test('设备ID/设备SN 应恢复为多 Chip 输入容器', async () => {
  const { dom } = loadDom();
  const doc = dom.window.document;
  await delay(40);
  assert.ok(doc.getElementById('chipContainer'), '设备ID 应使用 #chipContainer（chip 容器）');
  assert.ok(doc.getElementById('chipInput'), '设备ID 容器应含 #chipInput');
  assert.ok(doc.getElementById('snChipContainer'), '设备SN 应使用 #snChipContainer（chip 容器）');
  assert.ok(doc.getElementById('snChipInput'), '设备SN 容器应含 #snChipInput');
});

test('应暴露 window.addChip / window.addSnChip', async () => {
  const { dom } = loadDom();
  const w = dom.window;
  await delay(40);
  assert.strictEqual(typeof w.addChip, 'function', 'window.addChip 应为函数');
  assert.strictEqual(typeof w.addSnChip, 'function', 'window.addSnChip 应为函数');
});

test('调用 addChip 后设备ID chip 渲染并同步隐藏字段', async () => {
  const { dom } = loadDom();
  const doc = dom.window.document;
  const w = dom.window;
  await delay(40);
  w.addChip('DEV-TEST-001');
  const chips = doc.querySelectorAll('#chipContainer .chip-item');
  assert.ok(chips.length >= 1, 'chipContainer 内应至少渲染 1 个 chip-item（实际 ' + chips.length + '）');
  const texts = Array.from(chips).map((c) => c.textContent);
  assert.ok(texts.some((t) => t.indexOf('DEV-TEST-001') > -1), '应渲染包含 DEV-TEST-001 的 chip');
  const mirror = doc.getElementById('devIdNew');
  assert.ok(mirror && mirror.value.indexOf('DEV-TEST-001') > -1, '隐藏 #devIdNew 应同步设备ID值');
});

test('HCI 产品线(默认45)下：申请类型隐藏、设备ID固定、硬件信息显示', async () => {
  const { dom, errors } = loadDom();
  const doc = dom.window.document;
  await delay(40);
  const pdt = doc.getElementById('planDevTypeFormItem');
  assert.strictEqual(pdt.style.display, 'none', 'HCI 模式下申请类型应隐藏');
  const hw = doc.getElementById('hwInfoSection');
  assert.notStrictEqual(hw.style.display, 'none', 'HCI 模式下硬件信息区应显示');
  const input = doc.getElementById('chipInput');
  assert.strictEqual(input.disabled, true, 'HCI 模式下设备ID 输入应禁用（固定）');
  const chips = doc.querySelectorAll('#chipContainer .chip-item');
  const texts = Array.from(chips).map((c) => c.textContent);
  assert.ok(texts.some((t) => t.indexOf('DEV-45-AUTO-001') > -1), '设备ID 应固定为 DEV-45-AUTO-001');
  assert.strictEqual(errors.length, 0, '运行期间不应有脚本错误（实际 ' + errors.join('|') + '）');
});

test('切换至非 HCI 产品线(22)：申请类型显示、硬件信息隐藏、设备ID清空可编辑', async () => {
  const { dom } = loadDom();
  const doc = dom.window.document;
  const w = dom.window;
  await delay(40);
  const plname = doc.getElementById('plname');
  plname.value = '22';
  fireChange(plname, w);
  await delay(10);
  const pdt = doc.getElementById('planDevTypeFormItem');
  assert.notStrictEqual(pdt.style.display, 'none', '非 HCI 模式下申请类型应显示');
  const hw = doc.getElementById('hwInfoSection');
  assert.strictEqual(hw.style.display, 'none', '非 HCI 模式下硬件信息区应隐藏');
  const input = doc.getElementById('chipInput');
  assert.strictEqual(input.disabled, false, '非 HCI 模式下设备ID 输入应可编辑');
  const chips = doc.querySelectorAll('#chipContainer .chip-item');
  assert.strictEqual(chips.length, 0, '非 HCI 模式下设备ID chip 应被清空');
});

test('硬件申请类型下输入设备ID chip 应自动关联借测信息', async () => {
  const { dom, errors } = loadDom();
  const doc = dom.window.document;
  const w = dom.window;
  await delay(40);
  const plname = doc.getElementById('plname');
  plname.value = '22';
  fireChange(plname, w);
  await delay(10);
  const pdt = doc.getElementById('planDevType');
  pdt.value = '1';
  fireChange(pdt, w);
  await delay(10);
  w.addChip('DEV-45-AUTO-001');
  await delay(10);
  const btNo = doc.getElementById('btNo');
  assert.strictEqual(btNo.value, 'BT20240615001', '应自动填充匹配借测单号（实际 ' + btNo.value + '）');
  const snChips = doc.querySelectorAll('#snChipContainer .chip-item');
  assert.ok(snChips.length >= 1, '应通过 addMany 自动填充该借测单下所有 SN');
  assert.strictEqual(errors.length, 0, '运行期间不应有脚本错误（实际 ' + errors.join('|') + '）');
});
