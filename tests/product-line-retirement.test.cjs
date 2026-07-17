'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

const rulesPath = path.join(__dirname, '..', 'authorization-application-rules.js');
const rules = fs.existsSync(rulesPath) ? require(rulesPath) : {};

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
    const nativeWoc = document.querySelector('#plname option[value="6"]');

    assert.ok(retiredGroup, '应存在退市产品分组');
    assert.equal(retiredGroup.textContent.trim(), '已退市产品');
    assert.equal(retiredGroup.nextElementSibling, woc, 'WOC 应紧跟退市分组');
    assert.equal(list.lastElementChild, woc, '退市分组及 WOC 应位于列表底部');
    assert.ok(abdi.compareDocumentPosition(retiredGroup) & 4, 'aBDI 应位于退市分组之前');
    assert.ok(woc.classList.contains('retired-product-option'));
    assert.equal(nativeWoc.disabled, false, 'WOC 不应禁用');

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
