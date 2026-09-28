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

function chooseSolutionSource(document, window, value) {
  const select = document.getElementById('solutionSourceSelect');
  select.value = value;
  select.dispatchEvent(new window.Event('change', { bubbles: true }));
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

test('联系人手机号：选择客户自动带入手机号、输入11位手机号自动匹配云图账号并刷新身份Badge', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    const phoneInput = document.getElementById('solutionContactPhone');
    assert.ok(phoneInput, '应存在联系人手机号输入框');
    assert.equal(phoneInput.value, '', '初始手机号为空');

    // 1. 搜索并选择客户 C100101（华东智造），应自动带入 13800138000
    selectBorrowCustomer(document, window, 'C100101');
    assert.equal(phoneInput.value, '13800138000', '选择客户应自动带入客户联系人手机号');

    // 2. 清空客户时手机号应重置
    click(document, window, 'solutionBorrowCustomerChange');
    assert.equal(phoneInput.value, '', '清空客户后联系人手机号应清空');

    // 3. 手动输入另一个 11 位手机号（星海智联 13612345678），应自动触发云图匹配
    phoneInput.value = '13612345678';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    const hint = document.getElementById('solutionContactPhoneHint');
    assert.match(hint.textContent, /已根据手机号匹配云图账号/);
    assert.match(hint.textContent, /YT-10010688/);

    // 全局云图身份 Badge 应更新为 YT-10010688
    const globalCloud = document.getElementById('solutionBorrowGlobalCloud');
    assert.equal(globalCloud.style.display, 'inline-block');
    assert.match(globalCloud.textContent, /YT-10010688/);

    // 4. 输入未知手机号
    phoneInput.value = '13899999999';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.match(hint.textContent, /该手机号暂未匹配到云图租户/);

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('XaaS 方案联系人手机号强校验阻断：涉及 XaaS 开通时必填且校验11位', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 切换到纯软本地申请模式
    chooseSolutionSource(document, window, 'local');

    // 选择方案 SOL-ACCEL-006（全球加速 SaaS 版，包含 SASE-ZTNA 和 SASE-GA 两个 XaaS 产品）
    const localConfig = document.getElementById('solutionLocalConfig');
    localConfig.value = 'SOL-ACCEL-006';
    localConfig.dispatchEvent(new window.Event('change', { bubbles: true }));

    // 选择具备云图身份的客户（C100108 环宇速联）
    selectLocalCustomer(document, window, 'C100108');

    // 手机号必填星号应显示
    const reqStar = document.getElementById('solutionContactPhoneRequired');
    assert.equal(reqStar.style.display, 'inline', '涉及 XaaS 开通时联系人手机号必须显示必填星号');

    // 清空手机号尝试提交
    const phoneInput = document.getElementById('solutionContactPhone');
    phoneInput.value = '';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    click(document, window, 'solutionSubmitWhole');
    const submitError = document.getElementById('solutionSubmitError');
    assert.equal(submitError.hidden, false, '未填手机号应阻断提交');
    assert.match(submitError.textContent, /必须填写客户联系人手机号/);

    // 填写非11位非法手机号
    phoneInput.value = '138123';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(document, window, 'solutionSubmitWhole');
    assert.equal(submitError.hidden, false);
    assert.match(submitError.textContent, /请填写正确的11位客户联系人手机号/);

    // 填写正确11位手机号后不再因手机号报错
    phoneInput.value = '13900139000';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(document, window, 'solutionSubmitWhole');
    if (!submitError.hidden) {
      assert.doesNotMatch(submitError.textContent, /手机号/);
    }

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('借测单设备 ID 继承防篡改锁定，并支持点击“+ 添加设备”追加多设备输入与删除', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 选择环球致远借测单（包含 AF 设备 GW-AF-930）
    selectBorrowCustomer(document, window, 'C100107');
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-006';
    click(document, window, 'solutionBorrowLookup');

    // 验证借测单自带的主设备 ID 输入框处于只读锁定状态
    const mainDevInput = document.querySelector('[data-solution-param="deviceId"]');
    assert.ok(mainDevInput, '应存在主设备 ID 输入框');
    assert.equal(mainDevInput.value, 'GW-AF-930', '应带入借测单设备 ID');
    assert.equal(mainDevInput.hasAttribute('readonly'), true, '借测单自带设备 ID 必须只读锁定防篡改');
    assert.match(document.getElementById('solutionProductPanel').textContent, /来自借测单，已锁定不可修改/);

    // 检查是否存在“+ 添加设备”按钮
    let addBtn = document.querySelector('[data-solution-add-device="AF"]');
    assert.ok(addBtn, 'AF 产品区应提供“+ 添加设备”按钮');

    // 点击“+ 添加设备”
    addBtn.click();

    // 检查新增的追加设备输入框
    let extraInputs = document.querySelectorAll('[data-solution-extra-device="AF"]');
    assert.equal(extraInputs.length, 1, '应渲染 1 个追加设备输入框');
    assert.equal(extraInputs[0].hasAttribute('readonly'), false, '追加的设备输入框应允许用户编辑输入');

    // 验证空白追加设备校验阻断
    click(document, window, 'solutionSubmitWhole');
    const submitError = document.getElementById('solutionSubmitError');
    assert.equal(submitError.hidden, false);
    assert.match(submitError.textContent, /追加的设备 ID 不能为空/);

    // 输入追加设备 ID
    extraInputs[0].value = 'GW-AF-EXTRA-002';
    extraInputs[0].dispatchEvent(new window.Event('input', { bubbles: true }));

    // 再次点击“+ 添加设备”追加第二个（重新查询按钮避免旧引用）
    document.querySelector('[data-solution-add-device="AF"]').click();
    extraInputs = document.querySelectorAll('[data-solution-extra-device="AF"]');
    assert.equal(extraInputs.length, 2, '应渲染 2 个追加设备输入框');

    // 点击第二个追加设备的删除按钮
    const removeBtns = document.querySelectorAll('[data-solution-remove-device="AF"]');
    assert.equal(removeBtns.length, 2, '每个追加设备应有删除按钮');
    removeBtns[1].click();

    extraInputs = document.querySelectorAll('[data-solution-extra-device="AF"]');
    assert.equal(extraInputs.length, 1, '删除后应保留 1 个追加设备');
    assert.equal(extraInputs[0].value, 'GW-AF-EXTRA-002');

    // 提交申请，验证生成的记录
    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);

    const generatedRow = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(generatedRow, '应生成方案授权主行');

    // 验证行属性或明细包含追加的设备
    const detailRow = generatedRow.nextElementSibling;
    assert.ok(detailRow, '应存在展开明细行');
    assert.match(detailRow.textContent, /GW-AF-EXTRA-002/, '明细行中应回显追加的设备 ID');

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('借测单客户级联筛选与多维条件联动', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 1. 客户搜索框模糊过滤
    const searchInput = document.getElementById('solutionBorrowCustomerSearch');
    const dropdown = document.getElementById('solutionBorrowCustomerDropdown');

    searchInput.value = '北辰';
    searchInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    assert.ok(dropdown.classList.contains('show'), '搜索时下拉菜单应展开');
    const items = dropdown.querySelectorAll('[data-solution-borrow-customer]');
    assert.equal(items.length, 1, '搜索“北辰”应只过滤出1条客户记录');
    assert.equal(items[0].getAttribute('data-solution-borrow-customer'), 'C100102');
    assert.match(items[0].textContent, /北辰智慧能源/);

    // 2. 选中北辰能源
    items[0].click();
    assert.equal(document.getElementById('solutionBorrowCustomerName').textContent, '北辰智慧能源有限公司');
    assert.equal(searchInput.value, '北辰智慧能源有限公司');

    // 3. 验证借测单下拉联动：仅包含北辰能源的借测单
    const orderSelect = document.getElementById('solutionBorrowOrder');
    assert.equal(orderSelect.disabled, false, '选择客户后借测单下拉解除禁用');
    assert.deepEqual([...orderSelect.options].map(o => o.value), ['', 'BOR-202608-002']);

    // 4. 点击修改/清空重置
    click(document, window, 'solutionBorrowCustomerChange');
    assert.equal(searchInput.value, '');
    assert.equal(orderSelect.disabled, true, '清空客户后借测单下拉应恢复禁用');
    assert.equal(orderSelect.value, '');

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
