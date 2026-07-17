'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');
const fixtures = require('./fixtures/authorization-fixtures.cjs');

const rules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

function applicationFor(fact, overrides = {}) {
  return {
    deviceFacts: fact,
    requestAction: 'open',
    approvalDecision: {
      decisionType: 'default',
      routeKey: 'AUTO_PASS'
    },
    ...overrides
  };
}

test('同产品、事项、来源、借测单、材料与审批路线的设备兼容', () => {
  const issues = rules.findCompatibilityIssues([
    applicationFor(fixtures.noAuthBorrowed),
    applicationFor(fixtures.sameBorrowOrderPeer)
  ]);
  assert.deepEqual(issues, []);
});

test('不同借测单生成点名冲突设备的硬问题', () => {
  const issues = rules.findCompatibilityIssues([
    applicationFor(fixtures.noAuthBorrowed),
    applicationFor(fixtures.differentBorrowOrder)
  ]);
  const mismatch = issues.find((issue) => issue.code === 'BORROW_ORDER_MISMATCH');
  assert.ok(mismatch);
  assert.equal(mismatch.deviceId, 'DEV-TEST-001');
  assert.equal(mismatch.hard, true);
});

test('材料、决策类型或审批路线不同均生成硬问题', () => {
  const materialIssues = rules.findCompatibilityIssues([
    applicationFor(fixtures.noAuthBorrowed),
    applicationFor({ ...fixtures.sameBorrowOrderPeer, materialKeys: ['other-proof'] })
  ]);
  assert.ok(materialIssues.some((issue) => issue.code === 'MATERIAL_KEYS_MISMATCH' && issue.hard));

  const decisionIssues = rules.findCompatibilityIssues([
    applicationFor(fixtures.noAuthBorrowed),
    applicationFor(fixtures.sameBorrowOrderPeer, {
      approvalDecision: { decisionType: 'manual', routeKey: 'AUTO_PASS' }
    })
  ]);
  assert.ok(decisionIssues.some((issue) => issue.code === 'DECISION_TYPE_MISMATCH' && issue.hard));

  const routeIssues = rules.findCompatibilityIssues([
    applicationFor(fixtures.noAuthBorrowed),
    applicationFor(fixtures.sameBorrowOrderPeer, {
      approvalDecision: { decisionType: 'default', routeKey: 'REGION_AND_HQ_MARKETING' }
    })
  ]);
  assert.ok(routeIssues.some((issue) => issue.code === 'APPROVAL_ROUTE_MISMATCH' && issue.hard));
});

test('页面列出冲突设备和原因，提交时要求拆分且不会成功', () => {
  const { dom, document, window, alerts, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '2';
    fireChange(planType, window);
    window.addChip('DEV-NGAF-001');
    window.addChip('DEV-TEST-001');

    const action = document.getElementById('requestAction');
    action.value = 'open';
    fireChange(action, window);
    const blocking = document.getElementById('deviceCompatibilityBlocking');
    assert.equal(blocking.hidden, false);
    assert.match(blocking.textContent, /DEV-TEST-001/);
    assert.match(blocking.textContent, /借测单/);

    window.submitStandardForm();
    assert.match(alerts.at(-1), /请拆分申请/);
    assert.equal(alerts.some((message) => /表单已提交/.test(message)), false);

    window.removeDeviceChip('DEV-TEST-001');
    assert.equal(blocking.hidden, true);
    assert.equal(window.applicationState.compatibilityIssues.length, 0);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('同借测单自动扩展设备支持 ID/SN 成对删除且提交仅保留剩余设备', () => {
  const { dom, document, window, alerts, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '1';
    fireChange(planType, window);
    window.addChip('DEV-NGAF-001');

    assert.match(document.getElementById('devIdNew').value, /DEV-NGAF-002/);
    assert.match(document.getElementById('devSnNew').value, /SN-2024002-B/);
    window.removeDeviceChip('DEV-NGAF-002');
    assert.doesNotMatch(document.getElementById('devIdNew').value, /DEV-NGAF-002/);
    assert.doesNotMatch(document.getElementById('devSnNew').value, /SN-2024002-B/);

    const action = document.getElementById('requestAction');
    action.value = 'open';
    fireChange(action, window);
    const infoFile = new window.File(['device-info'], 'device.info', { type: 'text/plain' });
    Object.defineProperty(document.getElementById('hwFileInput'), 'files', {
      configurable: true,
      value: [infoFile]
    });
    window.submitStandardForm();

    assert.match(alerts.at(-1), /表单已提交/);
    const snapshot = JSON.parse(document.getElementById('submissionSnapshot').value);
    assert.deepEqual(snapshot.deviceFacts.map((fact) => fact.deviceId), ['DEV-NGAF-001']);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('提交快照包含派生场景、事实、决策和规则版本且执行深复制', () => {
  const approvalDecision = rules.calculateApprovalDecision({
    deviceFacts: [fixtures.noAuthBorrowed],
    productLineId: '22',
    productStatus: 'active',
    requestAction: 'open',
    customerType: 'normal',
    requestedMonths: 3,
    targetCapacity: 0
  });
  const input = {
    productLineId: '22',
    productStatus: 'active',
    requestAction: 'open',
    deviceFacts: [fixtures.noAuthBorrowed],
    approvalDecision
  };
  const snapshot = rules.buildSubmissionSnapshot(input);

  assert.equal(snapshot.productLineId, '22');
  assert.equal(snapshot.productStatus, 'active');
  assert.equal(snapshot.requestAction, 'open');
  assert.equal(snapshot.authScene, '1');
  assert.deepEqual(snapshot.deviceFacts, [fixtures.noAuthBorrowed]);
  assert.deepEqual(snapshot.approvalDecision, approvalDecision);
  assert.equal(snapshot.ruleVersion, rules.RULE_VERSION);
  assert.notEqual(snapshot.deviceFacts, input.deviceFacts);
  assert.notEqual(snapshot.deviceFacts[0], input.deviceFacts[0]);
  assert.notEqual(snapshot.approvalDecision, input.approvalDecision);
});

test('设备事实版本变化会被识别为陈旧事实', () => {
  assert.deepEqual(rules.findStaleDeviceFacts(
    [fixtures.noAuthBorrowed, fixtures.sameBorrowOrderPeer],
    [fixtures.noAuthBorrowed, { ...fixtures.sameBorrowOrderPeer, factVersion: 'facts-ngaf-002-v2' }]
  ), ['DEV-NGAF-002']);
});

test('不可自助决策硬阻断提交且不生成快照或成功提示', () => {
  const { dom, document, window, alerts } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '2';
    fireChange(planType, window);
    window.addChip('SELF-SERVICE-BLOCKED-001');
    const action = document.getElementById('requestAction');
    action.value = 'open';
    fireChange(action, window);

    window.submitStandardForm();

    assert.match(alerts.at(-1), /当前申请不允许自助提交/);
    assert.equal(document.getElementById('submissionSnapshot').value, '');
    assert.equal(alerts.some((message) => /表单已提交/.test(message)), false);
  } finally {
    dom.window.close();
  }
});

test('硬件信息文件要求由产品与申请类型规则决定', () => {
  assert.equal(rules.isHardwareInfoRequired('45', '1'), true);
  assert.equal(rules.isHardwareInfoRequired('19', '1'), true);
  assert.equal(rules.isHardwareInfoRequired('22', '2'), false);
});
