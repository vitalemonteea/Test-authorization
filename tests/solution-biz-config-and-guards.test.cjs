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

test('业务申请信息自由配置引擎：配置抽屉支持选择模板、增删改字段并持久化', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);
    document.querySelector('#settingsDropdown .header-icon-btn').click();
    document.querySelector('#settingsDropdownMenu .settings-item').click();

    // 点击新增方案
    click(document, window, 'solutionConfigNew');
    assert.equal(document.getElementById('solutionConfigModal').hidden, false);

    // 检查模板下拉与字段容器
    const tplSelect = document.getElementById('solutionConfigBizTemplate');
    assert.ok(tplSelect, '应存在业务信息模板下拉');
    assert.equal(tplSelect.value, 'none');

    // 切换为 DSOC 模板
    tplSelect.value = 'dsoc';
    tplSelect.dispatchEvent(new window.Event('change', { bubbles: true }));

    const fieldsList = document.getElementById('solutionConfigBizFieldsList');
    const fieldRows = fieldsList.querySelectorAll('.solution-biz-field-row');
    assert.equal(fieldRows.length, 6, 'DSOC 模板应加载 6 个默认业务字段');

    // 点击添加自定义业务字段
    click(document, window, 'solutionConfigAddFieldBtn');
    const updatedRows = fieldsList.querySelectorAll('.solution-biz-field-row');
    assert.equal(updatedRows.length, 7, '应成功新增一个动态字段行');

    const lastRow = updatedRows[updatedRows.length - 1];
    const nameInp = lastRow.querySelector('.solution-biz-field-name');
    nameInp.value = '客户专属合规认证要求';

    // 填写基础信息并保存
    document.getElementById('solutionConfigCode').value = 'SOL-CUSTOM-TEST';
    document.getElementById('solutionConfigName').value = '自定义合规安全方案';
    document.getElementById('solutionConfigAuthDays').value = '45';
    document.querySelector('#solutionConfigChecks input[value="AF"]').checked = true;

    click(document, window, 'solutionConfigSave');
    assert.equal(document.getElementById('solutionConfigModal').hidden, true);

    // 列表应展示新增的方案与业务申请信息徽章
    const rows = document.getElementById('solutionConfigRows');
    assert.match(rows.textContent, /SOL-CUSTOM-TEST/);
    assert.match(rows.textContent, /自定义合规安全方案/);
    assert.match(rows.textContent, /分布式安全运营 \(7项\)/);

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('客户信息与所属行业及全局云图身份展示', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 检查所属行业下拉
    const industrySelect = document.getElementById('solutionBorrowIndustry');
    assert.ok(industrySelect, '应存在借测模式所属行业下拉');
    assert.equal(industrySelect.value, '大企业', '默认选中大企业');
    assert.match(industrySelect.textContent, /政府/);
    assert.match(industrySelect.textContent, /金融/);

    // 搜索并选择有云图账号的客户
    const input = document.getElementById('solutionBorrowCustomerSearch');
    input.value = 'C100101';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-solution-borrow-customer="C100101"]').click();

    // 检查全局云图身份标签
    const globalCloud = document.getElementById('solutionBorrowGlobalCloud');
    assert.equal(globalCloud.style.display, 'inline-block');
    assert.match(globalCloud.textContent, /云图ID: YT-10010101/);

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('成对协同组件至少选一个互斥守底交互', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 选择明澈水务借测单（包含 STA, AF, aES）
    const input = document.getElementById('solutionBorrowCustomerSearch');
    input.value = 'C100109';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-solution-borrow-customer="C100109"]').click();

    const order = document.getElementById('solutionBorrowOrder');
    order.value = 'BOR-202608-008';
    click(document, window, 'solutionBorrowLookup');

    // 开启 AF
    document.querySelector('[data-solution-line="AF"]').click();
    document.querySelector('[data-solution-line-switch="AF"]').click();
    const afSwitch = document.querySelector('[data-solution-line-switch="AF"]');
    assert.ok(afSwitch.classList.contains('active'), 'AF 应处于开启状态');

    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});
