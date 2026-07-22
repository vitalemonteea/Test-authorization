'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');
const fixtures = require('./fixtures/authorization-fixtures.cjs');

const rules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

function decide(overrides = {}) {
  return rules.calculateApprovalDecision({
    deviceFacts: [fixtures.noAuthBorrowed],
    productLineId: '22',
    productStatus: 'active',
    requestAction: 'open',
    customerType: 'normal',
    requestedMonths: 3,
    targetCapacity: 0,
    ...overrides
  });
}

function assertSnapshotShape(decision) {
  assert.equal(typeof decision.decisionType, 'string');
  assert.equal(typeof decision.routeKey, 'string');
  assert.ok(Array.isArray(decision.reasonCodes));
  assert.ok(Array.isArray(decision.reasonTexts));
  assert.equal(decision.reasonCodes.length, decision.reasonTexts.length);
  assert.equal(decision.ruleVersion, rules.RULE_VERSION);
  assert.ok(!Number.isNaN(Date.parse(decision.calculatedAt)));
}

test('普通与 KA 客户按累计测试月数决定自动或人工审批', () => {
  const normalAtLimit = decide({ requestedMonths: 3 });
  assert.equal(normalAtLimit.decisionType, 'default');
  assert.equal(normalAtLimit.routeKey, 'AUTO_PASS');

  const normalOverLimit = decide({ requestedMonths: 4 });
  assert.equal(normalOverLimit.decisionType, 'manual');
  assert.equal(normalOverLimit.routeKey, 'REGION_AND_HQ_MARKETING');

  const kaAtLimit = decide({ customerType: 'KA', requestedMonths: 6 });
  assert.equal(kaAtLimit.routeKey, 'AUTO_PASS');

  const kaOverLimit = decide({ customerType: 'KA', requestedMonths: 7 });
  assert.equal(kaOverLimit.decisionType, 'manual');
  assert.equal(kaOverLimit.routeKey, 'KA_AND_HQ_MARKETING');
});

test('累计时长包含设备已测试月份', () => {
  const decision = decide({
    deviceFacts: [{ ...fixtures.noAuthBorrowed, testedMonths: 2 }],
    requestedMonths: 2
  });
  assert.equal(decision.routeKey, 'REGION_AND_HQ_MARKETING');
  assert.ok(decision.reasonCodes.includes('CUMULATIVE_DURATION_LIMIT'));
});

test('aTrust 销售设备增开模块走区域与总部市场审批', () => {
  const decision = decide({
    deviceFacts: [fixtures.activeSales],
    productLineId: '20',
    requestAction: 'add_module',
    requestedMonths: 0
  });
  assert.equal(decision.decisionType, 'manual');
  assert.equal(decision.routeKey, 'REGION_AND_HQ_MARKETING');
  assert.ok(decision.reasonCodes.includes('ATRUST_SALES_ADD_MODULE'));
});

test('无记录或标记人工复核的设备优先走设备人工核验', () => {
  const decision = decide({
    deviceFacts: [{ ...fixtures.noAuthBorrowed, lookupStatus: 'not_found', manualReviewRequired: true }]
  });
  assert.equal(decision.decisionType, 'manual');
  assert.equal(decision.routeKey, 'MANUAL_DEVICE_VERIFICATION');
  assert.ok(decision.reasonCodes.includes('MANUAL_DEVICE_VERIFICATION'));
});

test('设备特殊流程和禁止自助标记具有最高优先级', () => {
  const special = decide({
    deviceFacts: [{ ...fixtures.noAuthBorrowed, specialFlowKey: 'CHANNEL_SECURITY_REVIEW' }]
  });
  assert.equal(special.decisionType, 'special_flow');
  assert.equal(special.routeKey, 'CHANNEL_SECURITY_REVIEW');

  const blocked = decide({
    deviceFacts: [{ ...fixtures.noAuthBorrowed, specialFlowKey: 'CHANNEL_SECURITY_REVIEW', selfServiceAllowed: false }]
  });
  assert.equal(blocked.decisionType, 'not_allowed');
  assert.equal(blocked.routeKey, 'NOT_ALLOWED');
  assert.ok(blocked.reasonCodes.includes('SELF_SERVICE_BLOCKED'));
});

