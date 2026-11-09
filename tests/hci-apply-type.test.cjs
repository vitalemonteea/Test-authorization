'use strict';

/**
 * HCI测试授权优化 - HCI申请类型字段测试
 *
 * 覆盖《HCI测试授权优化需求》中「HCI申请类型」的核心验收点：
 *  - 仅 HCI 产品线展示，位于区域/办事处上方，初始为空并带引导文案
 *  - 三个复选项：涉密项目、低时延项目、已开HCI授权延期
 *  - 低时延项目仅支持手动选择，标签可删除
 *  - 涉密版本自动识别并锁定「涉密项目」
 *  - 历史 HCI 授权自动识别并锁定「已开HCI授权延期」
 *  - 多选并存、解除识别后自动取消（手动勾选保留）
 *  - 未选择时提交被拦截并展示页内错误
 *  - 提交记录持久化 HCI申请类型并在详情字段展示
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

const htmlPath = path.join(__dirname, '..', '02-原型', 'app', '测试设备授权平台V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const cssText = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
  .map((match) => match[1])
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function getOption(document, value) {
  return document.querySelector('#hciApplyTypeDropdown [data-value="' + value + '"]');
}

function getCheckbox(document, value) {
  return getOption(document, value).querySelector('input[type="checkbox"]');
}

function setCheckbox(document, window, value, checked) {
  const input = getCheckbox(document, value);
  input.checked = checked;
  fireChange(input, window);
}

function getTag(document, value) {
  return document.querySelector('#hciApplyTypeTags .hci-apply-type-tag[data-value="' + value + '"]');
}

function uploadInfo(document, window, fileName) {
  const file = new window.File(['productLine=HCI\ndeviceSn=SN-TEST\n'], fileName, { type: 'text/plain' });
  const input = document.getElementById('hwFileInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  fireChange(input, window);
}

function setVersion(document, window, value) {
  const select = document.getElementById('cloudVersion');
  select.value = value;
  fireChange(select, window);
}

test('HCI 产品线展示 HCI申请类型，位于区域上方且包含三个复选项', async () => {
  const { dom, document, errors } = loadV2Dom();
  try {
    await delay(40);
    assert.equal(document.getElementById('plname').value, '45');

    const row = document.getElementById('hciApplyTypeRow');
    assert.ok(row, '应存在 #hciApplyTypeRow');
    assert.equal(row.hidden, false, 'HCI 产品线应展示 HCI申请类型');
    assert.ok(row.classList.contains('basic-full-row'), '应使用全行布局');

    const areaItem = document.getElementById('area').closest('.layui-form-item');
    assert.ok(
      row.compareDocumentPosition(areaItem) & document.defaultView.Node.DOCUMENT_POSITION_FOLLOWING,
      'HCI申请类型应位于区域/办事处上方'
    );

    assert.equal(
      document.getElementById('hciApplyTypePlaceholder').textContent.trim(),
      '请选择 HCI 申请类型'
    );
    assert.equal(document.getElementById('hciApplyTypePlaceholder').hidden, false);
    assert.equal(document.getElementById('hciApplyTypeHelp'), null, '不应在字段下方展示场景辅助说明');
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true, '初始不应展示自动识别说明');
    assert.equal(document.getElementById('hciApplyTypeWeakNote').hidden, true, '初始不应展示查询失败弱提示');

    const options = Array.from(document.querySelectorAll('#hciApplyTypeDropdown .hci-apply-type-option'));
    assert.equal(options.length, 3);
    assert.deepEqual(
      options.map((option) => option.querySelector('.hci-apply-type-option-label').textContent.trim()),
      ['涉密项目', '低时延项目', '已开HCI授权延期']
    );
    options.forEach((option) => {
      const input = option.querySelector('input[type="checkbox"]');
      assert.ok(input, '每个选项应使用真实 checkbox');
      assert.equal(input.checked, false, '初始不应勾选');
    });
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('切换非 HCI 产品线隐藏并清空 HCI申请类型，切回后重新展示且为空', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    window.addChip('HCI-SWITCH-001');
    await delay(10);
    window.submitStandardForm({ mode: 'clear' });
    assert.equal(document.getElementById('hciApplyTypeError').hidden, false, '未选择类型提交应展示页内错误');

    const plname = document.getElementById('plname');
    plname.value = '22';
    fireChange(plname, window);
    await delay(10);
    assert.equal(document.getElementById('hciApplyTypeError').hidden, true, '切换产品线应清除上一产品线的错误提示');
    plname.value = '45';
    fireChange(plname, window);
    await delay(10);
    assert.equal(document.getElementById('hciApplyTypeError').hidden, true, '切回 HCI 不应恢复旧错误');

    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目');

    plname.value = '22';
    fireChange(plname, window);
    await delay(10);

    assert.equal(document.getElementById('hciApplyTypeRow').hidden, true, '非 HCI 产品线应隐藏');
    assert.equal(document.getElementById('hciApplyTypes').value, '', '隐藏时应清空取值');
    assert.equal(document.querySelectorAll('#hciApplyTypeTags .hci-apply-type-tag').length, 0);

    plname.value = '45';
    fireChange(plname, window);
    await delay(10);

    assert.equal(document.getElementById('hciApplyTypeRow').hidden, false, '切回 HCI 应重新展示');
    assert.equal(document.getElementById('hciApplyTypes').value, '', '切回后不应保留上一产品线的选择');
    assert.equal(document.getElementById('hciApplyTypePlaceholder').hidden, false);
  } finally {
    dom.window.close();
  }
});

test('低时延项目仅支持手动选择，标签可删除并同步隐藏字段', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    setCheckbox(document, window, 'low_latency', true);

    const tag = getTag(document, 'low_latency');
    assert.ok(tag, '勾选后应渲染标签');
    assert.ok(tag.querySelector('.hci-apply-type-tag-label').textContent.includes('低时延项目'));
    assert.equal(tag.classList.contains('is-locked'), false, '手动项不应锁定');
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目');
    assert.equal(document.getElementById('hciApplyTypePlaceholder').hidden, true);
    assert.equal(getCheckbox(document, 'low_latency').checked, true);

    tag.querySelector('.hci-apply-type-tag-remove').click();
    assert.equal(getTag(document, 'low_latency'), null, '删除标签后应移除');
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    assert.equal(getCheckbox(document, 'low_latency').checked, false);
    assert.equal(document.getElementById('hciApplyTypePlaceholder').hidden, false);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('涉密版本自动勾选并锁定涉密项目，切换非涉密版本后解除', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    setVersion(document, window, '3.0.1');

    const input = getCheckbox(document, 'confidential');
    assert.equal(input.checked, true, '涉密版本应自动勾选涉密项目');
    assert.equal(input.disabled, true, '自动识别项应锁定');
    assert.equal(getOption(document, 'confidential').classList.contains('is-locked'), true);
    assert.equal(getOption(document, 'confidential').querySelector('[data-auto-badge]').hidden, false);

    const tag = getTag(document, 'confidential');
    assert.ok(tag.classList.contains('is-locked'));
    assert.equal(tag.querySelector('.hci-apply-type-tag-remove'), null, '锁定标签不提供删除按钮');
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目');
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, false);
    assert.match(document.getElementById('hciApplyTypeAutoNote').textContent, /版本信息.*涉密项目/);

    // 锁定项不可被取消
    setCheckbox(document, window, 'confidential', false);
    assert.equal(getCheckbox(document, 'confidential').checked, true, '锁定项应拒绝取消');

    setVersion(document, window, '6.8.1_1');
    assert.equal(getCheckbox(document, 'confidential').checked, false, '解除识别后应自动取消');
    assert.equal(getCheckbox(document, 'confidential').disabled, false);
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true);
  } finally {
    dom.window.close();
  }
});

test('历史 HCI 授权自动勾选并锁定已开HCI授权延期，移除文件后解除', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    uploadInfo(document, window, 'hci-active-demo.info');
    await delay(30);

    const input = getCheckbox(document, 'renewal');
    assert.equal(input.checked, true, '命中历史授权应自动勾选延期');
    assert.equal(input.disabled, true, '自动识别项应锁定');
    assert.equal(document.getElementById('hciApplyTypes').value, '已开HCI授权延期');
    assert.match(document.getElementById('hciApplyTypeAutoNote').textContent, /历史授权记录.*已开HCI授权延期/);
    assert.equal(getTag(document, 'renewal').querySelector('.hci-apply-type-tag-remove'), null);

    // 锁定项不可被取消
    setCheckbox(document, window, 'renewal', false);
    assert.equal(getCheckbox(document, 'renewal').checked, true, '锁定的延期项应拒绝取消');

    document.getElementById('hwFileClear').click();
    await delay(10);

    assert.equal(getCheckbox(document, 'renewal').checked, false, '移除文件后应自动取消');
    assert.equal(getCheckbox(document, 'renewal').disabled, false);
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true);
  } finally {
    dom.window.close();
  }
});

test('涉密版本与历史授权同时命中时多选并存，并分别展示识别说明', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    uploadInfo(document, window, 'hci-active-demo.info');
    await delay(30);
    setVersion(document, window, '3.0.1');

    assert.equal(getCheckbox(document, 'confidential').checked, true);
    assert.equal(getCheckbox(document, 'renewal').checked, true);
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目、已开HCI授权延期');
    const note = document.getElementById('hciApplyTypeAutoNote');
    assert.equal(note.hidden, false);
    assert.equal(
      note.textContent,
      '已根据版本信息自动识别并锁定「涉密项目」；已根据历史授权记录自动识别并锁定「已开HCI授权延期」',
      '两项识别说明应以分号拼接展示'
    );
    assert.match(note.textContent, /涉密项目/);
    assert.match(note.textContent, /已开HCI授权延期/);
    assert.equal(document.querySelectorAll('#hciApplyTypeTags .hci-apply-type-tag.is-locked').length, 2);

    // 手动补充低时延项目后，三项并存
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目、低时延项目、已开HCI授权延期');
  } finally {
    dom.window.close();
  }
});

test('HCI 未选择申请类型时提交被拦截并展示页内错误', async () => {
  const { dom, document, window, alerts } = loadV2Dom();
  try {
    await delay(40);
    assert.equal(window.addChip('HCI-MANUAL-001'), true);
    await delay(10);

    const rowsBefore = document.querySelectorAll('#content-records [data-product-record-id]').length;
    window.submitStandardForm({ mode: 'clear' });

    assert.ok(
      alerts.some((message) => message.includes('请选择 HCI 申请类型')),
      '应通过 alert 提示选择 HCI申请类型（实际：' + alerts.join(' | ') + '）'
    );
    const error = document.getElementById('hciApplyTypeError');
    assert.equal(error.hidden, false, '应展示页内错误');
    assert.match(error.textContent, /请选择 HCI 申请类型/);
    assert.equal(
      document.querySelectorAll('#content-records [data-product-record-id]').length,
      rowsBefore,
      '未选择类型被拦截时不应生成授权记录'
    );
    assert.equal(document.getElementById('submissionSnapshot').value, '', '未选择类型被拦截时不应写入提交快照');
  } finally {
    dom.window.close();
  }
});

test('提交记录持久化 HCI申请类型，并在详情字段中展示', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    window.insertProductRecord({
      id: 'AUTH-HCI-TEST',
      productName: 'HCI',
      version: 'HCI-6.8.1-VKEY',
      customer: '测试客户',
      deviceDisplay: 'HCI-MANUAL-001',
      sn: '—',
      region: '上海区',
      startDate: '2026-11-03',
      endDate: '2026-12-03',
      applicant: '测试申请人',
      time: '2026-11-03 10:00',
      hciApplyTypes: '涉密项目、低时延项目'
    });

    const row = document.querySelector('[data-product-record-id="AUTH-HCI-TEST"]');
    assert.ok(row, '应插入授权记录行');
    assert.equal(row.dataset.hciApplyTypes, '涉密项目、低时延项目');

    const data = window.getRecordRowData(row);
    assert.equal(data.hciApplyTypes, '涉密项目、低时延项目');

    const items = window.getRecordApplicationItems(data, null, { scene: [{ value: '首次开通' }] });
    const hciItem = items.find((item) => item.label === 'HCI申请类型');
    assert.deepEqual(hciItem, { label: 'HCI申请类型', value: '涉密项目、低时延项目' });
  } finally {
    dom.window.close();
  }
});

test('展开收起交互：点击展开并旋转箭头，点击外部或 Escape 收起', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    const root = document.getElementById('hciApplyType');
    const trigger = document.getElementById('hciApplyTypeTrigger');

    trigger.click();
    assert.equal(root.classList.contains('open'), true, '点击触发框应展开下拉');
    assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'aria-expanded 应同步为 true');

    document.body.click();
    assert.equal(root.classList.contains('open'), false, '点击外部应收起');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');

    trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(root.classList.contains('open'), true, '键盘 Enter 应展开');
    trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(root.classList.contains('open'), false, 'Escape 应收起');

    // 勾选选项只更新标签，不收起下拉面板
    trigger.click();
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(root.classList.contains('open'), true, '勾选选项后下拉应保持展开');

    // 打开其他自定义下拉时，HCI申请类型应收起，避免两个面板同时展开
    const productTrigger = document.querySelector('[data-select-id="plname"] .custom-select-trigger');
    productTrigger.click();
    assert.equal(root.classList.contains('open'), false, '打开其他自定义下拉时应收起 HCI申请类型');
    assert.equal(trigger.getAttribute('aria-expanded'), 'false');
    document.body.click();

    // 标签删除后可重新选择
    getTag(document, 'low_latency').querySelector('.hci-apply-type-tag-remove').click();
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目', '删除后应可重新选择');
  } finally {
    dom.window.close();
  }
});

test('手工输入命中历史授权的集群标识时，自动勾选并锁定已开HCI授权延期', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    await delay(10);

    window.addChip('CLUSTER-HCI-ACTIVE');
    await delay(30);

    assert.equal(window.applicationState.deviceFacts[0].historyMatchedCount, 1, '设备ID应命中历史授权记录');
    assert.equal(getCheckbox(document, 'renewal').checked, true, '命中历史授权应自动勾选');
    assert.equal(getCheckbox(document, 'renewal').disabled, true, '命中历史授权应锁定');
    assert.equal(document.getElementById('hciApplyTypes').value, '已开HCI授权延期');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('历史授权查询失败时不自动锁定，展示弱提示并允许手动选择延期', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    // 原型 HCI 文件模式不会产生 lookupStatus:'error' 的事实，这里直接注入以验证状态机分支
    window.applicationState.deviceFacts = [{
      lookupStatus: 'error',
      deviceId: 'HCI-LOOKUP-ERROR-001',
      productLineId: '45',
      authorizationStatus: 'unknown'
    }];
    window.updateHciApplyTypeState();

    assert.equal(getCheckbox(document, 'renewal').checked, false, '查询失败不应自动勾选');
    assert.equal(getCheckbox(document, 'renewal').disabled, false, '查询失败不应锁定');
    const weakNote = document.getElementById('hciApplyTypeWeakNote');
    assert.equal(weakNote.hidden, false, '应展示弱提示');
    assert.match(weakNote.textContent, /查询失败/);
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true, '不应展示自动锁定说明');

    setCheckbox(document, window, 'renewal', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '已开HCI授权延期', '手动选择应生效');
    assert.equal(getTag(document, 'renewal').classList.contains('is-locked'), false, '手动项不应锁定');
    // 弱提示描述的是“历史查询失败”这一系统状态，手动补选后仍保留，供审批侧知悉未经系统核验
    assert.equal(document.getElementById('hciApplyTypeWeakNote').hidden, false);

    // 查询失败下手动补选的延期项可以删除，弱提示继续保留
    getTag(document, 'renewal').querySelector('.hci-apply-type-tag-remove').click();
    assert.equal(getCheckbox(document, 'renewal').checked, false);
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    assert.equal(document.getElementById('hciApplyTypeWeakNote').hidden, false, '移除手动项后弱提示仍应保留');
  } finally {
    dom.window.close();
  }
});

test('键盘操作：删除按钮的 Enter 不被触发框吞掉，Escape 归还焦点，方向键在选项间移动', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    const root = document.getElementById('hciApplyType');
    const trigger = document.getElementById('hciApplyTypeTrigger');

    setCheckbox(document, window, 'low_latency', true);
    const remove = getTag(document, 'low_latency').querySelector('.hci-apply-type-tag-remove');
    remove.focus();
    assert.equal(document.activeElement, remove, '标签移除按钮应可获得键盘焦点');
    const enterOnRemove = new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
    remove.dispatchEvent(enterOnRemove);
    assert.equal(enterOnRemove.defaultPrevented, false, '标签移除按钮的 Enter 不应被触发框拦截');
    assert.equal(root.classList.contains('open'), false, '删除按钮上的 Enter 不应展开下拉');
    const spaceOnRemove = new window.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    remove.dispatchEvent(spaceOnRemove);
    assert.equal(spaceOnRemove.defaultPrevented, false, '标签移除按钮的 Space 不应被触发框拦截');
    assert.equal(root.classList.contains('open'), false, '删除按钮上的 Space 不应展开下拉');

    trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(root.classList.contains('open'), true, 'ArrowDown 应展开下拉');
    assert.equal(document.activeElement, getCheckbox(document, 'confidential'), '展开后焦点应进入首个选项');

    getCheckbox(document, 'confidential').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(document.activeElement, getCheckbox(document, 'low_latency'), 'ArrowDown 应移动到下一项');

    getCheckbox(document, 'low_latency').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    assert.equal(root.classList.contains('open'), false, '选项上的 Escape 应收起下拉');
    assert.equal(document.activeElement, trigger, '收起后焦点应回到触发框');
  } finally {
    dom.window.close();
  }
});

test('方向键在选项间移动时跳过自动锁定的选项', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    setVersion(document, window, '3.0.1');
    assert.equal(getCheckbox(document, 'confidential').disabled, true, '涉密项应先处于锁定状态');

    const trigger = document.getElementById('hciApplyTypeTrigger');
    trigger.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(document.activeElement, getCheckbox(document, 'low_latency'), '焦点应跳过锁定的涉密项目');

    getCheckbox(document, 'low_latency').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(document.activeElement, getCheckbox(document, 'renewal'), 'ArrowDown 应移动到下一可选项');

    getCheckbox(document, 'renewal').dispatchEvent(new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    assert.equal(document.activeElement, getCheckbox(document, 'low_latency'), '到达末尾应回绕到首个可选项');
  } finally {
    dom.window.close();
  }
});

test('未选择申请类型时底部状态提示先选类型，补齐后恢复可以提交', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    assert.equal(window.addChip('HCI-MANUAL-001'), true);
    await delay(10);

    const statusText = document.getElementById('standardActionStatusText');
    const statusBar = document.getElementById('standardActionStatus');
    assert.equal(statusText.textContent, '请选择 HCI 申请类型', '缺少申请类型时不应提示可以提交');
    assert.equal(statusBar.classList.contains('is-ready'), false, '缺少申请类型时不应展示可提交态');
    assert.equal(document.getElementById('standardSubmitButton').disabled, false, '仍应允许点击提交以触发页内错误');

    setCheckbox(document, window, 'low_latency', true);
    assert.match(statusText.textContent, /已识别 1 台设备，可以提交/);
    assert.equal(statusBar.classList.contains('is-ready'), true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('信息采集快照只保存手动选择，恢复时按当前事实重新推导自动识别项', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    await delay(10);

    uploadInfo(document, window, 'hci-active-demo.info');
    await delay(30);
    assert.equal(getCheckbox(document, 'renewal').checked, true, '先命中历史授权形成自动锁定');

    const snapshot = window.InfoCollectionApplication.capture();
    assert.deepEqual(snapshot.hciApplyTypes, [], '自动识别项不应写入快照');

    // 客户上传的文件不含历史授权：自动锁定应解除，且不能被快照复活成手动项
    window.InfoCollectionApplication.receive([{
      name: 'hci-first-demo.info',
      size: 128,
      summary: { clusterId: 'CLUSTER-HCI-FIRST', deviceId: 'DEV-FIRST' }
    }], 'token-first', null);
    await delay(30);

    assert.equal(getCheckbox(document, 'renewal').checked, false, '设备更换后不应残留延期');
    assert.equal(getCheckbox(document, 'renewal').disabled, false);
    assert.equal(document.getElementById('hciApplyTypes').value, '');
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('恢复不含手动选择的快照时清空上一单的 HCI申请类型', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目');

    window.InfoCollectionApplication.restore({
      productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [], hciApplyTypes: []
    });
    await delay(10);

    assert.equal(document.getElementById('hciApplyTypes').value, '', '快照无手动选择时应清空上一单选择');
    assert.equal(document.querySelectorAll('#hciApplyTypeTags .hci-apply-type-tag').length, 0);
    assert.equal(getCheckbox(document, 'low_latency').checked, false);
  } finally {
    dom.window.close();
  }
});

test('恢复快照中的手动项在当前已被自动锁定时仍保留手动属性，解除锁定后不清除', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    await delay(10);

    // 无文件时手动选择延期项，快照只记录该手动项
    setCheckbox(document, window, 'renewal', true);
    const snapshot = window.InfoCollectionApplication.capture();
    assert.deepEqual(snapshot.hciApplyTypes, ['renewal']);

    // 接收命中历史授权的外部文件，恢复快照时该项正好被自动锁定
    window.InfoCollectionApplication.receive([{
      name: 'hci-active-demo.info',
      size: 128,
      summary: { clusterId: 'CLUSTER-HCI-ACTIVE', deviceId: 'DEV-ACTIVE' }
    }], 'token-manual-renewal', snapshot);
    await delay(40);
    assert.equal(getCheckbox(document, 'renewal').checked, true);
    assert.equal(getCheckbox(document, 'renewal').disabled, true, '接收文件后延期项应处于自动锁定状态');

    // 解除自动锁定后，快照中的手动项不应被一并清除
    document.getElementById('hwFileClear').click();
    await delay(10);
    assert.equal(getCheckbox(document, 'renewal').checked, true, '手动选择不应随锁定解除被清除');
    assert.equal(getCheckbox(document, 'renewal').disabled, false);
    assert.equal(document.getElementById('hciApplyTypes').value, '已开HCI授权延期');
    assert.ok(getTag(document, 'renewal'), '解除锁定后应提供删除按钮');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('更换客户后重新识别自动锁定项，手动选择的类型保留', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    await delay(10);

    uploadInfo(document, window, 'hci-active-demo.info');
    await delay(30);
    assert.equal(getCheckbox(document, 'renewal').checked, true, '原客户下应自动锁定延期项');
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目、已开HCI授权延期');

    search.value = 'C100002';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100002"]').click();
    await delay(20);

    assert.equal(window.applicationState.customerId, 'C100002');
    assert.equal(getCheckbox(document, 'renewal').checked, false, '更换客户后不命中历史的延期项应自动取消');
    assert.equal(getCheckbox(document, 'renewal').disabled, false);
    assert.equal(getCheckbox(document, 'low_latency').checked, true, '手动选择的低时延项目应保留');
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目');
    assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('复制 HCI 申请时清空旧表单的申请类型，仅按复制版本重新识别', async () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    await delay(40);
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '低时延项目');

    window.populateCopiedAuthorizationApplication({
      authorizationType: '产品授权',
      applicationNo: 'APP-COPY-001',
      product: 'HCI',
      version: '3.0.1',
      customer: '测试客户',
      customerType: 'normal',
      region: '上海区',
      device: 'HCI-COPY-001',
      endDate: '2026-12-31'
    });
    await delay(20);

    assert.equal(document.getElementById('plname').value, '45');
    assert.equal(getCheckbox(document, 'low_latency').checked, false, '复制申请不应沿用上一表单的低时延选择');
    assert.equal(getCheckbox(document, 'confidential').checked, true, '应按复制后的涉密版本重新识别');
    assert.equal(getCheckbox(document, 'confidential').disabled, true);
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目');
    assert.equal(document.querySelectorAll('#hciApplyTypeTags .hci-apply-type-tag').length, 1);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('版本信息为空时不识别涉密，仍允许手动选择涉密项目', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    setVersion(document, window, '');
    assert.equal(getCheckbox(document, 'confidential').checked, false);
    assert.equal(getCheckbox(document, 'confidential').disabled, false);

    setCheckbox(document, window, 'confidential', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目');
    assert.equal(getTag(document, 'confidential').querySelector('.hci-apply-type-tag-remove') !== null, true,
      '手动选择的涉密项目应可删除');
  } finally {
    dom.window.close();
  }
});

test('产品线反复切换不残留选择、锁定与错误提示', async () => {
  const { dom, document, window } = loadV2Dom();
  try {
    await delay(40);
    const plname = document.getElementById('plname');
    setVersion(document, window, '3.0.1');
    uploadInfo(document, window, 'hci-expired-demo.info');
    await delay(30);
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目、已开HCI授权延期');

    for (const value of ['22', '45', '20', '45', '19', '45']) {
      plname.value = value;
      fireChange(plname, window);
      await delay(10);
      const visible = value === '45';
      assert.equal(document.getElementById('hciApplyTypeRow').hidden, !visible, value + ' 行显隐应正确');
      if (visible) {
        assert.equal(document.getElementById('hciApplyTypes').value, '', '切回 HCI 应清空上一选择');
        assert.equal(document.querySelectorAll('#hciApplyTypeTags .hci-apply-type-tag').length, 0);
      } else {
        assert.equal(document.getElementById('hciApplyTypes').value, '', '非 HCI 不应保留取值');
      }
      assert.equal(document.getElementById('hciApplyTypeError').hidden, true);
      assert.equal(document.getElementById('hciApplyTypeAutoNote').hidden, true, value + ' 自动识别说明应清空');
      assert.equal(document.getElementById('hciApplyTypeWeakNote').hidden, true, value + ' 查询失败弱提示应清空');
    }
  } finally {
    dom.window.close();
  }
});

test('多选组合提交时快照与记录保存全部类型', async () => {
  const { dom, document, window, alerts, errors } = loadV2Dom();
  try {
    await delay(40);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    document.getElementById('unifiedDate').value = '2026-12-31';
    document.getElementById('userEmail').value = 'customer@example.com';
    window.addChip('HCI-MULTI-001');
    await delay(30);

    setCheckbox(document, window, 'confidential', true);
    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypes').value, '涉密项目、低时延项目');

    window.submitStandardForm();
    assert.equal(alerts.filter((message) => message.includes('请选择 HCI 申请类型')).length, 0);

    const snapshot = JSON.parse(document.getElementById('submissionSnapshot').value || '{}');
    assert.equal(snapshot.hciApplyTypes, '涉密项目、低时延项目');
    const row = document.querySelector('#content-records [data-product-record-id]');
    assert.equal(row.dataset.hciApplyTypes, '涉密项目、低时延项目');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('补齐 HCI申请类型后提交通过，类型写入快照与授权记录', async () => {
  const { dom, document, window, alerts, errors } = loadV2Dom();
  try {
    await delay(40);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    document.getElementById('unifiedDate').value = '2026-12-31';
    document.getElementById('userEmail').value = 'customer@example.com';
    window.addChip('HCI-MANUAL-001');
    await delay(30);

    window.submitStandardForm({ mode: 'clear' });
    assert.ok(alerts.some((message) => message.includes('请选择 HCI 申请类型')), '空选应拦截');
    assert.equal(document.getElementById('hciApplyTypeError').hidden, false);

    setCheckbox(document, window, 'low_latency', true);
    assert.equal(document.getElementById('hciApplyTypeError').hidden, true, '选择后应清除页内错误');

    const rowsBefore = document.querySelectorAll('#content-records [data-product-record-id]').length;
    window.submitStandardForm();

    assert.equal(alerts.filter((message) => message.includes('请选择 HCI 申请类型')).length, 1,
      '选择后不应再次因 HCI 类型被拦截');
    const snapshot = JSON.parse(document.getElementById('submissionSnapshot').value || '{}');
    assert.equal(snapshot.hciApplyTypes, '低时延项目', '提交快照应保存 HCI申请类型');

    const rows = document.querySelectorAll('#content-records [data-product-record-id]');
    assert.equal(rows.length, rowsBefore + 1, '应新增一条授权记录');
    assert.equal(rows[0].dataset.hciApplyTypes, '低时延项目', '记录行应保存 HCI申请类型');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('HCI申请类型样式合同：宽度、高度、圆角与聚焦态', () => {
  const triggerRule = Array.from(cssText.matchAll(/\.hci-apply-type-trigger\s*\{([^}]*)\}/g))
    .map((match) => match[1].replace(/\s+/g, ''))
    .join('');
  assert.ok(triggerRule, '应存在 .hci-apply-type-trigger 样式');
  assert.match(triggerRule, /height:38px/);
  assert.match(triggerRule, /border-radius:8px/);

  const rootRule = Array.from(cssText.matchAll(/\.hci-apply-type\s*\{([^}]*)\}/g))
    .map((match) => match[1].replace(/\s+/g, ''))
    .join('');
  assert.match(rootRule, /max-width:578px/);

  const focusRule = cssText.match(/\.hci-apply-type-trigger:focus-visible[^{]*\{([^}]*)\}/);
  assert.ok(focusRule, '应有聚焦态样式');
  assert.match(focusRule[1], /box-shadow:\s*0\s+0\s+0\s+3px\s+rgba\(0,80,203,\.12\)/);

  const hiddenRule = cssText.match(/#section-basic #hciApplyTypeRow\[hidden\]\s*\{([^}]*)\}/);
  assert.ok(hiddenRule, '应有行级 hidden 覆盖，避免布局残留');
  assert.match(hiddenRule[1].replace(/\s+/g, ''), /display:none/);

  const openArrowRule = cssText.match(/\.hci-apply-type\.open \.hci-apply-type-arrow\s*\{([^}]*)\}/);
  assert.ok(openArrowRule, '展开时箭头应旋转');
  assert.match(openArrowRule[1].replace(/\s+/g, ''), /transform:rotate\(180deg\)/);

  // 窄屏下取消 578px 定宽，避免控件溢出移动端表单列
  assert.match(cssText, /\.hci-apply-type\s*\{\s*max-width:\s*none;\s*\}/, '移动端应取消固定宽度');

  // 占位文案使用常规占位色，不承担场景提示
  const placeholderRule = cssText.match(/\.hci-apply-type-placeholder\s*\{([^}]*)\}/);
  assert.ok(placeholderRule, '应存在占位文案样式');
  assert.match(placeholderRule[1].replace(/\s+/g, ''), /color:#8b92a5/);
  assert.doesNotMatch(placeholderRule[1], /#b45309/, '占位文案不应使用警告色');
});
