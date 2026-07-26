'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

function setupRecords() {
  const loaded = loadV2Dom();
  loaded.window.initRecordDownloadActions();
  loaded.window.initRecordActionTips();
  loaded.window.initRecordDetailDrawer();
  return loaded;
}

test('查看授权记录使用右侧抽屉并保持列表上下文', () => {
  const { dom, document, window, errors } = setupRecords();
  try {
    const view = document.querySelector('[data-record-action="view"]');
    assert.ok(view);
    view.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const layer = document.getElementById('recordDrawerLayer');
    assert.equal(layer.hidden, false);
    assert.equal(layer.getAttribute('aria-hidden'), 'false');
    assert.equal(document.getElementById('content-records').isConnected, true);
    assert.match(document.getElementById('recordDetailApplicationNo').textContent, /^AUTH-/);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('详情抽屉同时展示授权信息与审批信息', () => {
  const { dom, document, window } = setupRecords();
  try {
    const view = document.querySelector('[data-record-action="view"]');
    view.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(document.getElementById('recordAuthorizationGrid').textContent, /授权内容/);
    assert.match(document.getElementById('recordAuthorizationGrid').textContent, /授权码/);
    assert.match(document.getElementById('recordAuthorizationGrid').textContent, /授权文件/);
    assert.match(document.getElementById('recordApprovalGrid').textContent, /审批结果/);
    assert.match(document.getElementById('recordApprovalTimeline').textContent, /提交申请/);
    assert.match(document.getElementById('recordApprovalTimeline').textContent, /授权中台处理/);
  } finally {
    dom.window.close();
  }
});

test('查看支持键盘打开、Escape关闭并恢复焦点', () => {
  const { dom, document, window } = setupRecords();
  try {
    const view = document.querySelector('[data-record-action="view"]');
    view.focus();
    view.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    assert.equal(document.getElementById('recordDrawerLayer').hidden, false);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.equal(document.activeElement, view);
  } finally {
    dom.window.close();
  }
});
