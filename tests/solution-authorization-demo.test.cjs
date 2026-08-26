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
  const nav = document.querySelector('#navBar li[data-tab="solution"]');
  assert.ok(nav, 'V2 左侧导航应新增解决方案型授权 Tab');
  nav.click();
}

const borrowCustomerByOrder = {
  'BOR-202608-001': 'C100101',
  'BOR-202608-002': 'C100102',
  'BOR-202608-003': 'C100103',
  'BOR-202608-004': 'C100104',
  'BOR-202608-ERR': 'C100105',
  'BOR-202608-005': 'C100106'
};

function selectBorrowCustomer(document, window, customerId) {
  const display = document.getElementById('solutionBorrowCustomerInfoDisplay');
  if (display.classList.contains('show')) click(document, window, 'solutionBorrowCustomerChange');
  const input = document.getElementById('solutionBorrowCustomerSearch');
  input.value = customerId;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  const customer = document.querySelector(`[data-solution-borrow-customer="${customerId}"]`);
  assert.ok(customer, `应展示客户 ${customerId}`);
  customer.click();
}

function selectLocalCustomer(document, window, customerId) {
  const display = document.getElementById('solutionLocalCustomerInfoDisplay');
  if (display.classList.contains('show')) click(document, window, 'solutionLocalCustomerChange');
  const input = document.getElementById('solutionLocalCustomerSearch');
  input.value = customerId;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  const customer = document.querySelector(`[data-solution-local-customer="${customerId}"]`);
  assert.ok(customer, `应展示本地客户 ${customerId}`);
  customer.click();
}

function chooseBorrowOrder(document, window, value) {
  selectBorrowCustomer(document, window, borrowCustomerByOrder[value]);
  document.getElementById('solutionBorrowOrder').value = value;
  click(document, window, 'solutionBorrowLookup');
}

