'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

const rulesPath = path.join(__dirname, '..', 'authorization-application-rules.js');
const rules = fs.existsSync(rulesPath) ? require(rulesPath) : {};

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

test('产品线下拉将 WOC 放入底部退市分组且保持可选', () => {
  const { dom, document, errors } = loadV2Dom();
  try {
    const list = document.querySelector('[data-select-id="plname"] .custom-select-list');
    const retiredGroup = list.querySelector('[data-product-group="retired"]');
    const woc = list.querySelector('[data-value="6"]');
    const abdi = list.querySelector('[data-value="27"]');
    const nativeSelect = document.getElementById('plname');
    const nativeRetiredGroup = nativeSelect.querySelector('optgroup[label="已退市产品"]');
    const nativeWoc = document.querySelector('#plname option[value="6"]');
    const nativeAbdi = document.querySelector('#plname option[value="27"]');

    assert.ok(retiredGroup, '应存在退市产品分组');
    assert.equal(retiredGroup.textContent.trim(), '已退市产品');
    assert.equal(retiredGroup.nextElementSibling, woc, 'WOC 应紧跟退市分组');
    assert.equal(list.lastElementChild, woc, '退市分组及 WOC 应位于列表底部');
    assert.ok(abdi.compareDocumentPosition(retiredGroup) & 4, 'aBDI 应位于退市分组之前');
    assert.ok(woc.classList.contains('retired-product-option'));
    assert.ok(nativeRetiredGroup, '原生产品线下拉应存在退市 optgroup');
    assert.equal(nativeRetiredGroup.dataset.productGroup, 'retired');
    assert.equal(nativeRetiredGroup.querySelector('option[value="6"]'), nativeWoc, '原生 WOC 应位于退市 optgroup 内');
    assert.equal(nativeSelect.lastElementChild, nativeRetiredGroup, '原生退市 optgroup 应位于下拉底部');
    assert.equal(nativeWoc.disabled, false, 'WOC 不应禁用');
    assert.notEqual(nativeAbdi.parentElement, nativeRetiredGroup, 'aBDI 不应位于退市 optgroup 内');

    woc.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('plname').value, '6', 'WOC 应可通过自定义下拉选择');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
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
    assert.equal(valueText.textContent.trim(), 'WOC');
    assert.equal(document.querySelector('[data-select-id="plname"] .custom-select-option.selected').dataset.value, '6');
    assert.equal(warning.hidden, false);

    plname.value = '27';
    fireChange(plname, window);
    assert.equal(valueText.textContent.trim(), 'aBDI');
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
