'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');
const fixtures = require('./fixtures/authorization-fixtures.cjs');

const rules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

function getDeviceFactValue(panel, label) {
  const item = Array.from(panel.querySelectorAll('.device-fact-item')).find((candidate) =>
    candidate.querySelector('.device-fact-label')?.textContent.trim() === label
  );
  assert.ok(item, `设备事实面板应包含“${label}”项`);
  const value = item.querySelector('.device-fact-value');
  assert.ok(value, `设备事实“${label}”应包含值`);
  return value.textContent.trim();
}

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

test('授权场景是设备识别后的只读业务字段', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const authScene = document.getElementById('authScene');
    assert.ok(authScene);
    assert.equal(authScene.tagName, 'INPUT');
    assert.equal(authScene.type, 'hidden');
    assert.ok(document.getElementById('authSceneDisplay'));
    assert.equal(document.getElementById('authSceneBasis').tagName, 'DETAILS');
    assert.match(document.getElementById('authSceneBasis').querySelector('summary').textContent, /查看识别依据/);
    assert.match(authScene.closest('#authSceneFormItem').querySelector('.layui-form-label').textContent.trim(), /^授权场景/);
    assert.equal(document.getElementById('requestAction').type, 'hidden');
    assert.equal(document.getElementById('requestActionFormItem'), null);
  } finally {
    dom.window.close();
  }
});

test('有效期内销售设备自动识别调整场景并展示三项申请内容', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    const sceneItem = document.getElementById('authSceneFormItem');
    const scene = document.getElementById('authScene');
    const sceneRow = document.getElementById('authSceneRow');

    product.value = '20';
    fireChange(product, window);
    assert.equal(sceneItem.hidden, true);
    assert.equal(sceneRow.hidden, true);
    assert.equal(window.getComputedStyle(sceneItem).display, 'none', '未识别设备时授权场景不应占据页面空间');

    window.addChip('SALES-ATRUST-001');
    assert.equal(sceneItem.hidden, false);
    assert.equal(sceneRow.hidden, false);
    assert.equal(scene.value, 'adjust');
    assert.equal(document.getElementById('authSceneLabel').textContent.trim(), '调整当前测试授权');
    assert.match(document.getElementById('authSceneTags').textContent, /销售设备/);
    assert.deepEqual(
      Array.from(document.querySelectorAll('#requestContentGroup input')).map((input) => input.value),
      ['extend', 'add_module', 'increase_capacity']
    );
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('客户、申请类型、设备、借测信息和授权场景按业务顺序排列', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const customer = document.getElementById('customerInfoFormItem');
    const planType = document.getElementById('planDevTypeRow');
    const device = document.getElementById('deviceIdFormItem');
    const deviceSn = document.getElementById('devSnFormItem');
    const borrow = document.getElementById('borrowTestFields');
    const scene = document.getElementById('authSceneFormItem');
    assert.ok(customer.compareDocumentPosition(planType) & 4);
    assert.ok(planType.compareDocumentPosition(device) & 4);
    assert.ok(device.compareDocumentPosition(deviceSn) & 4);
    assert.ok(deviceSn.compareDocumentPosition(borrow) & 4);
    assert.ok(borrow.compareDocumentPosition(scene) & 4);
  } finally {
    dom.window.close();
  }
});

test('设备授权状态派生唯一基础场景和可申请内容', () => {
  assert.equal(rules.deriveBaseScene(fixtures.noAuthBorrowed), 'first_open');
  assert.equal(rules.deriveBaseScene({ ...fixtures.noAuthBorrowed, authorizationStatus: 'expired' }), 'reopen');
  assert.equal(rules.deriveBaseScene({ ...fixtures.noAuthBorrowed, authorizationStatus: 'active' }), 'adjust');
  assert.deepEqual(rules.getEligibleRequestContents(fixtures.noAuthBorrowed), ['open']);
  assert.deepEqual(
    rules.getEligibleRequestContents(fixtures.activeSales),
    ['extend', 'add_module', 'increase_capacity'],
    '销售属性不应限制首次、重开或有效期内调整内容'
  );
});

