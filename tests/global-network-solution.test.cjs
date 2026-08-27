'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

function openSolutionTab(document) {
  const nav = document.querySelector('#navBar li[data-tab="solution"]');
  nav.click();
}
function click(document, window, id) {
  document.getElementById(id).dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
}
function selectBorrowCustomer(document, window, customerId) {
  const display = document.getElementById('solutionBorrowCustomerInfoDisplay');
  if (display.classList.contains('show')) click(document, window, 'solutionBorrowCustomerChange');
  const input = document.getElementById('solutionBorrowCustomerSearch');
  input.value = customerId;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
  document.querySelector(`[data-solution-borrow-customer="${customerId}"]`).click();
}

test('全球组网方案：借测单入口锁定 AF+SASE-GA+SASE-SWG 并可整单走完', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 方案配置抽屉里可见
    document.querySelector('#settingsDropdown .header-icon-btn').click();
    document.querySelector('#settingsDropdownMenu .settings-item').click();
    assert.match(document.getElementById('solutionConfigRows').textContent, /SOL-GLOBAL-005/);
    assert.match(document.getElementById('solutionConfigRows').textContent, /全球组网方案/);
    assert.match(document.getElementById('solutionConfigRows').textContent, /SASE-SWG/);
    click(document, window, 'solutionConfigReset');

    // 资产读取 payload 包含新方案
    click(document, window, 'solutionAssetRead');
    assert.match(document.getElementById('solutionAssetPreview').textContent, /SOL-GLOBAL-005/);

    // 借测单入口
    selectBorrowCustomer(document, window, 'C100107');
    assert.equal(document.getElementById('solutionBorrowCustomerName').textContent, '环球致远贸易有限公司');
    const order = document.getElementById('solutionBorrowOrder');
    assert.deepEqual([...order.options].map((o) => o.value), ['', 'BOR-202608-006']);
    order.value = 'BOR-202608-006';
    click(document, window, 'solutionBorrowLookup');

    // 锁定范围
    assert.match(document.getElementById('solutionLockedName').value, /全球组网方案/);
    const chips = [...document.querySelectorAll('#solutionLockedLines .solution-chip')].map((n) => n.textContent);
    assert.deepEqual(chips, ['AF', 'SASE-GA', 'SASE-SWG']);
    assert.match(document.getElementById('solutionLockedAuthEndDate').value, /（30天）/);

    // AF 硬件线工作台：设备ID 已从借测单带入，模块卡按生产环境 AF 授权表单展示
    const afPanel = document.getElementById('solutionProductPanel');
    assert.match(afPanel.textContent, /设备 ID/);
    assert.match(document.querySelector('[data-solution-param="deviceId"]').value, /GW-AF-930/);
    const afCards = afPanel.querySelectorAll('.solution-module-card-list .module-item');
    assert.equal(afCards.length, 16, 'AF 应展示 16 张生产对齐模块卡');
    assert.match(afPanel.textContent, /网关序列号/);
    assert.match(afPanel.textContent, /分支机构数/);
    assert.match(afPanel.textContent, /增强功能\(waf,pvs,dlp,tamper\)/);
    assert.match(afPanel.textContent, /云脑-云智/);
    assert.ok(afPanel.querySelector('[data-solution-param="af_gw_users"]'), '网关序列号卡应含用户个数输入');
    assert.equal(document.querySelector('[data-solution-param="af_gw_users"]').value, '10', '用户个数默认 10');
    assert.ok(afPanel.querySelector('[data-solution-param="af_vmware_bw"]'), 'VMware带宽授权应为下拉');
    assert.equal(document.querySelector('[data-solution-param="af_cpu"]').value, '授权CPU2核', '硬件规格默认授权CPU2核');

    // SASE-GA 面板：带宽为生产对齐五档下拉，无版本区分
    document.querySelector('[data-solution-line="SASE-GA"]').click();
    const gaPanel = document.getElementById('solutionProductPanel');
    assert.match(gaPanel.textContent, /带宽/);
    assert.equal(gaPanel.querySelector('[data-solution-param="bandwidth"]').tagName, 'SELECT', 'SASE-GA 带宽应为档位下拉');
    assert.deepEqual([...gaPanel.querySelectorAll('[data-solution-param="bandwidth"] option')].map((option) => option.textContent), ['5M', '10M', '20M', '30M', '50M']);
    assert.equal(gaPanel.querySelector('[data-solution-param="version"]'), null, 'SASE-GA 无版本区分，不应渲染版本字段');

    // SASE-SWG 面板：默认关闭态，显示按需提示而非表单
    document.querySelector('[data-solution-line="SASE-SWG"]').click();
    const swgPanel = document.getElementById('solutionProductPanel');
    assert.match(swgPanel.textContent, /按需产品线/, '默认关闭态应显示按需提示');

    // 按需开关：导航含开关，默认关闭；打开后渲染 XaaS 表单（无带宽无设备ID）
    const swgSwitch = document.querySelector('[data-solution-line-switch="SASE-SWG"]');
    assert.ok(swgSwitch, 'SASE-SWG 导航应展示按需开关');
    assert.equal(swgSwitch.classList.contains('active'), false, 'SASE-SWG 开关默认关闭');
    assert.equal(swgPanel.querySelectorAll('[data-solution-param]').length, 0, '关闭态不应渲染表单项');
    assert.equal(document.getElementById('solutionProductNav').textContent.includes('2/2'), true, '生效线计数应为 2/2');
    swgSwitch.click();
    const swgPanelOn = document.getElementById('solutionProductPanel');
    assert.match(swgPanelOn.textContent, /客户需求/);
    assert.match(swgPanelOn.textContent, /项目规模/);
    assert.match(swgPanelOn.textContent, /竞争对手/);
    assert.doesNotMatch(swgPanelOn.textContent, /带宽（M）|设备 ID|授权模块/);

    // 再关闭 → 面板自动跳回第一条生效线（AF），SASE-SWG 显示关闭态
    document.querySelector('[data-solution-line-switch="SASE-SWG"]').click();
    assert.equal(document.querySelector('[data-solution-line-switch="SASE-SWG"]').classList.contains('active'), false);
    assert.match(document.getElementById('solutionProductPanel').textContent, /AF 授权参数/, '关闭当前线后面板应跳回第一条生效线');
    const offBtn = document.querySelector('[data-solution-line="SASE-SWG"]');
    assert.ok(offBtn.classList.contains('is-off'), '关闭态导航项应带 is-off 样式');

    // 关闭态下整单可提交（SASE-SWG 不参与校验/提交/记录）
    document.querySelector('[data-solution-line="AF"]').click();
    assert.equal(document.getElementById('solutionSubmitError').hidden, true, '提交前不应显示校验错误');
    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);

    const parent = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(parent, '应生成解决方案记录主行');
    const detail = parent.nextElementSibling;
    assert.match(detail.textContent, /AF-8\.0\.99/);
    assert.doesNotMatch(detail.textContent, /SASE-GA 标准版/, 'SASE-GA 无版本区分，不应出现标准版');
    assert.doesNotMatch(detail.textContent, /SASE-SWG 标准版/, '关闭态下记录明细不应含 SASE-SWG');
    assert.match(detail.textContent, /云图ID: YT-10010777/);

    // 再走一单：打开开关后 SASE-SWG 参与整单并落记录
    selectBorrowCustomer(document, window, 'C100107');
    const order2 = document.getElementById('solutionBorrowOrder');
    order2.value = 'BOR-202608-006';
    click(document, window, 'solutionBorrowLookup');
    document.querySelector('[data-solution-line-switch="SASE-SWG"]').click();
    document.querySelector('[data-solution-line="SASE-SWG"]').click();
    assert.match(document.getElementById('solutionProductPanel').textContent, /客户需求/, '开关打开后 SASE-SWG 渲染表单');
    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);
    const detail2 = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]').nextElementSibling;
    assert.match(detail2.textContent, /SASE-SWG 标准版/, '打开开关后记录明细应含 SASE-SWG');
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