function chooseSolutionSource(document, window, value) {
  const select = document.getElementById('solutionSourceSelect');
  select.value = value;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function submitForApproval(document, window) {
  click(document, window, 'solutionPreviewWhole');
  assert.equal(document.getElementById('solutionApprovalModal').hidden, false);
  assert.match(document.getElementById('solutionApprovalContent').textContent, /整套方案，一张 W3 申请单/);
  click(document, window, 'solutionSubmitWhole');
  assert.match(document.getElementById('solutionApplicationStatus').textContent, /待 W3 审批/);
}

test('解决方案型授权作为 V2 新 Tab 打开，不再使用独立页面', () => {
  const { dom, document, errors } = loadV2Dom();
  try {
    const topTab = document.querySelector('#top_tabs li[data-tab="solution"]');
    assert.ok(topTab, 'V2 顶部应存在解决方案型授权 Tab');
    openSolutionTab(document);
    assert.equal(document.body.dataset.activeTab, 'solution');
    assert.equal(document.getElementById('content-solution').style.display, 'block');
    assert.equal(document.getElementById('content-hardware').style.display, 'none');
    assert.ok(document.querySelector('#navBar li[data-tab="solution"]').classList.contains('layui-this'));
    assert.ok(topTab.classList.contains('layui-this'));
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('V2 解决方案配置收进顶部设置抽屉，支持筛选、新增、编辑、启停和启用配置读取', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    document.querySelector('#settingsDropdown .header-icon-btn').click();
    assert.ok(document.getElementById('settingsDropdownMenu').classList.contains('show'), '设置齿轮应展开下拉菜单');
    document.querySelector('#settingsDropdownMenu .settings-item').click();
    assert.equal(document.getElementById('solutionConfigDrawer').hidden, false, '应打开解决方案配置抽屉');
    document.getElementById('solutionConfigSearch').value = '安全态势';
    click(document, window, 'solutionConfigQuery');
    assert.match(document.getElementById('solutionConfigRows').textContent, /安全态势感知方案/);
    assert.doesNotMatch(document.getElementById('solutionConfigRows').textContent, /企业云一体化方案/);
    click(document, window, 'solutionConfigReset');
    click(document, window, 'solutionConfigNew');
    document.getElementById('solutionConfigCode').value = 'SOL-DEMO-006';
    document.getElementById('solutionConfigName').value = '演示组合方案';
    document.getElementById('solutionConfigAuthDays').value = '90';
    document.querySelector('#solutionConfigChecks input[value="HCI"]').checked = true;
    document.querySelector('#solutionConfigChecks input[value="XDR"]').checked = true;
    click(document, window, 'solutionConfigSave');
    let row = document.querySelector('[data-solution-config-code="SOL-DEMO-006"]');
    assert.ok(row);
    row.querySelector('[data-solution-config-action="toggle"]').click();
    row = document.querySelector('[data-solution-config-code="SOL-DEMO-006"]');
    assert.match(row.textContent, /停用/);
    row.querySelector('[data-solution-config-action="edit"]').click();
    document.getElementById('solutionConfigName').value = '演示组合方案已编辑';
    click(document, window, 'solutionConfigSave');
    assert.match(document.getElementById('solutionConfigRows').textContent, /演示组合方案已编辑/);
    click(document, window, 'solutionAssetRead');
    const payload = document.getElementById('solutionAssetPreview').textContent;
    assert.match(payload, /SOL-CLOUD-001/);
    assert.doesNotMatch(payload, /SOL-LEGACY-003|SOL-DEMO-006/);
  } finally { dom.window.close(); }
});

test('授权类型使用表单下拉，并支持按客户筛选 Mock 借测单', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    const source = document.getElementById('solutionSourceSelect');
    assert.ok(source, '授权类型应为表单下拉字段');
    assert.deepEqual([...source.options].map((option) => option.textContent.trim()), ['关联借测单', '纯软件本地申请']);
    assert.equal(document.querySelectorAll('.solution-source-tabs, [data-solution-source]').length, 0, '不应保留 Tab 式申请入口');
    assert.ok(document.querySelector('#content-solution .solution-form-grid'), '申请信息应复用标准双列表单栅格');
    assert.equal(document.querySelectorAll('#content-solution .solution-step-no').length, 0, '页面不应保留独立的步骤圆点样式');
    assert.ok(document.getElementById('solutionBorrowCustomerField').classList.contains('solution-form-row-full'), '客户查询应独占整行，保障摘要信息完整展示');
    assert.match(document.querySelector('label[for="solutionBorrowCustomerSearch"]').textContent, /\*客户/, '客户应标记为必填');
    assert.equal(document.getElementById('solutionBorrowCustomerSearch').required, true, '客户查询字段应具备原生必填语义');
    const borrowOrder = document.getElementById('solutionBorrowOrder');
    assert.ok(borrowOrder.closest('.solution-form-row').classList.contains('solution-form-row-full'), '借测单号应独占下一整行展示');
    assert.equal(borrowOrder.disabled, true, '未选择客户时不应允许选择借测单');
    click(document, window, 'solutionBorrowLookup');
    assert.match(document.getElementById('solutionBorrowState').textContent, /请先选择客户/, '未选择客户时不应允许查询');
    const customerSearch = document.getElementById('solutionBorrowCustomerSearch');
    customerSearch.value = '华东智造';
    customerSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
    const customer = document.querySelector('[data-solution-borrow-customer="C100101"]');
    assert.ok(customer, '应展示匹配客户');
    customer.click();
    assert.ok(document.getElementById('solutionBorrowCustomerInfoDisplay').classList.contains('show'));
    assert.equal(document.getElementById('solutionBorrowCustomerName').textContent, '华东智造集团有限公司');
    assert.equal(document.getElementById('solutionBorrowCustomerCloud').hidden, true, '普通方案尚未关联时不应展示 XaaS 云图身份');
    assert.equal(borrowOrder.disabled, false, '选择客户后才允许选择对应借测单');
    assert.deepEqual([...borrowOrder.options].map((option) => option.value), ['', 'BOR-202608-001']);
    click(document, window, 'solutionBorrowCustomerChange');
    assert.equal(document.getElementById('solutionBorrowCustomerInfoDisplay').classList.contains('show'), false);
    assert.equal(borrowOrder.disabled, true, '更换客户后应重新阻止借测单查询');
    assert.deepEqual([...borrowOrder.options].map((option) => option.value), ['']);
  } finally { dom.window.close(); }
});