test('纯软无历史直接按首次开通处理，硬件借测无资产记录必须阻断', () => {
  const softwareFact = rules.normalizeLookupResult(null, {
    deviceId: 'CUSTOMER-SOFT-001',
    productLineId: '22',
    productName: 'NGAF',
    strictAssetLookup: false
  });
  assert.equal(softwareFact.lookupStatus, 'success');
  assert.equal(softwareFact.deviceSource, 'customer_owned');
  assert.equal(softwareFact.manualReviewRequired, false);
  assert.equal(rules.deriveBaseScene(softwareFact), 'first_open');

  const hardwareFact = rules.normalizeLookupResult(null, {
    deviceId: 'UNKNOWN-BORROWED-001',
    productLineId: '22',
    productName: 'NGAF',
    strictAssetLookup: true
  });
  assert.equal(hardwareFact.lookupStatus, 'not_found');
  assert.equal(hardwareFact.selfServiceAllowed, false);
  assert.equal(rules.getLookupBlockingReason([hardwareFact], '22').code, 'UNKNOWN_BORROWED_DEVICE');
});

test('客户类型决定累计时长层级，KA按六个月计算', () => {
  assert.equal(rules.getDurationLimitMonths('normal'), 3);
  assert.equal(rules.getDurationLimitMonths('KA'), 6);
  assert.equal(rules.getOverdueTier({ testedMonths: 5 }, { customerType: 'KA', requestedMonths: 1 }), 'normal');
  assert.equal(rules.getOverdueTier({ testedMonths: 5 }, { customerType: 'KA', requestedMonths: 2 }), 'overdue');
});

