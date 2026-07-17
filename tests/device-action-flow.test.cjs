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

test('查询结果归一化并给出设备事实阻断原因', () => {
  assert.deepEqual(
    rules.normalizeLookupResult({ status: 'error', errorCode: 'TIMEOUT' }, { deviceId: 'ERR-TIMEOUT-001' }),
    {
      lookupStatus: 'error',
      deviceId: 'ERR-TIMEOUT-001',
      errorCode: 'TIMEOUT',
      manualReviewRequired: false
    }
  );
  assert.equal(rules.getLookupBlockingReason([
    { lookupStatus: 'error', deviceId: 'ERR-TIMEOUT-001' }
  ], '22').code, 'LOOKUP_ERROR');
  assert.equal(rules.getLookupBlockingReason([
    fixtures.noAuthBorrowed
  ], '20').code, 'PRODUCT_MISMATCH');
});

test('只读设备事实摘要展示实际产品、来源、授权、资源和历史', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('DEV-NGAF-001');

    const summary = document.getElementById('deviceFactsSummary');
    assert.match(summary.textContent, /NGAF/);
    assert.match(summary.textContent, /借测设备/);
    assert.match(summary.textContent, /无授权/);
    assert.match(summary.textContent, /当前模块：无/);
    assert.match(summary.textContent, /当前容量：0/);
    assert.match(summary.textContent, /累计测试：0个月/);
    assert.match(summary.textContent, /历史申请：0次/);
    assert.equal(summary.querySelector('input, select, textarea, button'), null);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('查询超时阻断事项和提交，并可重试或保存草稿', () => {
  const { dom, document, window, alerts, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('ERR-TIMEOUT-001');

    const blocking = document.getElementById('deviceLookupBlocking');
    assert.equal(blocking.hidden, false);
    assert.match(blocking.textContent, /查询失败/);
    assert.equal(document.getElementById('requestActionFormItem').hidden, true);
    assert.equal(document.getElementById('retryDeviceLookup').hidden, false);
    assert.equal(document.getElementById('saveApplicationDraft').hidden, false);

    window.submitStandardForm();
    assert.match(alerts.at(-1), /设备事实查询失败/);

    document.getElementById('saveApplicationDraft').click();
    const draft = JSON.parse(window.localStorage.getItem('authorization-application-draft'));
    assert.deepEqual(draft.deviceIdentifiers, ['ERR-TIMEOUT-001']);
    assert.equal(draft.productLineId, '22');
    assert.equal(draft.ruleVersion, rules.RULE_VERSION);
    assert.match(alerts.at(-1), /草稿已保存/);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('无记录设备进入人工复核但仍允许选择开通事项', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('UNKNOWN-001');

    assert.equal(window.applicationState.deviceFacts[0].lookupStatus, 'not_found');
    assert.equal(window.applicationState.deviceFacts[0].manualReviewRequired, true);
    assert.equal(document.getElementById('manualReviewRequired').value, '1');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, true);
    assert.equal(document.getElementById('requestActionFormItem').hidden, false);
    assert.deepEqual(Array.from(document.getElementById('requestAction').options).map((option) => option.value), ['', 'open']);
  } finally {
    dom.window.close();
  }
});

test('设备实际产品与所选产品不一致时阻断并显示实际产品名', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('DEV-NGAF-001');

    const blocking = document.getElementById('deviceLookupBlocking');
    assert.equal(blocking.hidden, false);
    assert.match(blocking.textContent, /产品不一致/);
    assert.match(blocking.textContent, /NGAF/);
    assert.equal(document.getElementById('requestActionFormItem').hidden, true);
  } finally {
    dom.window.close();
  }
});

test('移除查询失败或产品不一致设备后失效旧事实和事项', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('ERR-TIMEOUT-001');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, false);
    window.removeDeviceChip('ERR-TIMEOUT-001');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, true);
    assert.equal(window.applicationState.deviceFacts.length, 0);
    assert.equal(document.getElementById('requestActionFormItem').hidden, true);

    product.value = '20';
    fireChange(product, window);
    window.addChip('DEV-NGAF-001');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, false);
    window.removeDeviceChip('DEV-NGAF-001');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, true);
    assert.equal(window.applicationState.deviceFacts.length, 0);
    assert.equal(document.getElementById('requestActionFormItem').hidden, true);
  } finally {
    dom.window.close();
  }
});
