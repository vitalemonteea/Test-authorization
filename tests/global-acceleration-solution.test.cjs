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
  nav.click();
}

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

function chipsOf(document) {
  return [...document.querySelectorAll('#solutionLockedLines .solution-chip')].map((node) => node.textContent);
}

function typeParam(document, window, key, value) {
  const input = document.querySelector(`[data-solution-param="${key}"]`);
  assert.ok(input, `应存在参数项 ${key}`);
  input.value = value;
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

test('全球加速方案：配置页按 SaaS版/本地版 两条最小维度维护，资产读取可见', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    document.querySelector('#settingsDropdown .header-icon-btn').click();
    document.querySelector('#settingsDropdownMenu .settings-item').click();
    const rows = document.getElementById('solutionConfigRows');
    assert.match(rows.textContent, /SOL-ACCEL-006/);
    assert.match(rows.textContent, /全球加速方案-SaaS版/);
    assert.match(rows.textContent, /SOL-ACCEL-007/);
    assert.match(rows.textContent, /全球加速方案-本地版/);

    // 同一方案的两个版本各自关联自己的产品线（业务：SaaS=ZTNA+GA，本地=aTrust+GA）
    const saasRow = rows.querySelector('[data-solution-config-code="SOL-ACCEL-006"]');
    assert.deepEqual([...saasRow.querySelectorAll('.solution-chip')].map((chip) => chip.textContent), ['SASE-ZTNA', 'SASE-GA']);
    const localRow = rows.querySelector('[data-solution-config-code="SOL-ACCEL-007"]');
    assert.deepEqual([...localRow.querySelectorAll('.solution-chip')].map((chip) => chip.textContent), ['aTrust', 'SASE-GA']);

    click(document, window, 'solutionAssetRead');
    const payload = document.getElementById('solutionAssetPreview').textContent;
    assert.match(payload, /SOL-ACCEL-006/);
    assert.match(payload, /全球加速方案-SaaS版/);
    assert.match(payload, /SOL-ACCEL-007/);
    assert.match(payload, /全球加速方案-本地版/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('全球加速方案-SaaS版：借测单入口锁定 SASE-ZTNA+SASE-GA 并可整单走完', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    selectBorrowCustomer(document, window, 'C100108');
    assert.equal(document.getElementById('solutionBorrowCustomerName').textContent, '环宇速联科技有限公司');
    const order = document.getElementById('solutionBorrowOrder');
    assert.deepEqual([...order.options].map((option) => option.value), ['', 'BOR-202608-007']);
    order.value = 'BOR-202608-007';
    click(document, window, 'solutionBorrowLookup');

    // 锁定范围展示带版本标识的方案名
    assert.match(document.getElementById('solutionLockedName').value, /SOL-ACCEL-006 \| 全球加速方案-SaaS版/);
    assert.deepEqual(chipsOf(document), ['SASE-ZTNA', 'SASE-GA']);
    assert.match(document.getElementById('solutionLockedAuthEndDate').value, /（30天）/);
    assert.equal(document.querySelector('.solution-auth-end-icon'), null, '方案范围授权时间不应显示日历图标');

    // 业务申请信息模块：仅保留全球加速业务评估所需的客户需求、区域和备注
    assert.equal(document.getElementById('solutionAccelBizSection').hidden, false, '全球加速方案应展示业务申请信息模块');
    assert.equal(document.getElementById('solutionBizSection').hidden, true, '分布式安全运营业务模块不应展示');
    const accelGrid = document.getElementById('solutionAccelBizGrid');
    assert.match(accelGrid.textContent, /客户需求/);
    assert.match(accelGrid.textContent, /客户所在省份\/国家/);
    assert.match(accelGrid.textContent, /备注/);
    assert.equal(accelGrid.querySelectorAll('.solution-readonly-note').length, 0, 'SaaS版业务字段标签不应显示辅助文案');
    assert.equal(accelGrid.querySelectorAll('[data-solution-mock-link]').length, 0, 'SaaS版业务字段不应显示跳转链接');
    ['customerName', 'customerType', 'cloudTenantId', 'hardwareBorrowNo', 'testTimeSpec'].forEach((field) => {
      assert.equal(accelGrid.querySelector(`[data-solution-accel-param="${field}"]`), null, `SaaS版不应显示 ${field} 字段`);
    });
    assert.equal(document.getElementById('accelTestTimeHint'), null, '测试时间和规格字段及其提示应一并移除');

    // SASE-ZTNA 面板：业务字段已移至业务申请信息模块，仅剩授权有效期，无设备ID
    document.querySelector('[data-solution-line="SASE-ZTNA"]').click();
    const ztnaPanel = document.getElementById('solutionProductPanel');
    assert.doesNotMatch(ztnaPanel.textContent, /客户需求/);
    assert.doesNotMatch(ztnaPanel.textContent, /项目规模/);
    assert.doesNotMatch(ztnaPanel.textContent, /竞争对手/);
    assert.equal(ztnaPanel.querySelector('[data-solution-param="deviceId"]'), null, 'SASE-ZTNA 为 XaaS 线不应渲染设备ID');

    // SASE-GA 保留带宽五档下拉，业务字段同样移出
    document.querySelector('[data-solution-line="SASE-GA"]').click();
    const gaPanel = document.getElementById('solutionProductPanel');
    assert.equal(gaPanel.querySelector('[data-solution-param="bandwidth"]').tagName, 'SELECT');
    assert.doesNotMatch(gaPanel.textContent, /客户需求/);

    // 整单提交 → 直接生成授权记录
    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);
    const parent = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(parent, '应生成解决方案记录主行');
    assert.match(parent.textContent, /全球加速方案-SaaS版/);
    const detail = parent.nextElementSibling;
    assert.match(detail.textContent, /SASE-ZTNA 标准版/);
    assert.match(detail.textContent, /LIC-SASE-ZTNA-806/);
    assert.match(detail.textContent, /云图ID: YT-10010888/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('全球加速方案-本地版：本地申请入口锁定 aTrust+SASE-GA 并可整单走完', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    const source = document.getElementById('solutionSourceSelect');
    source.value = 'local';
    source.dispatchEvent(new window.Event('change', { bubbles: true }));

    const config = document.getElementById('solutionLocalConfig');
    assert.ok([...config.options].some((option) => option.value === 'SOL-ACCEL-007'), '本地入口下拉应含全球加速方案-本地版');
    config.value = 'SOL-ACCEL-007';
    config.dispatchEvent(new window.Event('change', { bubbles: true }));
    selectLocalCustomer(document, window, 'C100106');

    assert.match(document.getElementById('solutionLockedName').value, /SOL-ACCEL-007 \| 全球加速方案-本地版/);
    assert.deepEqual(chipsOf(document), ['aTrust', 'SASE-GA']);

    // 业务申请信息模块：本地版同样不显示红框中的五个字段
    assert.equal(document.getElementById('solutionAccelBizSection').hidden, false);
    const accelGrid = document.getElementById('solutionAccelBizGrid');
    assert.equal(accelGrid.querySelectorAll('.solution-readonly-note').length, 0, '本地版业务字段标签不应显示辅助文案');
    assert.equal(accelGrid.querySelectorAll('[data-solution-mock-link]').length, 0, '本地版业务字段不应显示跳转链接');
    ['customerName', 'customerType', 'cloudTenantId', 'hardwareBorrowNo', 'testTimeSpec'].forEach((field) => {
      assert.equal(accelGrid.querySelector(`[data-solution-accel-param="${field}"]`), null, `本地版不应显示 ${field} 字段`);
    });

    // SASE-GA 面板仅剩有效期+带宽，业务字段已移出
    document.querySelector('[data-solution-line="SASE-GA"]').click();
    const localGaPanel = document.getElementById('solutionProductPanel');
    assert.equal(localGaPanel.querySelector('[data-solution-param="bandwidth"]').tagName, 'SELECT');
    assert.doesNotMatch(localGaPanel.textContent, /客户需求/);

    // aTrust 走硬件线通用表单：版本默认带出，设备ID 需填写
    document.querySelector('[data-solution-line="aTrust"]').click();
    const atPanel = document.getElementById('solutionProductPanel');
    assert.match(atPanel.textContent, /设备 ID/);
    assert.equal(document.querySelector('[data-solution-param="version"]').value, 'aTrust-3.0.28');
    typeParam(document, window, 'deviceId', 'GW-AT-930');

    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);
    const parent = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(parent, '应生成解决方案记录主行');
    assert.match(parent.textContent, /全球加速方案-本地版/);
    const detail = parent.nextElementSibling;
    assert.match(detail.textContent, /aTrust-3\.0\.28/);
    assert.match(detail.textContent, /云图ID: YT-10010688/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
