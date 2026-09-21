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

test('客户信息与所属行业（对齐XaaS二级联动与备注）及全局云图身份展示', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openSolutionTab(document);

    // 检查行业标签及备注 Tooltip（1:1 对齐 XaaS）
    const industryRow = document.getElementById('solutionBorrowIndustryRow');
    assert.ok(industryRow, '应存在借测模式行业行');
    assert.match(industryRow.textContent, /行业/);
    assert.match(industryRow.textContent, /行业 备注/);
    assert.match(industryRow.textContent, /一级行业选择后，二级行业根据一级分类联动展示/);

    // 检查一级与二级行业下拉
    const l1Select = document.getElementById('solution-borrow-industry-l1');
    const l2Select = document.getElementById('solution-borrow-industry-l2');
    assert.ok(l1Select, '应存在一级行业下拉');
    assert.ok(l2Select, '应存在二级行业下拉');
    assert.equal(l1Select.value, '', '初始一级行业为空');
    assert.equal(l2Select.disabled, true, '初始二级行业未选一级前处于禁用态');
    assert.match(l1Select.textContent, /政府/);
    assert.match(l1Select.textContent, /制造业/);

    // 手动切换一级行业为政府，检查二级行业联动
    l1Select.value = '政府';
    l1Select.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(l2Select.disabled, false, '选择一级行业后二级行业应解除禁用');
    assert.match(l2Select.textContent, /中央部委/);
    assert.match(l2Select.textContent, /省市级政府/);

    // 搜索并选择有云图账号与行业的客户（华东智造，CRM带入行业）
    const input = document.getElementById('solutionBorrowCustomerSearch');
    input.value = 'C100101';
    input.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-solution-borrow-customer="C100101"]').click();

    // 检查 CRM 自动回填一级与二级行业
    assert.equal(l1Select.value, '制造业', '客户选择后应自动带入一级行业制造业');
    assert.equal(l2Select.value, '机械制造', '客户选择后应自动带入二级行业机械制造');

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
