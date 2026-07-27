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

test('产品授权详情沿用 XaaS 信息骨架并展示授权对象、配置变更和审批信息', () => {
  const { dom, document, window } = setupRecords();
  try {
    const view = document.querySelector('[data-record-action="view"]');
    view.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordAuthorizationSection').hidden, true);
    assert.equal(document.getElementById('recordCustomerSection').hidden, false);
    assert.match(document.getElementById('recordApplicationGrid').textContent, /授权场景首次开通测试授权/);
    assert.match(document.getElementById('recordApplicationGrid').textContent, /申请事项开通测试授权/);
    assert.doesNotMatch(document.getElementById('recordApplicationGrid').textContent, /规则判断|申请原因|附件/);
    assert.match(document.getElementById('recordCustomerGrid').textContent, /客户名称深圳市腾讯计算机系统有限公司/);
    assert.match(document.getElementById('recordCustomerGrid').textContent, /客户类型KA/);
    assert.equal(document.getElementById('recordProductSceneSection'), null);
    assert.equal(document.getElementById('recordProductDetailSection').hidden, false);
    assert.match(document.getElementById('recordProductOverviewGrid').textContent, /产品线HCI/);
    assert.match(document.getElementById('recordProductOverviewGrid').textContent, /版本号HCI-6\.8\.1-VKEY/);
    assert.match(document.getElementById('recordProductSupplementGrid').textContent, /规则判断/);
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /硬件信息文件/);
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /集群标识/);
    assert.doesNotMatch(document.getElementById('recordProductDeviceGrid').textContent, /设备 ID/);
    assert.doesNotMatch(document.getElementById('recordProductDeviceGrid').textContent, /授权中台/);
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /借测单号/);
    assert.match(document.getElementById('recordProductChangeList').textContent, /未开通/);
    assert.match(document.getElementById('recordProductChangeList').textContent, /配置项变更前变更后/);
    assert.doesNotMatch(document.getElementById('recordProductChangeList').textContent, /arrow_forward/);
    assert.match(document.getElementById('recordProductChangeList').textContent, /计算虚拟化、分布式存储/);
    assert.match(document.getElementById('recordProductChangeList').textContent, /物理 CPU 16 颗/);
    assert.match(document.getElementById('recordProductDeliveryGrid').textContent, /授权码/);
    assert.match(document.getElementById('recordProductDeliveryGrid').textContent, /授权文件/);
    assert.match(document.getElementById('recordApprovalGrid').textContent, /审批结果/);
    assert.match(document.getElementById('recordApprovalTimeline').textContent, /提交申请/);
    assert.match(document.getElementById('recordApprovalTimeline').textContent, /授权中台处理/);
  } finally {
    dom.window.close();
  }
});

test('详情字段使用标签和值横向对齐的只读表单', () => {
  const { dom, document, window } = setupRecords();
  try {
    const view = document.querySelector('[data-record-action="view"]');
    view.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const item = document.querySelector('#recordApplicationGrid .record-detail-item');
    const label = item.querySelector('.record-detail-label');
    const itemStyle = window.getComputedStyle(item);
    const labelStyle = window.getComputedStyle(label);
    assert.equal(itemStyle.display, 'grid');
    assert.match(itemStyle.gridTemplateColumns, /^82px /);
    assert.equal(labelStyle.marginBottom, '0px');
    assert.equal(document.getElementById('recordDrawerSubtitle').hidden, true);
  } finally {
    dom.window.close();
  }
});

test('XaaS 详情展示客户、订阅规格、业务补充信息和开通结果', () => {
  const { dom, document, window } = setupRecords();
  try {
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const xaasRow = rows.find((row) => row.children[3]?.textContent.trim() === 'SASE-GA');
    assert.ok(xaasRow, '应存在 SASE-GA XaaS Mock 记录');
    const view = xaasRow.querySelector('[data-record-action="view"]');
    assert.ok(view, '已授权 XaaS 记录应支持查看');
    view.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(document.getElementById('recordAuthorizationSection').hidden, true);
    assert.equal(document.getElementById('recordCustomerSection').hidden, false);
    assert.match(document.getElementById('recordCustomerGrid').textContent, /联系人姓名/);
    assert.match(document.getElementById('recordCustomerGrid').textContent, /所属云图账号/);
    assert.match(document.getElementById('recordXaasSubscriptionList').textContent, /SASE-GA 全球加速/);
    assert.match(document.getElementById('recordXaasSubscriptionList').textContent, /带宽 10M/);
    assert.match(document.getElementById('recordXaasSubscriptionList').textContent, /已开通/);
    assert.doesNotMatch(document.getElementById('recordXaasSubscriptionList').textContent, /2个设备/);
    assert.match(document.getElementById('recordXaasSupplementGrid').textContent, /客户需求/);
    assert.match(document.getElementById('recordXaasDeliveryGrid').textContent, /租户\/实例标识/);
    assert.match(document.getElementById('recordXaasDeliveryGrid').textContent, /授权文件/);

    const productView = rows[0].querySelector('[data-record-action="view"]');
    productView.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordAuthorizationSection').hidden, true);
    assert.equal(document.getElementById('recordCustomerSection').hidden, false);
    assert.match(document.getElementById('recordApplicationGrid').textContent, /授权场景/);
    assert.match(document.getElementById('recordCustomerGrid').textContent, /客户名称/);
    assert.equal(document.getElementById('recordProductDetailSection').hidden, false);
  } finally {
    dom.window.close();
  }
});