test('V2 新 Tab 完整表现借测单有效、未审批、已归还、已撤销和查询失败', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseBorrowOrder(document, window, 'BOR-202608-002');
    assert.match(document.getElementById('solutionBorrowState').textContent, /尚未审批通过/);
    chooseBorrowOrder(document, window, 'BOR-202608-003');
    assert.match(document.getElementById('solutionBorrowState').textContent, /已归还/);
    chooseBorrowOrder(document, window, 'BOR-202608-004');
    assert.match(document.getElementById('solutionBorrowState').textContent, /已撤销/);
    chooseBorrowOrder(document, window, 'BOR-202608-ERR');
    assert.match(document.getElementById('solutionBorrowState').textContent, /查询失败/);
    chooseBorrowOrder(document, window, 'BOR-202608-001');
    assert.equal(document.getElementById('solutionBorrowInfo').hidden, false);
    assert.match(document.getElementById('solutionLockedName').value, /企业云一体化方案/);
    assert.equal(document.getElementById('solutionLockedName').readOnly, true);
    assert.equal(document.querySelectorAll('#solutionLockedLines .solution-chip').length, 6);
    assert.match(document.getElementById('solutionLockedLines').textContent, /SaaS-XDR/, '企业云一体化方案演示设备授权与 XaaS 授权并存');
    assert.equal(document.querySelectorAll('#solutionLockedLines button, #solutionLockedLines input, #solutionLockedLines select').length, 0);
  } finally { dom.window.close(); }
});

test('纯软件本地申请只选择启用配置并锁定产品线', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseSolutionSource(document, window, 'local');
    assert.equal(document.getElementById('solutionLocalSource').hidden, false);
    const select = document.getElementById('solutionLocalConfig');
    assert.equal([...select.options].some((option) => option.value === 'SOL-LEGACY-003'), false);
    select.value = 'SOL-CLOUD-001';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    selectLocalCustomer(document, window, 'C100101');
    ['HCI', 'AC', 'NGAF', 'AD', 'WOC'].forEach((line, index) => {
      document.querySelector(`[data-solution-line="${line}"]`).click();
      const input = document.querySelector('[data-solution-param="deviceId"]');
      input.value = `LOCAL-${line}-${index + 1}`;
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    assert.equal(document.querySelectorAll('#solutionLockedLines .solution-chip').length, 6);
    click(document, window, 'solutionPreviewWhole');
    assert.match(document.getElementById('solutionApprovalContent').textContent, /纯软件本地申请/);
  } finally { dom.window.close(); }
});

