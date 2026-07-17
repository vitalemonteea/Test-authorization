'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');
const fixtures = require('./fixtures/authorization-fixtures.cjs');

const rules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

test('设备授权状态决定可申请事项', () => {
  assert.deepEqual(rules.getEligibleRequestActions(fixtures.noAuthBorrowed), ['open']);
  assert.deepEqual(rules.getEligibleRequestActions({ ...fixtures.noAuthBorrowed, authorizationStatus: 'expired' }), ['open']);
  assert.deepEqual(rules.getEligibleRequestActions(fixtures.activeSales), ['extend', 'add_module', 'increase_capacity']);
});

test('申请事项完整映射旧授权场景值', () => {
  assert.equal(rules.mapLegacyAuthScene('open'), '1');
  assert.equal(rules.mapLegacyAuthScene('adjust'), '2');
  assert.equal(rules.mapLegacyAuthScene('add_module'), '3');
  assert.equal(rules.mapLegacyAuthScene('increase_capacity'), '5');
  assert.equal(rules.mapLegacyAuthScene('extend'), '6');
});

test('旧授权场景仅保留隐藏兼容字段', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const authScene = document.getElementById('authScene');
    assert.ok(authScene);
    assert.equal(authScene.type, 'hidden');
    assert.equal(document.querySelector('[data-select-id="authScene"]'), null);
  } finally {
    dom.window.close();
  }
});

test('非 HCI 设备识别后仅显示符合状态的申请事项', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    const actionItem = document.getElementById('requestActionFormItem');
    const action = document.getElementById('requestAction');

    product.value = '20';
    fireChange(product, window);
    assert.equal(actionItem.hidden, true);

    window.addChip('SALES-ATRUST-001');
    assert.equal(actionItem.hidden, false);
    assert.deepEqual(Array.from(action.options).map((option) => option.value), [
      '', 'extend', 'add_module', 'increase_capacity'
    ]);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('设备、申请事项和客户字段按业务顺序排列', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const device = document.getElementById('deviceIdFormItem');
    const action = document.getElementById('requestActionFormItem');
    const customer = document.getElementById('customerSearchInput');
    assert.ok(device.compareDocumentPosition(action) & 4);
    assert.ok(action.compareDocumentPosition(customer) & 4);
  } finally {
    dom.window.close();
  }
});

test('切换申请事项同步旧场景并清理上一事项状态', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const action = document.getElementById('requestAction');
    const legacy = document.getElementById('authScene');
    const priorQuery = document.getElementById('eaQueryDevId');
    action.value = 'add_module';
    fireChange(action, window);
    priorQuery.value = 'stale-value';

    action.value = 'increase_capacity';
    fireChange(action, window);
    assert.equal(legacy.value, '5');
    assert.equal(priorQuery.value, '');
    assert.equal(window.applicationState.requestAction, 'increase_capacity');
  } finally {
    dom.window.close();
  }
});