test('超期产品提示升级审批，解决方案仍使用通用授权信息', () => {
  const { dom, document, window } = setupRecords();
  try {
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const overdueRow = rows.find((row) => row.children[0]?.textContent.includes('AUTH-20260628-033'));
    assert.ok(overdueRow, '应存在已过期的普通产品授权 Mock 记录');
    overdueRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(document.getElementById('recordApplicationGrid').textContent, /重新开通测试授权/);
    assert.doesNotMatch(document.getElementById('recordApplicationGrid').textContent, /升级审批|经营成本|申请原因|附件/);
    assert.match(document.getElementById('recordProductSupplementGrid').textContent, /升级审批/);
    assert.match(document.getElementById('recordProductSupplementGrid').textContent, /扣除区域经营成本/);
    assert.match(document.getElementById('recordProductSupplementGrid').textContent, /申请原因/);
    assert.match(document.getElementById('recordProductSupplementGrid').textContent, /附件/);
    assert.match(document.getElementById('recordProductSupplementGrid').textContent, /超期测试说明\.pdf/);
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /设备 ID/);
    assert.doesNotMatch(document.getElementById('recordProductDeviceGrid').textContent, /硬件信息文件/);
    assert.doesNotMatch(document.getElementById('recordProductDeviceGrid').textContent, /授权中台/);

    const solutionRow = rows.find((row) => row.children[1]?.textContent.trim() === '解决方案');
    assert.ok(solutionRow, '应存在解决方案 Mock 记录');
    solutionRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordAuthorizationSection').hidden, false);
    assert.equal(document.getElementById('recordCustomerSection').hidden, true);
    assert.match(document.getElementById('recordAuthorizationGrid').textContent, /授权对象/);
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
    assert.equal(document.getElementById('recordDrawerSubtitle').hidden, false);
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

test('审核抽屉展示完整判断依据并要求主动选择审批决定', () => {
  const { dom, document, window } = setupRecords();
  try {
    clickAction(document, window, 'approve');
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '审核申请');
    assert.equal(document.activeElement, document.getElementById('recordDrawerTitle'));
    assert.equal(document.querySelector('#recordDrawerLayer .record-drawer-body').scrollTop, 0);
    assert.equal(document.getElementById('recordDrawerLayer').classList.contains('is-approval'), false);
    assert.ok(document.getElementById('recordWorkflowContent').classList.contains('record-approve-content'));
    assert.match(document.getElementById('recordApproveApplicationGrid').textContent, /授权类型XaaS/);
    assert.match(document.getElementById('recordApproveApplicationGrid').textContent, /申请动作首次开通试用/);
    assert.match(document.getElementById('recordApproveCustomerGrid').textContent, /客户名称阿里巴巴/);
    assert.match(document.getElementById('recordApproveCustomerGrid').textContent, /联系人手机号/);
    assert.match(document.getElementById('recordApproveCustomerGrid').textContent, /所属行业/);
    assert.match(document.getElementById('recordApproveSubscriptionList').textContent, /2 亿条/);
    assert.match(document.getElementById('recordApproveBasisGrid').textContent, /测试驱动力/);
    assert.match(document.getElementById('recordApproveBasisGrid').textContent, /客户信息收集表/);
    assert.equal(document.getElementById('recordApproveRiskGrid'), null);
    const sectionTitles = [...document.querySelectorAll('#recordWorkflowContent > .record-detail-section > .record-detail-section-title')]
      .map((title) => title.lastChild.textContent.trim());
    assert.deepEqual(sectionTitles, ['申请信息', '客户信息', '订阅授权明细', '业务补充信息', '已有审批记录', '审批决定']);
    assert.match(document.getElementById('recordWorkflowContent').textContent, /已有审批记录/);
    assert.match(document.getElementById('recordWorkflowContent').textContent, /意见：已提交申请信息和相关材料/);
    assert.equal(document.querySelectorAll('input[name="recordApprovalDecision"]').length, 2);
    assert.equal(document.querySelector('input[name="recordApprovalDecision"]:checked'), null);
    document.getElementById('recordDrawerPrimary').click();
    assert.equal(document.getElementById('recordWorkflowError').hidden, false);
    assert.match(document.getElementById('recordWorkflowError').textContent, /请选择审批决定/);
    document.querySelector('input[name="recordApprovalDecision"][value="approve"]').checked = true;
    document.getElementById('recordDrawerPrimary').click();
    assert.match(document.getElementById('recordWorkflowError').textContent, /请完成必填信息/);
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
