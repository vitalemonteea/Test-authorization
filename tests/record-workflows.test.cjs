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

function clickAction(document, window, actionName) {
  const action = document.querySelector(`[data-record-action="${actionName}"]`);
  assert.ok(action, `${actionName}操作应存在`);
  action.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return action;
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

test('复制申请展示复制范围并创建演示草稿', () => {
  const { dom, document, window } = setupRecords();
  try {
    clickAction(document, window, 'copy');
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '复制申请');
    assert.equal(document.getElementById('recordDrawerView').hidden, true);
    assert.equal(document.querySelectorAll('#recordWorkflowContent .record-copy-option').length, 4);
    assert.match(document.getElementById('recordCopyNote').value, /基于 AUTH-/);
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.equal(document.getElementById('recordActionToast').hidden, false);
    assert.match(document.getElementById('recordActionToastText').textContent, /复制草稿已创建/);
  } finally {
    dom.window.close();
  }
});

test('续期抽屉展示当前授权并校验续期原因', () => {
  const { dom, document, window } = setupRecords();
  try {
    clickAction(document, window, 'renew');
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '发起续期');
    assert.match(document.getElementById('recordWorkflowContent').textContent, /当前授权有效期/);
    assert.match(document.getElementById('recordRenewEndDate').value, /^\d{4}-\d{2}-\d{2}$/);
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordDrawerLayer').hidden, false);
    assert.equal(document.getElementById('recordWorkflowError').hidden, false);
    document.getElementById('recordRenewReason').value = '客户需要继续完成业务验证';
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.match(document.getElementById('recordActionToastText').textContent, /续期申请已提交/);
  } finally {
    dom.window.close();
  }
});

test('驳回记录可补充说明和材料后重新提交', () => {
  const { dom, document, window } = setupRecords();
  try {
    clickAction(document, window, 'resubmit');
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '重新提交');
    assert.match(document.getElementById('recordWorkflowContent').textContent, /上次审批未通过/);
    assert.ok(document.getElementById('recordResubmitFile'));
    document.getElementById('recordResubmitNote').value = '已补充客户测试计划和申请说明';
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.match(document.getElementById('recordActionToastText').textContent, /重新提交/);
  } finally {
    dom.window.close();
  }
});

test('审核抽屉展示申请摘要、审批记录和审批决定', () => {
  const { dom, document, window } = setupRecords();
  try {
    clickAction(document, window, 'approve');
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '审核申请');
    assert.match(document.getElementById('recordWorkflowContent').textContent, /已有审批记录/);
    assert.equal(document.querySelectorAll('input[name="recordApprovalDecision"]').length, 2);
    assert.equal(document.querySelector('input[name="recordApprovalDecision"]:checked').value, 'approve');
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordWorkflowError').hidden, false);
    document.getElementById('recordApprovalOpinion').value = '申请信息完整，同意进入下一节点';
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.match(document.getElementById('recordActionToastText').textContent, /审批通过已提交/);
  } finally {
    dom.window.close();
  }
});

test('撤销使用破坏性确认弹窗并强制填写原因', () => {
  const { dom, document, window } = setupRecords();
  try {
    const revoke = clickAction(document, window, 'revoke');
    const layer = document.getElementById('recordRevokeLayer');
    assert.equal(layer.hidden, false);
    assert.match(document.getElementById('recordRevokeApplicationNo').textContent, /^AUTH-/);
    document.getElementById('recordRevokeConfirm').click();
    assert.equal(layer.hidden, false);
    assert.equal(document.getElementById('recordRevokeError').hidden, false);
    document.getElementById('recordRevokeReason').value = '客户测试计划取消';
    document.getElementById('recordRevokeConfirm').click();
    assert.equal(layer.hidden, true);
    assert.match(document.getElementById('recordActionToastText').textContent, /撤销申请已提交/);
    assert.equal(document.activeElement, revoke);
  } finally {
    dom.window.close();
  }
});