test('HCI/SCP 目标容量 20 台以内默认通过，超过时产品限额审批', () => {
  const hciFact = { ...fixtures.noAuthBorrowed, productLineId: '45', productName: 'HCI' };
  assert.equal(decide({ deviceFacts: [hciFact], productLineId: '45', targetCapacity: 20 }).routeKey, 'AUTO_PASS');
  const over = decide({ deviceFacts: [hciFact], productLineId: '45', targetCapacity: 21 });
  assert.equal(over.decisionType, 'manual');
  assert.equal(over.routeKey, 'PRODUCT_LIMIT_APPROVAL');
  assert.ok(over.reasonCodes.includes('PRODUCT_LIMIT_APPROVAL'));
});

test('第三次通用申请与第二次 XDR 申请触发申请次数审批', () => {
  const generic = decide({
    deviceFacts: [{ ...fixtures.noAuthBorrowed, applicationCount: 2 }]
  });
  assert.equal(generic.routeKey, 'APPLICATION_LIMIT_APPROVAL');

  const xdr = decide({
    productLineId: '141',
    deviceFacts: [{ ...fixtures.noAuthBorrowed, productLineId: '141', productName: 'XDR', applicationCount: 1 }]
  });
  assert.equal(xdr.routeKey, 'APPLICATION_LIMIT_APPROVAL');
});

test('退市产品只追加警告原因，不单独改变审批路线', () => {
  const decision = decide({ productStatus: 'retired' });
  assert.equal(decision.routeKey, 'AUTO_PASS');
  assert.ok(decision.reasonCodes.includes('PRODUCT_RETIRED_WARNING'));
  assertSnapshotShape(decision);
});

test('内部审批决策随场景、客户、时长、容量和设备事实失效或重算', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const requestedMonths = document.getElementById('requestedMonths');
    const requestOptions = document.querySelectorAll('#requestContentGroup input');
    const extend = Array.from(requestOptions).find((input) => input.value === 'extend');
    const addModule = Array.from(requestOptions).find((input) => input.value === 'add_module');
    extend.checked = true;
    fireChange(extend, window);
    requestedMonths.value = '0';
    fireChange(requestedMonths, window);
    assert.equal(window.applicationState.approvalDecision.routeKey, 'AUTO_PASS');

    extend.checked = false;
    fireChange(extend, window);
    addModule.checked = true;
    fireChange(addModule, window);
    assert.equal(window.applicationState.approvalDecision.routeKey, 'REGION_AND_HQ_MARKETING');

    addModule.checked = false;
    fireChange(addModule, window);
    extend.checked = true;
    fireChange(extend, window);
    requestedMonths.value = '3';
    fireChange(requestedMonths, window);
    assert.equal(window.applicationState.approvalDecision.routeKey, 'REGION_AND_HQ_MARKETING');

    const customer = document.getElementById('customerSearchInput');
    customer.value = 'C100001';
    customer.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    assert.equal(window.applicationState.approvalDecision.routeKey, 'AUTO_PASS');

    product.value = '45';
    fireChange(product, window);
    const infoFile = new window.File(['hci-device-info'], 'hci-device.info', { type: 'text/plain' });
    const fileInput = document.getElementById('hwFileInput');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [infoFile] });
    fireChange(fileInput, window);
    const capacity = document.getElementById('targetCapacity');
    capacity.value = '21';
    fireChange(capacity, window);
    assert.equal(window.applicationState.approvalDecision.routeKey, 'PRODUCT_LIMIT_APPROVAL');

    document.getElementById('hwFileClear').click();
    assert.equal(window.applicationState.approvalDecision, null);
    assert.equal(document.getElementById('approvalPreview').hidden, true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('内部审批可计算四种状态但不向申请人展示预览', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '2';
    fireChange(planType, window);

    const cases = [
      ['DEV-NGAF-001', 'default'],
      ['UNKNOWN-001', 'default'],
      ['SPECIAL-FLOW-001', 'special_flow'],
      ['SELF-SERVICE-BLOCKED-001', 'not_allowed']
    ];
    for (const [deviceId, expectedType] of cases) {
      window.addChip(deviceId);
      const scene = document.getElementById('authScene');
      scene.value = '1';
      fireChange(scene, window);
      assert.equal(window.applicationState.approvalDecision.decisionType, expectedType);
      assert.equal(document.getElementById('approvalPreview').hidden, true);
      window.removeDeviceChip(deviceId);
    }
  } finally {
    dom.window.close();
  }
});
