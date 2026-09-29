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

test('多云图账号选择器卡片（1:1 还原生产环境）：手机号匹配多租户展开卡片下拉、2x2网格回显与切换联动', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    const phoneInput = document.getElementById('solutionContactPhone');
    const cloudAccountGrid = document.getElementById('solutionCloudAccountGrid');
    assert.ok(cloudAccountGrid, '应存在多云图账号选择网格区块');
    assert.equal(cloudAccountGrid.style.display, 'none', '初始状态下云图账号选择区块应隐藏');

    // 1. 输入匹配多租户的手机号 13800138000
    phoneInput.value = '13800138000';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    // 验证多云图账号选择区块展示
    assert.equal(cloudAccountGrid.style.display, 'grid', '手机号匹配多个云图账号时应展开选择网格');
    const hint = document.getElementById('solutionContactPhoneHint');
    assert.match(hint.textContent, /已匹配到 4 个云图账号/);

    // 验证自定义下拉卡片列表选项
    const customSelect = cloudAccountGrid.querySelector('[data-select-id="solution-cloud-account"]');
    assert.ok(customSelect, '应存在自定义云图账号下拉组件');
    const list = customSelect.querySelector('.custom-select-list');
    const options = list.querySelectorAll('.cloud-account-option');
    assert.equal(options.length, 4, '应渲染 4 个租户卡片选项');

    // 验证卡片 2×2 网格字段完整性（包含云图ID、企业名称、主账号、主账号联系人）
    const opt0 = options[0];
    assert.equal(opt0.getAttribute('data-tenant-id'), '12713254');
    assert.equal(opt0.getAttribute('data-master-account'), '120@163.com');
    assert.equal(opt0.getAttribute('data-enterprise-name'), '广东省工商行政管理局');
    assert.equal(opt0.getAttribute('data-master-contact'), '彭某某');
    assert.match(opt0.textContent, /云图ID/);
    assert.match(opt0.textContent, /12713254/);
    assert.match(opt0.textContent, /广东省工商行政管理局/);
    assert.match(opt0.textContent, /120@163\.com/);
    assert.match(opt0.textContent, /彭某某/);

    // 验证 1:1 对齐生产环境默认选中 17964872
    const opt1 = options[1];
    assert.equal(opt1.getAttribute('data-tenant-id'), '17964872');
    assert.ok(opt1.classList.contains('selected'), '生产环境截图默认选中 17964872 广东行政学院');

    const triggerValue = customSelect.querySelector('.custom-select-value');
    assert.match(triggerValue.textContent, /17964872/);
    assert.match(triggerValue.textContent, /110@163\.com/);

    const nativeSelect = document.getElementById('solution-cloud-account');
    assert.equal(nativeSelect.value, '17964872');

    // 验证全局云图身份 Badge 同步显示 17964872
    const globalCloud = document.getElementById('solutionBorrowGlobalCloud');
    assert.equal(globalCloud.style.display, 'inline-block');
    assert.match(globalCloud.textContent, /17964872/);

    // 2. 点击触发器展开下拉列表，并切换为第一个租户 12713254
    const trigger = customSelect.querySelector('.custom-select-trigger');
    trigger.click();
    assert.ok(customSelect.classList.contains('open'), '点击触发器应展开下拉菜单');

    opt0.click();
    assert.ok(!customSelect.classList.contains('open'), '选择后下拉菜单应收起');
    assert.ok(opt0.classList.contains('selected'), '选项 12713254 应高亮选中');
    assert.ok(!opt1.classList.contains('selected'), '之前选中的项应取消高亮');

    // 验证触发器回显与全局云图身份更新
    assert.match(triggerValue.textContent, /12713254/);
    assert.match(triggerValue.textContent, /120@163\.com/);
    assert.equal(nativeSelect.value, '12713254');
    assert.match(globalCloud.textContent, /12713254/);

    const cloudHint = document.getElementById('solutionCloudAccountHint');
    assert.match(cloudHint.textContent, /12713254 · 120@163\.com（广东省工商行政管理局）/);

    // 3. 手机号改为单租户手机号（13612345678），多云图卡片选择器应隐藏
    phoneInput.value = '13612345678';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(cloudAccountGrid.style.display, 'none', '单租户手机号应隐藏多云图选择器网格');
    assert.match(globalCloud.textContent, /YT-10010688/);

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('区域字段规范：借测单/本地申请自动带入、下拉选择修改、整单必填强校验与记录回显', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 1. 借测单来源下的区域自动带入与校验
    selectBorrowCustomer(document, window, 'C100101'); // 华东智造，自带区域 上海市
    const borrowRegion = document.getElementById('solutionBorrowRegion');
    assert.ok(borrowRegion, '应存在借测单来源区域下拉框');
    assert.equal(borrowRegion.value, '上海市', '选择客户应自动带入客户所属区域');

    // 关联借测单
    const orderSelect = document.getElementById('solutionBorrowOrder');
    orderSelect.value = 'BOR-202608-001';
    click(document, window, 'solutionBorrowLookup');

    // 清空区域尝试提交，验证整单必填阻断
    borrowRegion.value = '';
    borrowRegion.dispatchEvent(new window.Event('change', { bubbles: true }));
    click(document, window, 'solutionSubmitWhole');

    const submitError = document.getElementById('solutionSubmitError');
    assert.equal(submitError.hidden, false, '清空区域应阻断整单提交');
    assert.match(submitError.textContent, /请选择区域。/);

    // 选择新区域（如 广东省）并重新提交
    borrowRegion.value = '广东省';
    borrowRegion.dispatchEvent(new window.Event('change', { bubbles: true }));
    click(document, window, 'solutionSubmitWhole');
    assert.equal(submitError.hidden, true, '填写真确区域后提交成功');

    // 验证生成的授权记录行中记录了区域属性
    const recordRow = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(recordRow, '应生成方案授权主行');
    assert.equal(recordRow.getAttribute('data-solution-region'), '广东省', '主行应回显填写的区域数据');

    // 2. 本地申请来源下的区域自动带入与校验
    chooseSolutionSource(document, window, 'local');
    const localConfig = document.getElementById('solutionLocalConfig');
    localConfig.value = 'SOL-ACCEL-006';
    localConfig.dispatchEvent(new window.Event('change', { bubbles: true }));

    selectLocalCustomer(document, window, 'C100108'); // 环宇速联，自带区域 广东省
    const localRegion = document.getElementById('solutionLocalRegion');
    assert.ok(localRegion, '应存在本地申请来源区域下拉框');
    assert.equal(localRegion.value, '广东省', '本地客户应自动带入区域');

    // 清空本地申请区域尝试提交
    localRegion.value = '';
    localRegion.dispatchEvent(new window.Event('change', { bubbles: true }));
    click(document, window, 'solutionSubmitWhole');
    const localSubmitError = document.getElementById('solutionSubmitError');
    assert.equal(localSubmitError.hidden, false);
    assert.match(localSubmitError.textContent, /请选择区域。/);

    // 修改为北京市
    localRegion.value = '北京市';
    localRegion.dispatchEvent(new window.Event('change', { bubbles: true }));
    // 补齐必填联系人手机号
    const phoneInput = document.getElementById('solutionContactPhone');
    phoneInput.value = '13900139000';
    phoneInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    click(document, window, 'solutionSubmitWhole');
    if (!localSubmitError.hidden) {
      assert.doesNotMatch(localSubmitError.textContent, /区域/);
    }

    // 3. 单产品 XaaS 表单区域必填校验
    document.querySelector('#navBar li[data-tab="xaas"]').click();
    const xaasRegion = document.getElementById('xaas-region');
    assert.ok(xaasRegion, '单产品 XaaS 表单中应存在区域字段');

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