test('产品授权工作区模块以独立开关卡片展示（NGAF/HCI 对齐产品授权）', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseBorrowOrder(document, window, 'BOR-202608-001');

    document.querySelector('[data-solution-line="NGAF"]').click();
    let panel = document.getElementById('solutionProductPanel');
    const ngafCards = panel.querySelectorAll('.solution-module-card-list .module-item');
    assert.equal(ngafCards.length, 17, 'NGAF 应展示 17 张独立模块卡');
    assert.match(panel.textContent, /Gateway/);
    assert.match(panel.textContent, /SSL VPN/);
    assert.match(panel.textContent, /Fingerprint Signature Database Update/);
    assert.ok(panel.querySelector('[data-solution-param="NGAF_gateway_max_users"]'), 'Gateway 卡应含参数输入');
    assert.doesNotMatch(panel.textContent, /授权模块（多选）/, '不应残留 checkbox 多选形态');

    // toggle 独立开关：关闭 Gateway 不影响其它卡
    const gwToggle = panel.querySelector('[data-solution-module-toggle="Gateway"]');
    gwToggle.click();
    assert.equal(gwToggle.closest('.module-item').classList.contains('disabled'), true);
    assert.equal(gwToggle.closest('.module-item').querySelector('.module-status').textContent, '未启用');
    gwToggle.click();
    assert.equal(gwToggle.closest('.module-item').classList.contains('disabled'), false);

    document.querySelector('[data-solution-line="HCI"]').click();
    panel = document.getElementById('solutionProductPanel');
    const hciCards = panel.querySelectorAll('.solution-module-card-list .module-item');
    assert.equal(hciCards.length, 3, 'HCI 应展示 3 张模块卡');
    assert.match(panel.textContent, /计算虚拟化/);
    assert.match(panel.textContent, /网络虚拟化/);
    assert.ok(panel.querySelector('[data-solution-param="aSVhost_cpu"]'), '计算虚拟化卡应含参数输入');

    document.querySelector('[data-solution-line="AC"]').click();
    panel = document.getElementById('solutionProductPanel');
    const acCards = panel.querySelectorAll('.solution-module-card-list .module-item');
    assert.equal(acCards.length, 8, 'AC 应展示 8 张独立模块卡');
    assert.match(panel.textContent, /网关序列号/);
    assert.match(panel.textContent, /多功能序列号/);
    assert.match(panel.textContent, /防泄密外发审计序列号/);
    assert.match(panel.textContent, /VPN配置/);
    assert.match(panel.textContent, /代理上网/);
    assert.ok(panel.querySelector('[data-solution-param="gatewayLines"]'), '网关序列号卡应含线路数输入');
    assert.equal(panel.querySelectorAll('[data-solution-param="multiFeatures"] .solution-switch').length, 7, '多功能序列号应含 7 个功能开关');
  } finally { dom.window.close(); }
});

test('V2 解决方案整单审批支持驳回重提和授权失败回滚', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseBorrowOrder(document, window, 'BOR-202608-001');
    submitForApproval(document, window);
    click(document, window, 'solutionSimulateReject');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /驳回/);
    click(document, window, 'solutionResubmit');
    click(document, window, 'solutionSimulateFailure');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /整单失败/);
    assert.match(document.getElementById('solutionAuthorizationResult').textContent, /已回滚/);
    assert.match(document.getElementById('solutionAuthorizationResult').textContent, /授权失败/);
    assert.equal(document.querySelectorAll('#content-records [data-solution-generated="true"]').length, 0);
  } finally { dom.window.close(); }
});

test('全部产品成功后向 V2 现有记录表新增一组解决方案主行和展开行', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseBorrowOrder(document, window, 'BOR-202608-001');
    submitForApproval(document, window);
    click(document, window, 'solutionSimulateSuccess');
    const parent = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(parent);
    assert.match(parent.textContent, /SOL-20260806-003/);
    const detail = parent.nextElementSibling;
    assert.ok(detail.classList.contains('solution-detail-row'));
    assert.equal(detail.dataset.solutionGeneratedDetail, 'true');
    parent.querySelector('button').click();
    assert.notEqual(detail.style.display, 'none');
    assert.match(detail.textContent, /HCI-6\.8\.1-VKEY/);
    assert.match(detail.textContent, /LIC-HCI-806/);
    assert.match(detail.textContent, /SaaS-XDR 标准版/);
    assert.match(detail.textContent, /LIC-SaaS-XDR-806/);
    assert.match(detail.textContent, /云图ID: YT-10010101/);
  } finally { dom.window.close(); }
});

test('XaaS Mock 方案可从资产配置、有效借测单和客户云图信息进入工作台', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    document.querySelector('#settingsDropdown .header-icon-btn').click();
    document.querySelector('#settingsDropdownMenu .settings-item').click();
    assert.match(document.getElementById('solutionConfigRows').textContent, /SOL-XAAS-004/);
    assert.match(document.getElementById('solutionConfigRows').textContent, /SASE-GA/);
    assert.match(document.getElementById('solutionConfigRows').textContent, /SaaS-XDR/);
    click(document, window, 'solutionAssetRead');
    assert.match(document.getElementById('solutionAssetPreview').textContent, /SOL-XAAS-004/);
    chooseBorrowOrder(document, window, 'BOR-202608-005');
    assert.equal(document.getElementById('solutionBorrowCustomerCloud').hidden, true, '单云图账号应自动关联并隐藏选择字段，与 XaaS 申请保持一致');
    assert.match(document.getElementById('solutionLockedName').value, /云网安全运营方案/);
    assert.deepEqual([...document.querySelectorAll('#solutionLockedLines .solution-chip')].map((node) => node.textContent), ['SASE-GA', 'SaaS-XDR']);
  } finally { dom.window.close(); }
});

