'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

const rulesPath = path.join(__dirname, '..', 'authorization-application-rules.js');
const rules = fs.existsSync(rulesPath) ? require(rulesPath) : {};
const htmlPath = path.join(__dirname, '..', '测试设备授权平台V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function waitFor(condition, window, timeoutMs = 500) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    function check() {
      if (condition()) return resolve();
      if (Date.now() >= deadline) return reject(new Error('等待页面状态更新超时'));
      window.setTimeout(check, 0);
    }
    check();
  });
}

test('产品生命周期规则仅将 WOC 标记为已退市', () => {
  assert.equal(typeof rules.getProductStatus, 'function');
  assert.equal(rules.getProductStatus(6), 'retired');
  assert.equal(rules.getProductStatus(27), 'active');
});

test('产品线下拉按在售和退市分区，WOC 位于底部且保持可选', () => {
  const { dom, document, errors } = loadV2Dom();
  try {
    const list = document.querySelector('[data-select-id="plname"] .custom-select-list');
    const activeGroup = list.querySelector('[data-product-group="active"]');
    const retiredGroup = list.querySelector('[data-product-group="retired"]');
    const woc = list.querySelector('[data-value="6"]');
    const abdi = list.querySelector('[data-value="27"]');
    const nativeSelect = document.getElementById('plname');
    const nativeActiveGroup = nativeSelect.querySelector('optgroup[label="在售产品"]');
    const nativeRetiredGroup = nativeSelect.querySelector('optgroup[label="已退市产品"]');
    const nativeWoc = document.querySelector('#plname option[value="6"]');
    const nativeAbdi = document.querySelector('#plname option[value="27"]');

    assert.ok(activeGroup, '应存在在售产品分组');
    assert.equal(activeGroup.querySelector('.product-select-group-name').textContent.trim(), '在售产品');
    assert.equal(activeGroup.nextElementSibling, abdi, 'aBDI 应紧跟在售产品分组');
    assert.ok(retiredGroup, '应存在退市产品分组');
    assert.equal(retiredGroup.querySelector('.product-select-group-name').textContent.trim(), '已退市产品');
    assert.equal(retiredGroup.nextElementSibling, woc, 'WOC 应紧跟退市分组');
    assert.equal(list.lastElementChild, woc, '退市分组及 WOC 应位于列表底部');
    assert.ok(abdi.compareDocumentPosition(retiredGroup) & 4, 'aBDI 应位于退市分组之前');
    assert.ok(woc.classList.contains('retired-product-option'));
    assert.equal(woc.querySelector('.product-retired-badge').textContent.trim(), '已退市');
    assert.ok(nativeActiveGroup, '原生产品线下拉应存在在售 optgroup');
    assert.ok(nativeRetiredGroup, '原生产品线下拉应存在退市 optgroup');
    assert.equal(nativeRetiredGroup.dataset.productGroup, 'retired');
    assert.equal(nativeRetiredGroup.querySelector('option[value="6"]'), nativeWoc, '原生 WOC 应位于退市 optgroup 内');
    assert.equal(nativeSelect.lastElementChild, nativeRetiredGroup, '原生退市 optgroup 应位于下拉底部');
    assert.equal(nativeWoc.disabled, false, 'WOC 不应禁用');
    assert.equal(nativeAbdi.parentElement, nativeActiveGroup, 'aBDI 应位于在售 optgroup 内');

    woc.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('plname').value, '6', 'WOC 应可通过自定义下拉选择');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('产品线搜索同时过滤在售和退市分区，并展示空结果', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const container = document.querySelector('[data-select-id="plname"]');
    const input = document.getElementById('productLineSearch');
    const activeGroup = container.querySelector('.product-select-group[data-product-group="active"]');
    const retiredGroup = container.querySelector('.product-select-group[data-product-group="retired"]');
    const woc = container.querySelector('[data-value="6"]');
    const abdi = container.querySelector('[data-value="27"]');
    const empty = container.querySelector('.product-select-empty');

    assert.ok(input, '产品线下拉应提供搜索输入框');
    input.value = 'WOC';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(woc.hidden, false);
    assert.equal(abdi.hidden, true);
    assert.equal(activeGroup.hidden, true);
    assert.equal(retiredGroup.hidden, false);
    assert.equal(empty.hidden, true);

    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(document.getElementById('plname').value, '6', '搜索结果应支持回车选择');
    assert.equal(container.querySelector('.product-trigger-label').textContent.trim(), 'WOC');
    assert.equal(container.querySelector('.custom-select-value .product-retired-badge').textContent.trim(), '已退市');

    input.value = '不存在的产品';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(activeGroup.hidden, true);
    assert.equal(retiredGroup.hidden, true);
    assert.equal(empty.hidden, false);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('产品线搜索结果的 hidden 状态应在 flex 布局下真正隐藏', () => {
  const compactCss = html.replace(/\s+/g, ' ');
  assert.match(
    compactCss,
    /\.custom-select\[data-select-id="plname"\]\s+\.custom-select-option\[hidden\][^{]*\{[^}]*display:\s*none/,
    '产品选项 hidden 状态应显式覆盖 display:flex'
  );
  assert.match(
    compactCss,
    /\.product-select-group\[hidden\][^{]*\{[^}]*display:\s*none/,
    '产品分组 hidden 状态应显式覆盖 display:flex'
  );
});

test('产品线下拉与触发器等宽并复用公共选中态', () => {
  const compactCss = html.replace(/\s+/g, ' ');
  assert.doesNotMatch(
    compactCss,
    /\.custom-select\[data-select-id="plname"\]\s+\.custom-select-dropdown\s*\{[^}]*(?:width|right)\s*:/,
    '产品线下拉不应覆盖公共等宽定位'
  );
  assert.doesNotMatch(
    compactCss,
    /\.custom-select\[data-select-id="plname"\]\s+\.custom-select-option\.selected\s*\{/,
    '产品线选中项不应覆盖公共选中样式'
  );
  assert.doesNotMatch(html, /product-selected-check/, '产品线选中项不应显示专属勾选图标');
  assert.match(
    compactCss,
    /\.retired-product-option\s+\.product-retired-badge\s*\{[^}]*margin-left:\s*auto/,
    '退市标签应在产品选项内右对齐'
  );
});

test('选择 WOC 持续显示退市提示，切回 aBDI 后隐藏', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const plname = document.getElementById('plname');
    const warning = document.getElementById('productLifecycleWarning');

    assert.ok(warning, '应存在产品生命周期提示');
    assert.equal(warning.hidden, true, '初始活跃产品不显示提示');

    plname.value = '6';
    fireChange(plname, window);
    assert.equal(warning.hidden, false, '选择 WOC 后应显示提示');
    assert.match(warning.textContent, /该产品已退市/);

    plname.value = '27';
    fireChange(plname, window);
    assert.equal(warning.hidden, true, '切换至 aBDI 后应隐藏提示');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('原生产品线 change 应同步自定义下拉的文案和选中项', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const plname = document.getElementById('plname');
    const valueText = document.querySelector('[data-select-id="plname"] .custom-select-value');
    const warning = document.getElementById('productLifecycleWarning');

    plname.value = '6';
    fireChange(plname, window);
    assert.equal(valueText.querySelector('.product-trigger-label').textContent.trim(), 'WOC');
    assert.equal(valueText.querySelector('.product-retired-badge').textContent.trim(), '已退市');
    assert.equal(document.querySelector('[data-select-id="plname"] .custom-select-option.selected').dataset.value, '6');
    assert.equal(warning.hidden, false);

    plname.value = '27';
    fireChange(plname, window);
    assert.equal(valueText.querySelector('.product-trigger-label').textContent.trim(), 'aBDI');
    assert.equal(valueText.querySelector('.product-retired-badge'), null);
    assert.equal(document.querySelector('[data-select-id="plname"] .custom-select-option.selected').dataset.value, '27');
    assert.equal(warning.hidden, true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('重置表单后产品线恢复原生默认值且自定义下拉和退市提示同步', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const form = document.getElementById('formsn');
    const plname = document.getElementById('plname');
    const warning = document.getElementById('productLifecycleWarning');
    const defaultValue = plname.value;
    const defaultText = plname.options[plname.selectedIndex].textContent;

    plname.value = '6';
    fireChange(plname, window);
    assert.equal(warning.hidden, false);

    form.reset();
    await waitFor(() => {
      const selected = document.querySelector('[data-select-id="plname"] .custom-select-option.selected');
      return selected && selected.dataset.value !== '6';
    }, window);

    const selected = document.querySelector('[data-select-id="plname"] .custom-select-option.selected');
    const valueText = document.querySelector('[data-select-id="plname"] .custom-select-value');
    assert.equal(plname.value, defaultValue, '重置后应恢复原生默认产品线');
    assert.equal(selected.dataset.value, plname.value);
    assert.equal(valueText.textContent.trim(), defaultText);
    assert.equal(warning.hidden, true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});
