'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

function click(document, window, id) {
  const element = document.getElementById(id);
  assert.ok(element, `应存在 #${id}`);
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return element;
}

function openSolutionTab(document) {
  document.querySelector('#navBar li[data-tab="solution"]').click();
}

function selectBorrowCustomer(document, window, customerId) {
  const display = document.getElementById('solutionBorrowCustomerInfoDisplay');
  if (display.classList.contains('show')) click(document, window, 'solutionBorrowCustomerChange');
  const input = document.getElementById('solutionBorrowCustomerSearch');
  input.value = customerId;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.querySelector(`[data-solution-borrow-customer="${customerId}"]`).click();
}

function chipsOf(document) {
  return [...document.querySelectorAll('#solutionLockedLines .solution-chip')].map((node) => node.textContent);
}

test('分布式安全运营方案：配置页可见且资产读取包含 XDR+STA+AF', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    document.querySelector('#settingsDropdown .header-icon-btn').click();
    document.querySelector('#settingsDropdownMenu .settings-item').click();
    const rows = document.getElementById('solutionConfigRows');
    assert.match(rows.textContent, /SOL-DSOC-008/);
    assert.match(rows.textContent, /分布式安全运营方案/);
    const dsocRow = rows.querySelector('[data-solution-config-code="SOL-DSOC-008"]');
    assert.deepEqual([...dsocRow.querySelectorAll('.solution-chip')].map((chip) => chip.textContent), ['XDR', 'STA', 'AF']);

    click(document, window, 'solutionAssetRead');
    assert.match(document.getElementById('solutionAssetPreview').textContent, /SOL-DSOC-008/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('分布式安全运营方案：借测单入口展示业务申请信息模块并对齐生产授权字段', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    selectBorrowCustomer(document, window, 'C100109');
    assert.equal(document.getElementById('solutionBorrowCustomerName').textContent, '明澈水务集团有限公司');
    const order = document.getElementById('solutionBorrowOrder');
    assert.deepEqual([...order.options].map((option) => option.value), ['', 'BOR-202608-008']);
    order.value = 'BOR-202608-008';
    click(document, window, 'solutionBorrowLookup');

    // 锁定范围
    assert.match(document.getElementById('solutionLockedName').value, /SOL-DSOC-008 \| 分布式安全运营方案/);
    assert.deepEqual(chipsOf(document), ['XDR', 'STA', 'AF']);
    assert.equal(document.querySelector('.solution-page-head p'), null, '解决方案页不应显示副描述');

    // 业务申请信息模块：仅此方案展示，且业务字段默认预填
    assert.equal(document.getElementById('solutionBizSection').hidden, false, '分布式安全运营方案应展示业务申请信息模块');
    assert.equal(document.querySelector('#solutionBizSection .solution-hint-note'), null, '业务申请信息标题不应显示右侧说明');
    const bizGrid = document.getElementById('solutionBizGrid');
    assert.match(bizGrid.textContent, /测试主打场景/);
    assert.match(bizGrid.textContent, /测试驱动力/);
    assert.match(bizGrid.textContent, /客户预期效果/);
    assert.match(bizGrid.textContent, /平台接入组件说明/);
    assert.match(bizGrid.textContent, /测试需求调研文档/);
    assert.match(bizGrid.textContent, /客户原因及后续转销计划说明/);
    assert.equal(bizGrid.querySelectorAll('[data-solution-biz-param="testDrivers"] input').length, 6, '测试驱动力应为六项多选');
    assert.equal(bizGrid.querySelectorAll('[data-solution-biz-param="expectedEffects"] input').length, 5, '客户预期效果应为五项多选');
    assert.doesNotMatch(bizGrid.textContent, /KA客户|申请平台接入日志量|申请测试的高功能模块/, '红框字段不应保留在业务申请信息模块');
    assert.equal(bizGrid.querySelector('[data-solution-biz-param="kaCustomer"]'), null);
    assert.equal(bizGrid.querySelector('[data-solution-biz-param="dailyLogAmount"]'), null);
    assert.equal(bizGrid.querySelector('[data-solution-biz-param="highFunctionModules"]'), null);
    const choice = bizGrid.querySelector('[data-solution-biz-param="testDrivers"] .solution-checkbox');
    const choiceStyle = window.getComputedStyle(choice);
    assert.equal(choiceStyle.whiteSpace, 'normal', '长文本多选项应允许换行');
    assert.equal(choiceStyle.justifyContent, 'flex-start', '多选项文字应从左侧开始对齐');
    const mainScenarioField = bizGrid.querySelector('[data-solution-biz-param="mainScenario"]').closest('.solution-field');
    const mainScenarioLabel = mainScenarioField.querySelector(':scope > label');
    assert.equal(window.getComputedStyle(mainScenarioField).display, 'grid', '业务字段应采用左右布局');
    assert.equal(window.getComputedStyle(mainScenarioField).columnGap, '18px', '标题与控件应保持固定间距');
    assert.equal(window.getComputedStyle(mainScenarioLabel).marginTop, '8px', '左侧标题应与控件垂直对齐');
    ['mainScenario', 'componentNotes', 'resalePlan'].forEach((field) => {
      const control = bizGrid.querySelector(`[data-solution-biz-param="${field}"]`);
      assert.equal(window.getComputedStyle(control).height, '44px', `${field} 控件高度应统一为 44px`);
    });
    const uploadBox = bizGrid.querySelector('[data-solution-biz-param="researchDoc"]').closest('.solution-file-input');
    assert.equal(window.getComputedStyle(uploadBox).height, '44px', '上传区域高度应与其他控件一致');
    assert.equal(window.getComputedStyle(uploadBox.querySelector('.solution-file-btn')).alignItems, 'center', '上传按钮文字应垂直居中');

    // XDR 面板：版本下拉默认 LOCAL-XDR2.0.45，22 张生产对齐授权模块卡
    const xdrPanel = document.getElementById('solutionProductPanel');
    assert.match(xdrPanel.textContent, /XDR 授权参数/);
    const versionSelect = document.querySelector('[data-solution-param="version"]');
    assert.equal(versionSelect.tagName, 'SELECT', 'XDR 版本应为下拉可选');
    assert.equal(versionSelect.options.length, 1, 'XDR 版本下拉仅保留一个选项');
    assert.equal(versionSelect.value, 'LOCAL-XDR2.0.45及以上版本（XDR+GPT）', '默认选中 LOCAL-XDR2.0.45');
    const xdrCards = xdrPanel.querySelectorAll('.solution-module-card-list .module-item');
    assert.equal(xdrCards.length, 22, 'XDR 2.0.45 应展示 22 张生产对齐授权模块卡');
    assert.match(xdrPanel.textContent, /XDR平台软件/);
    assert.match(xdrPanel.textContent, /辅助运营GPT/);
    assert.match(xdrPanel.textContent, /智能值守GPT/);
    assert.match(xdrPanel.textContent, /cot功能类型/);
    assert.match(xdrPanel.textContent, /级联服务授权/, '2.0.45 新增级联服务授权卡');
    assert.match(xdrPanel.textContent, /XDR性能扩容授权\(天日志量\)/);
    assert.match(xdrPanel.textContent, /智能对抗服务/, '2.0.45 新增智能对抗服务卡');
    assert.match(xdrPanel.textContent, /云安全中心/);
    assert.doesNotMatch(xdrPanel.textContent, /每天日志接入量上限/, '2.0.45 不应有每天日志接入量上限卡');
    assert.equal(document.querySelector('[data-solution-param="xdr_platform_count"]').value, '3', '平台软件默认 3 亿条');
    assert.equal(document.querySelector('[data-solution-param="xdr_cascade_count"]').value, '1', '级联服务授权默认 1 个');
    assert.equal(document.querySelector('[data-solution-param="xdr_perf_log_count"]').value, '1', '性能扩容(天日志量)默认 1 亿条');
    assert.equal(document.querySelector('[data-solution-param="xdr_ops_gpt_enabled"]'), null, '2.0.45 辅助运营GPT 无是否启用字段');
    assert.equal(document.querySelector('[data-solution-param="xdr_traffic_gpt_enabled"]'), null, '2.0.45 流量检测GPT 无是否启用字段');
    assert.equal(document.querySelector('[data-solution-param="xdr_duty_gpt_cot"]').value, '匹配3节点XDR');
    assert.equal(document.querySelector('[data-solution-param="xdr_cloud_center_points"]').value, '1000');

    // STA 面板：版本默认 + 设备ID 从借测单带入 + 3 张模块卡
    document.querySelector('[data-solution-line="STA"]').click();
    const staPanel = document.getElementById('solutionProductPanel');
    assert.match(staPanel.textContent, /STA 授权参数/);
    assert.equal(document.querySelector('[data-solution-param="version"]').value, 'STA3.0.25');
    assert.equal(document.querySelector('[data-solution-param="deviceId"]').value, 'GW-STA-352');
    const staCards = staPanel.querySelectorAll('.solution-module-card-list .module-item');
    assert.equal(staCards.length, 3, 'STA 应展示 3 张授权模块卡');
    assert.match(staPanel.textContent, /网关序列号/);
    assert.match(staPanel.textContent, /Web应用防护/);
    assert.equal(document.querySelector('[data-solution-param="sta_lines"]').value, '4', 'STA 线路数默认 4');

    // AF 面板：复用 16 张生产对齐模块卡，设备ID 从借测单带入
    document.querySelector('[data-solution-line="AF"]').click();
    const afPanel = document.getElementById('solutionProductPanel');
    assert.equal(afPanel.querySelectorAll('.solution-module-card-list .module-item').length, 16);
    assert.equal(document.querySelector('[data-solution-param="deviceId"]').value, 'GW-AF-771');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('分布式安全运营方案：未上传调研文档阻断提交，补全后整单生成授权记录', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    selectBorrowCustomer(document, window, 'C100109');
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-008';
    click(document, window, 'solutionBorrowLookup');

    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionSubmitError').textContent, /请补全业务申请信息/);

    const docInput = document.querySelector('[data-solution-biz-param="researchDoc"]');
    Object.defineProperty(docInput, 'files', { value: [new window.File(['doc'], '分布式安全运营测试需求调研.docx')], configurable: true });
    docInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);
    const parent = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(parent, '应生成解决方案记录主行');
    assert.match(parent.textContent, /分布式安全运营方案/);
    const detail = parent.nextElementSibling;
    assert.match(detail.textContent, /LOCAL-XDR2\.0\.45及以上版本（XDR\+GPT）/);
    assert.match(detail.textContent, /STA3\.0\.25/);
    assert.match(detail.textContent, /云图ID: YT-10010999/);
    assert.match(detail.textContent, /LIC-STA-806/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('回归：其他方案下 XDR 仍走原 XaaS 表单且不展示业务申请信息模块', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    selectBorrowCustomer(document, window, 'C100106');
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-005';
    click(document, window, 'solutionBorrowLookup');

    assert.equal(document.getElementById('solutionBizSection').hidden, true, '云网安全运营方案不应展示业务申请信息模块');
    document.querySelector('[data-solution-line="SaaS-XDR"]').click();
    const panel = document.getElementById('solutionProductPanel');
    assert.match(panel.textContent, /客户信息收集表/, '原 XaaS XDR 表单应保留');
    assert.equal(panel.querySelectorAll('.solution-module-card-list .module-item').length, 0, '原 XaaS XDR 不应出现授权模块卡');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