test('XaaS 产品线展示专属完整参数并正确联动 PK 条件字段', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseBorrowOrder(document, window, 'BOR-202608-005');
    const sasePanel = document.getElementById('solutionProductPanel');
    assert.match(sasePanel.textContent, /带宽（M）/);
    assert.match(sasePanel.textContent, /客户需求/);
    assert.doesNotMatch(sasePanel.textContent, /设备 ID|授权模块/);
    document.querySelector('[data-solution-line="SaaS-XDR"]').click();
    const xdrPanel = document.getElementById('solutionProductPanel');
    assert.match(xdrPanel.textContent, /日志量（万条）/);
    assert.match(xdrPanel.textContent, /客户信息收集表/);
    const componentOption = xdrPanel.querySelector('.solution-checkbox');
    const componentStyle = window.getComputedStyle(componentOption);
    assert.equal(componentStyle.display, 'flex', '组件勾选框与文字应横向排列');
    assert.equal(componentStyle.flexDirection, 'row');
    assert.equal(componentStyle.alignItems, 'center', '组件内容应垂直居中');
    assert.equal(componentStyle.justifyContent, 'center', '组件内容应水平居中');
    const pk = xdrPanel.querySelector('[data-solution-param="isPk"]');
    pk.value = '否';
    pk.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(document.querySelector('[data-solution-pk-field]').hidden, true);
  } finally { dom.window.close(); }
});

test('本地 XaaS 申请必须选择带云图身份的客户，缺失产品参数会阻断整单提交', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseSolutionSource(document, window, 'local');
    const config = document.getElementById('solutionLocalConfig');
    config.value = 'SOL-XAAS-004';
    config.dispatchEvent(new window.Event('change', { bubbles: true }));
    selectLocalCustomer(document, window, 'C100102');
    click(document, window, 'solutionPreviewWhole');
    assert.match(document.getElementById('solutionApprovalContent').textContent, /云图账号和云图ID/);
    selectLocalCustomer(document, window, 'C100106');
    document.querySelector('[data-solution-line="SaaS-XDR"]').click();
    const logAmount = document.querySelector('[data-solution-param="logAmount"]');
    logAmount.value = '';
    logAmount.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(document, window, 'solutionPreviewWhole');
    assert.match(document.getElementById('solutionApprovalContent').textContent, /SaaS-XDR 的授权参数未填写完整/);
    logAmount.value = '20000';
    logAmount.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(document, window, 'solutionPreviewWhole');
    assert.doesNotMatch(document.getElementById('solutionApprovalContent').textContent, /授权参数未填写完整/);
    assert.match(document.getElementById('solutionApprovalContent').textContent, /xinghai-admin/);
  } finally { dom.window.close(); }
});

test('XaaS 方案整单成功后复用 SOL 主行和展开明细展示云图ID与授权码', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    chooseBorrowOrder(document, window, 'BOR-202608-005');
    submitForApproval(document, window);
    click(document, window, 'solutionSimulateSuccess');
    const parent = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.match(parent.textContent, /云网安全运营方案/);
    assert.match(parent.textContent, /关联借测单/);
    const detail = parent.nextElementSibling;
    parent.querySelector('button').click();
    assert.match(detail.textContent, /设备ID\/云图ID/);
    assert.match(detail.textContent, /云图ID: YT-10010688/);
    assert.match(detail.textContent, /SASE-GA 标准版/);
    assert.match(detail.textContent, /SaaS-XDR 标准版/);
    assert.match(detail.textContent, /LIC-SASE-GA-806/);
    assert.match(detail.textContent, /LIC-SaaS-XDR-806/);
  } finally { dom.window.close(); }
});