'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

function openEditor(document, code = 'SOL-CLOUD-001') {
  document.querySelector('#navBar li[data-tab="solution"]').click();
  document.querySelector('#settingsDropdown .header-icon-btn').click();
  document.querySelector('#settingsDropdownMenu .settings-item').click();
  document.querySelector(`[data-solution-config-code="${code}"] [data-solution-config-action="edit"]`).click();
}

function setRule(document, window, line, key, value) {
  const input = document.querySelector(`[data-config-line="${line}"] [data-config-rule="${key}"]`);
  assert.ok(input, `${line} 应能在原关联产品线区域配置 ${key}`);
  input.value = value;
  fireChange(input, window);
}

function localScope(document, window, code) {
  document.querySelector('[data-solution-drawer-close]').click();
  document.getElementById('solutionSourceSelect').value = 'local';
  fireChange(document.getElementById('solutionSourceSelect'), window);
  document.getElementById('solutionLocalConfig').value = code;
  fireChange(document.getElementById('solutionLocalConfig'), window);
}

test('80 个候选产线可搜索并跨搜索保留选择，一次添加且保留原配置', () => {
  const catalog = ['HCI', 'AC', 'NGAF', 'AD', 'WOC', 'SaaS-XDR', ...Array.from({ length: 74 }, (_, i) => `TEST-${String(i + 1).padStart(3, '0')}`)];
  const { dom, document, window, errors } = loadV2Dom({
    transformHtml: html => html.replace(/var productCatalog = \[[^\n]+\];/, `var productCatalog = ${JSON.stringify(catalog)};`)
  });
  try {
    openEditor(document);
    setRule(document, window, 'AC', 'mode', 'optional');
    document.querySelector('[data-config-picker-open]').click();
    const search = document.querySelector('[data-config-picker-search]');
    assert.ok(search, '大目录需要可搜索的批量选择器');
    const pickerDialog = search.closest('[role="dialog"]');
    assert.equal(pickerDialog.getAttribute('aria-labelledby'), 'solutionProductPickerTitle');
    assert.equal(document.getElementById('solutionConfigChecks').contains(pickerDialog), false, '选择弹窗独立于配置列表');
    const searchFor = value => { search.value = value; search.dispatchEvent(new window.Event('input', { bubbles: true })); };
    searchFor('test-074');
    assert.equal(document.querySelectorAll('.solution-product-picker-option:not([hidden])').length, 1);
    const last = document.querySelector('[data-config-picker-item="TEST-074"]');
    last.checked = true;
    fireChange(last, window);
    searchFor('TEST-001');
    document.querySelector('[data-config-picker-select-visible]').click();
    assert.match(document.querySelector('[data-config-picker-count]').textContent, /2/);
    assert.equal(document.querySelector('[data-config-line="TEST-074"]'), null, '确认前不改变原列表');
    document.querySelector('[data-config-picker-confirm]').click();
    assert.ok(document.querySelector('[data-config-line="TEST-074"]'));
    assert.ok(document.querySelector('[data-config-line="TEST-001"]'));
    assert.equal(document.querySelector('[data-config-line="AC"] [data-config-rule="mode"]').value, 'optional');
    document.getElementById('solutionConfigSave').click();
    document.querySelector('[data-solution-config-code="SOL-CLOUD-001"] [data-solution-config-action="edit"]').click();
    assert.equal(document.querySelectorAll('[data-config-line]').length, 8);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('选择弹窗 Escape 取消并恢复添加入口焦点，Tab 保持在弹窗内', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openEditor(document);
    const trigger = document.querySelector('[data-config-picker-open]');
    trigger.click();
    const modal = document.getElementById('solutionProductPickerModal');
    assert.ok(modal, '打开独立的产线选择弹窗');
    const pending = document.querySelector('[data-config-picker-item="AF"]');
    pending.checked = true;
    fireChange(pending, window);
    const cancel = document.querySelector('[data-config-picker-close]');
    cancel.focus();
    cancel.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }));
    assert.equal(document.activeElement, document.querySelector('[data-config-picker-confirm]'));
    document.activeElement.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(document.getElementById('solutionProductPickerModal'), null);
    assert.equal(document.querySelector('[data-config-line="AF"]'), null);
    assert.equal(document.activeElement, trigger);
    assert.equal(document.getElementById('solutionConfigModal').inert, false);
  } finally { dom.window.close(); }
});

test('批量选择可取消，已关联项禁止重复添加，无搜索结果有反馈', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openEditor(document);
    document.querySelector('[data-config-picker-open]').click();
    assert.equal(document.querySelector('[data-config-picker-item="AC"]').disabled, true);
    const input = document.querySelector('[data-config-picker-item="AF"]');
    input.checked = true;
    fireChange(input, window);
    const search = document.querySelector('[data-config-picker-search]');
    search.value = '不存在的产品';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(document.querySelector('[data-config-picker-empty]').hidden, false);
    document.querySelector('[data-config-picker-cancel]').click();
    assert.equal(document.querySelector('[data-config-line="AF"]'), null);
    document.querySelector('[data-config-picker-open]').click();
    assert.equal(document.querySelector('[data-config-picker-item="AF"]').checked, false);
  } finally { dom.window.close(); }
});