test('纯软设备只查授权历史并可识别重新开通场景', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '2';
    fireChange(planType, window);

    window.addChip('SOFT-REOPEN-001');
    assert.equal(document.getElementById('authScene').value, 'reopen');
    assert.match(document.getElementById('authSceneBasisText').textContent, /匹配 1 条授权记录/);
    assert.doesNotMatch(document.getElementById('deviceFactsSummary').textContent, /待人工确认/);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('重新开通与累计超期可以在场景卡中同时显示', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('OVERDUE-NGAF-001');

    assert.equal(document.getElementById('authScene').value, 'reopen');
    assert.match(document.getElementById('authSceneTags').textContent, /累计测试超期/);
    assert.match(document.getElementById('authSceneBasisText').textContent, /匹配 3 条授权记录/);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('HCI 硬件信息文件按客户与集群历史识别有效授权', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const infoFile = new window.File(['hci-active'], 'hci-active-demo.info', { type: 'text/plain' });
    const fileInput = document.getElementById('hwFileInput');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [infoFile] });
    fireChange(fileInput, window);

    assert.equal(document.getElementById('authScene').value, 'adjust');
    assert.match(document.getElementById('authSceneBasisText').textContent, /客户 \+ 产品线 \+ 集群标识/);
    assert.match(document.getElementById('deviceFactsSummary').textContent, /分布式存储/);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('切换客户后按新的历史范围重新派生基础场景', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('ACTIVE-NGAF-001');
    assert.equal(document.getElementById('authScene').value, 'adjust');

    const customer = document.getElementById('customerSearchInput');
    customer.value = 'C100002';
    customer.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100002"]').click();
    assert.equal(document.getElementById('authScene').value, 'first_open');
    assert.match(document.getElementById('authSceneBasisText').textContent, /匹配 0 条授权记录/);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('HCI 上传硬件信息文件后显示授权场景，切换 DMP 后清空', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    const sceneItem = document.getElementById('authSceneFormItem');
    const sceneRow = document.getElementById('authSceneRow');

    assert.equal(product.value, '45');
    assert.equal(sceneItem.hidden, true, 'HCI 上传文件前不应显示授权场景');
    assert.equal(sceneRow.hidden, true, 'HCI 上传文件前不应保留授权场景空行');

    const infoFile = new window.File(['hci-device-info'], 'hci-device.info', { type: 'text/plain' });
    const fileInput = document.getElementById('hwFileInput');
    Object.defineProperty(fileInput, 'files', { configurable: true, value: [infoFile] });
    fireChange(fileInput, window);
    assert.equal(sceneItem.hidden, false, 'HCI 文件识别后应显示授权场景');
    assert.equal(sceneRow.hidden, false, 'HCI 文件识别后应显示授权场景独立行');

    product.value = '24';
    fireChange(product, window);
    assert.equal(sceneItem.hidden, true, 'DMP 未识别设备时应隐藏授权场景');
    assert.equal(sceneRow.hidden, true, 'DMP 应隐藏授权场景独立行且不留空白');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('HCI 首次加载不显示当前授权信息', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const section = document.getElementById('existingAuthSection');
    assert.equal(document.getElementById('plname').value, '45');
    assert.equal(window.getComputedStyle(section).display, 'none');
    assert.equal(section.classList.contains('show'), false);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('设备移除后隐藏系统场景和申请内容', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const section = document.getElementById('existingAuthSection');
    assert.equal(window.getComputedStyle(section).display, 'none', '不应再显示重复的当前授权查询区');
    assert.equal(document.getElementById('authScene').value, 'adjust');
    assert.equal(document.getElementById('requestContentsRow').hidden, false);

    window.removeDeviceChip('SALES-ATRUST-001');
    assert.equal(window.getComputedStyle(section).display, 'none');
    assert.equal(section.classList.contains('show'), false);
    assert.equal(document.getElementById('authSceneRow').hidden, true);
    assert.equal(document.getElementById('requestContentsRow').hidden, true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('选择调整内容同步内部状态并联动日期和模块区域', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const action = document.getElementById('requestAction');
    const capacity = document.querySelector('#requestContentGroup input[value="increase_capacity"]');
    const extend = document.querySelector('#requestContentGroup input[value="extend"]');
    capacity.checked = true;
    fireChange(capacity, window);
    assert.equal(action.value, 'adjust');
    assert.deepEqual(Array.from(window.applicationState.requestContents), ['increase_capacity']);
    assert.equal(document.querySelector('#content .unified-date-bar').hidden, true);
    assert.equal(document.querySelector('#content .module-toolbar').hidden, false);

    extend.checked = true;
    fireChange(extend, window);
    assert.deepEqual(Array.from(window.applicationState.requestContents), ['extend', 'increase_capacity']);
    assert.equal(document.querySelector('#content .unified-date-bar').hidden, false);
  } finally {
    dom.window.close();
  }
});

test('销售设备增开模块会重新计算内部审批提示', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);
    window.addChip('SALES-ATRUST-001');

    const addModule = document.querySelector('#requestContentGroup input[value="add_module"]');
    addModule.checked = true;
    fireChange(addModule, window);
    assert.equal(window.applicationState.approvalDecision.routeKey, 'REGION_AND_HQ_MARKETING');

    addModule.checked = false;
    fireChange(addModule, window);
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

test('只读设备事实摘要仅展示来源、授权状态和历史', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    window.addChip('DEV-NGAF-001');

    const summary = document.getElementById('deviceFactsSummary');
    const panel = summary.querySelector('.device-facts-panel');
    assert.ok(panel, '查询后应渲染独立的 .device-facts-panel');
    assert.equal(panel.tagName, 'DETAILS', '设备事实面板应使用原生 details 披露控件');
    assert.equal(panel.open, false, '设备事实面板默认应为收起状态');
    assert.equal(panel.querySelector('.device-facts-header').tagName, 'SUMMARY', '事实面板头部应为可交互 summary');
    assert.equal(panel.querySelector('.device-facts-id').textContent.trim(), 'DEV-NGAF-001');
    assert.equal(panel.querySelector('.device-facts-status').textContent.trim(), '无授权');
    assert.equal(panel.querySelector('.device-facts-toggle').textContent.trim(), 'expand_more');

    const grid = panel.querySelector('.device-facts-grid');
    assert.ok(grid, '事实面板应包含 .device-facts-grid');
    const items = Array.from(grid.querySelectorAll('.device-fact-item'));
    assert.equal(items.length, 6, '事实面板应同时展示设备事实和当前授权概况');
    assert.deepEqual(
      items.map((item) => item.querySelector('.device-fact-label').textContent.trim()),
      ['来源', '授权状态', '累计测试', '历史申请', '当前模块', '当前容量']
    );
    assert.deepEqual(
      items.map((item) => item.querySelector('.device-fact-value').textContent.trim()),
      ['借测设备', '无授权', '0个月', '0次', '无', '0']
    );
    assert.doesNotMatch(panel.textContent, /实际产品/);
    assert.equal(panel.querySelector('input, select, textarea, button'), null);
    assert.equal(document.getElementById('currentAuthorizationOverview'), null, '不应再渲染重复的独立授权概况卡');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('多设备查询分别渲染事实面板并在逐个移除后同步清理', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const summary = document.getElementById('deviceFactsSummary');

    window.addChip('DEV-NGAF-001');
    window.addChip('DEV-NGAF-002');

    let panels = Array.from(summary.querySelectorAll('.device-facts-panel'));
    assert.equal(panels.length, 2, '两个设备应分别渲染事实面板');
    assert.deepEqual(
      panels.map((panel) => panel.querySelector('.device-facts-id').textContent.trim()),
      ['DEV-NGAF-001', 'DEV-NGAF-002']
    );

    window.removeDeviceChip('DEV-NGAF-001');
    panels = Array.from(summary.querySelectorAll('.device-facts-panel'));
    assert.equal(panels.length, 1, '移除一个设备后应只保留一个事实面板');
    assert.equal(panels[0].querySelector('.device-facts-id').textContent.trim(), 'DEV-NGAF-002');

    window.removeDeviceChip('DEV-NGAF-002');
    assert.equal(summary.querySelectorAll('.device-facts-panel').length, 0);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('切换产品后清空设备事实面板和应用状态', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    const summary = document.getElementById('deviceFactsSummary');
    product.value = '22';
    fireChange(product, window);
    window.addChip('DEV-NGAF-001');
    assert.equal(summary.querySelectorAll('.device-facts-panel').length, 1);

    product.value = '20';
    fireChange(product, window);
    assert.equal(summary.querySelectorAll('.device-facts-panel').length, 0);
    assert.equal(summary.textContent.trim(), '');
    assert.equal(window.applicationState.deviceFacts.length, 0);
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

    const summary = document.getElementById('deviceFactsSummary');
    const panel = summary.querySelector('.device-facts-panel');
    assert.ok(panel, '查询失败设备仍应展示事实面板');
    const status = panel.querySelector('.device-facts-status');
    assert.ok(status, '查询失败设备面板应展示头部状态');
    assert.deepEqual(
      {
        headerStatus: status.textContent.trim(),
        authorizationFact: getDeviceFactValue(panel, '授权状态'),
        headerAriaHidden: status.getAttribute('aria-hidden')
      },
      {
        headerStatus: '查询失败',
        authorizationFact: '查询失败',
        headerAriaHidden: 'true'
      },
      '查询失败状态应一致展示，且头部状态应避免与事实网格重复播报'
    );
    assert.doesNotMatch(panel.textContent, /无授权/);

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

test('纯软无历史设备直接识别为首次开通且不要求人工确认', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '2';
    fireChange(planType, window);
    window.addChip('UNKNOWN-001');

    const summary = document.getElementById('deviceFactsSummary');
    const panel = summary.querySelector('.device-facts-panel');
    assert.ok(panel, '无记录设备仍应展示事实面板');
    const status = panel.querySelector('.device-facts-status');
    assert.ok(status, '无记录设备面板应展示头部状态');
    assert.deepEqual(
      {
        headerStatus: status.textContent.trim(),
        authorizationFact: getDeviceFactValue(panel, '授权状态'),
        headerAriaHidden: status.getAttribute('aria-hidden')
      },
      {
        headerStatus: '无授权',
        authorizationFact: '无授权',
        headerAriaHidden: 'true'
      },
      '纯软无历史应按无授权展示，且头部状态应避免与事实网格重复播报'
    );

    assert.equal(window.applicationState.deviceFacts[0].lookupStatus, 'success');
    assert.equal(window.applicationState.deviceFacts[0].deviceSource, 'customer_owned');
    assert.equal(window.applicationState.deviceFacts[0].manualReviewRequired, false);
    assert.equal(document.getElementById('manualReviewRequired').value, '0');
    assert.equal(document.getElementById('deviceLookupBlocking').hidden, true);
    assert.equal(document.getElementById('authSceneFormItem').hidden, false);
    assert.equal(document.getElementById('authScene').value, 'first_open');
    assert.equal(document.getElementById('authSceneLabel').textContent.trim(), '首次开通测试授权');
    assert.equal(document.getElementById('requestContents').value, 'open');
  } finally {
    dom.window.close();
  }
});

test('硬件借测无资产记录直接阻断且不展示人工确认入口', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);
    const planType = document.getElementById('planDevType');
    planType.value = '1';
    fireChange(planType, window);
    window.addChip('UNKNOWN-BORROWED-001');

    const blocking = document.getElementById('deviceLookupBlocking');
    assert.equal(blocking.hidden, false);
    assert.match(blocking.textContent, /硬件借测不允许继续申请/);
    assert.equal(document.getElementById('authSceneRow').hidden, true);
    assert.equal(document.getElementById('requestContentsRow').hidden, true);
    assert.equal(document.getElementById('currentAuthorizationOverview'), null);
    assert.equal(document.getElementById('manualReviewRequired').value, '0');
    assert.equal(document.getElementById('retryDeviceLookup').hidden, true);
    assert.equal(document.getElementById('saveApplicationDraft').hidden, true);
    assert.notEqual(document.getElementById('syncToast').style.display, 'block');
    assert.deepEqual(errors, []);
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
