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

function chooseBorrowOrder(document, window, value) {
  document.getElementById('solutionBorrowOrder').value = value;
  click(document, window, 'solutionBorrowLookup');
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
    assert.equal(document.querySelectorAll('#solutionLockedLines .solution-chip').length, 5);
    assert.equal(document.querySelectorAll('#solutionLockedLines button, #solutionLockedLines input, #solutionLockedLines select').length, 0);
  } finally { dom.window.close(); }
});

test('纯软件本地申请只选择启用配置并锁定产品线', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openSolutionTab(document);
    document.querySelector('[data-solution-source="local"]').click();
    assert.equal(document.getElementById('solutionLocalSource').hidden, false);
    const select = document.getElementById('solutionLocalConfig');
    assert.equal([...select.options].some((option) => option.value === 'SOL-LEGACY-003'), false);
    select.value = 'SOL-CLOUD-001';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
    document.getElementById('solutionLocalCustomer').value = '本地软件客户';
    ['HCI', 'AC', 'NGAF', 'AD', 'WOC'].forEach((line, index) => {
      document.querySelector(`[data-solution-line="${line}"]`).click();
      const input = document.querySelector('[data-solution-param="deviceId"]');
      input.value = `LOCAL-${line}-${index + 1}`;
      input.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    assert.equal(document.querySelectorAll('#solutionLockedLines .solution-chip').length, 5);
    click(document, window, 'solutionPreviewWhole');
    assert.match(document.getElementById('solutionApprovalContent').textContent, /纯软件本地申请/);
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
  } finally { dom.window.close(); }
});