test('同一区域配置可选产品并保存回显，申请时按默认状态启停', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openEditor(document);
    setRule(document, window, 'AC', 'mode', 'optional');
    setRule(document, window, 'AC', 'defaultEnabled', 'false');
    document.getElementById('solutionConfigSave').click();
    assert.equal(document.getElementById('solutionConfigModal').hidden, true);
    document.querySelector('[data-solution-config-code="SOL-CLOUD-001"] [data-solution-config-action="edit"]').click();
    assert.equal(document.querySelector('[data-config-line="AC"] [data-config-rule="mode"]').value, 'optional');
    assert.equal(document.querySelector('[data-config-line="AC"] [data-config-rule="defaultEnabled"]').value, 'false');
    document.getElementById('solutionConfigSave').click();
    document.getElementById('solutionAssetRead').click();
    const exported = JSON.parse(document.getElementById('solutionAssetPreview').textContent);
    assert.equal(exported.find(item => item.solutionCode === 'SOL-CLOUD-001').productLineRules.AC.defaultEnabled, false);
    localScope(document, window, 'SOL-CLOUD-001');
    const switchForAc = () => document.querySelector('[data-solution-line-switch="AC"]');
    assert.equal(switchForAc().getAttribute('aria-checked'), 'false');
    assert.equal(document.querySelector('[data-solution-line-switch="HCI"]'), null, '必选产品不可关闭');
    document.querySelector('[data-solution-line="AC"]').click();
    assert.equal(document.querySelector('#solutionProductPanel [data-solution-param="deviceId"]'), null, '关闭产品不要求填写参数');
    switchForAc().click();
    assert.equal(switchForAc().getAttribute('aria-checked'), 'true');
    assert.ok(document.querySelector('#solutionProductPanel [data-solution-param="deviceId"]'));
    switchForAc().click();
    document.querySelector('[data-solution-line="AC"]').click();
    assert.equal(document.querySelector('#solutionProductPanel [data-solution-param="deviceId"]'), null);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('未开启的可选产品和未选中的组内产品不校验、不生成授权记录', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openEditor(document, 'SOL-SEC-002');
    setRule(document, window, 'XDR', 'mode', 'optional');
    setRule(document, window, 'XDR', 'defaultEnabled', 'false');
    setRule(document, window, 'NGAF', 'mode', 'exclusive');
    setRule(document, window, 'WAF', 'mode', 'exclusive');
    setRule(document, window, 'WAF', 'defaultEnabled', 'true');
    document.getElementById('solutionConfigSave').click();
    localScope(document, window, 'SOL-SEC-002');
    const customerInput = document.getElementById('solutionLocalCustomerSearch');
    customerInput.value = 'C100101';
    customerInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-solution-local-customer="C100101"]').click();
    document.querySelector('[data-solution-line="WAF"]').click();
    const deviceInput = document.querySelector('#solutionProductPanel [data-solution-param="deviceId"]');
    deviceInput.value = 'DEMO-WAF-SELECTED';
    deviceInput.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.getElementById('solutionSubmitWhole').click();
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);
    const recordLines = [...document.querySelectorAll('[data-solution-generated-detail="true"] tbody tr')].map(row => row.cells[0].textContent);
    assert.deepEqual(recordLines, ['WAF']);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('配置同组单选后申请时严格只开启一个，支持切换并保持配置默认项', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    openEditor(document, 'SOL-SEC-002');
    setRule(document, window, 'NGAF', 'mode', 'exclusive');
    setRule(document, window, 'NGAF', 'group', '安全组件');
    setRule(document, window, 'WAF', 'mode', 'exclusive');
    setRule(document, window, 'WAF', 'group', '安全组件');
    setRule(document, window, 'NGAF', 'defaultEnabled', 'true');
    document.getElementById('solutionConfigSave').click();
    assert.equal(document.getElementById('solutionConfigModal').hidden, true);
    localScope(document, window, 'SOL-SEC-002');
    const choice = line => document.querySelector(`[data-solution-line-choice="${line}"]`);
    assert.equal(choice('NGAF').getAttribute('aria-checked'), 'true');
    assert.equal(choice('WAF').getAttribute('aria-checked'), 'false');
    choice('WAF').click();
    assert.equal(choice('WAF').getAttribute('aria-checked'), 'true');
    assert.equal(choice('NGAF').getAttribute('aria-checked'), 'false');
    choice('WAF').click();
    assert.equal(choice('WAF').getAttribute('aria-checked'), 'true', '再次点击不能关闭唯一选中项');
    assert.match(document.getElementById('solutionProductNav').textContent, /安全组件/);
    assert.deepEqual(errors, []);
  } finally { dom.window.close(); }
});

test('同组单选仅有一个产品时不能保存，取消编辑不改变已有配置', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openEditor(document);
    setRule(document, window, 'AC', 'mode', 'exclusive');
    document.getElementById('solutionConfigSave').click();
    assert.equal(document.getElementById('solutionConfigModal').hidden, false);
    assert.match(document.getElementById('solutionConfigError').textContent, /至少.*两个.*产品线/);
    document.querySelector('#solutionConfigModal [data-solution-config-close]').click();
    document.querySelector('[data-solution-config-code="SOL-CLOUD-001"] [data-solution-config-action="edit"]').click();
    assert.equal(document.querySelector('[data-config-line="AC"] [data-config-rule="mode"]').value, 'required');
  } finally { dom.window.close(); }
});

test('添加和移除产品线均在关联产品线区域内完成，未保存的变更可以取消', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    openEditor(document);
    const add = document.querySelector('#solutionConfigChecks input[value="AF"]');
    add.checked = true;
    fireChange(add, window);
    assert.ok(document.querySelector('[data-config-line="AF"]'));
    document.querySelector('[data-config-line="AF"] [data-config-remove]').click();
    assert.equal(document.querySelector('[data-config-line="AF"]'), null);
    assert.equal(document.querySelector('#solutionConfigChecks input[value="AF"]').checked, false);
  } finally { dom.window.close(); }
});
