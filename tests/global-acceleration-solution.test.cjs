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

    // SASE-ZTNA 按 XaaS 表单渲染：客户需求/项目规模/竞争对手，无设备ID
    document.querySelector('[data-solution-line="SASE-ZTNA"]').click();
    const ztnaPanel = document.getElementById('solutionProductPanel');
    assert.match(ztnaPanel.textContent, /客户需求/);
    assert.match(ztnaPanel.textContent, /项目规模/);
    assert.match(ztnaPanel.textContent, /竞争对手/);
    assert.equal(ztnaPanel.querySelector('[data-solution-param="deviceId"]'), null, 'SASE-ZTNA 为 XaaS 线不应渲染设备ID');

    // SASE-GA 保留带宽五档下拉
    document.querySelector('[data-solution-line="SASE-GA"]').click();
    const gaPanel = document.getElementById('solutionProductPanel');
    assert.equal(gaPanel.querySelector('[data-solution-param="bandwidth"]').tagName, 'SELECT');

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
