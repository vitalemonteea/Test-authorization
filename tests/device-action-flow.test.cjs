'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');
const fixtures = require('./fixtures/authorization-fixtures.cjs');

const rules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

test('设备状态和来源决定可选授权场景', () => {
  assert.equal(typeof rules.getEligibleAuthScenes, 'function');
  assert.deepEqual(rules.getEligibleAuthScenes(fixtures.noAuthBorrowed), ['1']);
  assert.deepEqual(rules.getEligibleAuthScenes({ ...fixtures.noAuthBorrowed, authorizationStatus: 'expired' }), ['1']);
  assert.deepEqual(rules.getEligibleAuthScenes({ ...fixtures.noAuthBorrowed, authorizationStatus: 'active' }), ['2']);
  assert.deepEqual(rules.getEligibleAuthScenes(fixtures.activeSales), ['3', '5', '6']);
});

test('授权场景映射内部申请动作', () => {
  assert.equal(typeof rules.mapAuthSceneToRequestAction, 'function');
  assert.equal(rules.mapAuthSceneToRequestAction('1'), 'open');
  assert.equal(rules.mapAuthSceneToRequestAction('2'), 'adjust');
  assert.equal(rules.mapAuthSceneToRequestAction('3'), 'add_module');
  assert.equal(rules.mapAuthSceneToRequestAction('5'), 'increase_capacity');
  assert.equal(rules.mapAuthSceneToRequestAction('6'), 'extend');
});

test('非销售设备的有效期内事项统一映射资源调整场景', () => {
  const activeBorrowed = { ...fixtures.noAuthBorrowed, authorizationStatus: 'active' };
  assert.equal(rules.mapLegacyAuthScene('extend', activeBorrowed), '2');
  assert.equal(rules.mapLegacyAuthScene('add_module', activeBorrowed), '2');
  assert.equal(rules.mapLegacyAuthScene('increase_capacity', activeBorrowed), '2');
});

test('授权场景恢复为设备识别后的可见业务字段', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const authScene = document.getElementById('authScene');
    assert.ok(authScene);
    assert.equal(authScene.tagName, 'SELECT');
    assert.match(authScene.closest('#authSceneFormItem').querySelector('.layui-form-label').textContent.trim(), /^授权场景/);
    assert.equal(document.getElementById('requestAction').type, 'hidden');
    assert.equal(document.getElementById('requestActionFormItem'), null);
  } finally {
    dom.window.close();
  }
});

test('销售设备识别后仅显示符合状态的授权场景', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    const sceneItem = document.getElementById('authSceneFormItem');
    const scene = document.getElementById('authScene');

    product.value = '20';
    fireChange(product, window);
    assert.equal(sceneItem.hidden, true);
    assert.equal(window.getComputedStyle(sceneItem).display, 'none', '未识别设备时授权场景不应占据页面空间');

    window.addChip('SALES-ATRUST-001');
    assert.equal(sceneItem.hidden, false);
    assert.deepEqual(Array.from(scene.options).map((option) => option.value), ['', '3', '5', '6']);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('设备、授权场景和客户字段按业务顺序排列', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const device = document.getElementById('deviceIdFormItem');
    const scene = document.getElementById('authSceneFormItem');
    const customer = document.getElementById('customerSearchInput');
    assert.ok(device.compareDocumentPosition(scene) & 4);
    assert.ok(scene.compareDocumentPosition(customer) & 4);
  } finally {
    dom.window.close();
  }
});

test('切换授权场景同步内部动作并清理上一场景状态', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const scene = document.getElementById('authScene');
    const action = document.getElementById('requestAction');
    const priorQuery = document.getElementById('eaQueryDevId');
    scene.value = '3';
    fireChange(scene, window);
    priorQuery.value = 'stale-value';

    scene.value = '5';
    fireChange(scene, window);
    assert.equal(action.value, 'increase_capacity');
    assert.equal(priorQuery.value, '');
    assert.equal(window.applicationState.requestAction, 'increase_capacity');
  } finally {
    dom.window.close();
  }
});

test('切换授权场景清理上一场景状态并重新计算内部审批', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const scene = document.getElementById('authScene');
    scene.value = '3';
    fireChange(scene, window);
    document.getElementById('requestedMonths').value = '9';
    document.getElementById('targetCapacity').value = '999';
    document.getElementById('eaQueryDevId').value = 'stale-query';
    document.getElementById('eaResultArea').style.display = 'block';
    document.getElementById('eaResultDevice').textContent = 'stale-result';
    const moduleToggle = document.querySelector('.module-item .toggle-switch');
    moduleToggle.classList.add('active');

    scene.value = '6';
    fireChange(scene, window);

    assert.equal(document.getElementById('requestedMonths').value, '');
    assert.equal(document.getElementById('targetCapacity').value, '');
    assert.equal(document.getElementById('eaQueryDevId').value, '');
    assert.equal(document.getElementById('eaResultArea').style.display, 'none');
    assert.equal(document.getElementById('eaResultDevice').textContent, '');
    assert.equal(document.querySelectorAll('.module-item .toggle-switch.active').length, 0);
    assert.equal(window.applicationState.approvalDecision.routeKey, 'AUTO_PASS');
    assert.deepEqual(errors, []);
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
    assert.equal(document.getElementById('authSceneFormItem').hidden, true);
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
    assert.equal(document.getElementById('authSceneFormItem').hidden, false);
    assert.deepEqual(Array.from(document.getElementById('authScene').options).map((option) => option.value), ['', '1']);
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
    assert.equal(document.getElementById('authSceneFormItem').hidden, true);
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
    assert.equal(document.getElementById('authSceneFormItem').hidden, true);

    product.value = '20';
    fireChange(product, window);
    window.addChip('DEV-NGAF-001');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, false);
    window.removeDeviceChip('DEV-NGAF-001');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, true);
    assert.equal(window.applicationState.deviceFacts.length, 0);
    assert.equal(document.getElementById('authSceneFormItem').hidden, true);
  } finally {
    dom.window.close();
  }
});
