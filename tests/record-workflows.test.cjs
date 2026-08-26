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

function setupMobileRecords() {
  const loaded = loadV2Dom({
    beforeParse(window) {
      Object.defineProperty(window, 'innerWidth', { configurable: true, value: 390 });
    }
  });
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
    assert.doesNotMatch(document.getElementById('recordApplicationGrid').textContent, /申请事项/);
    assert.match(document.getElementById('recordApplicationGrid').textContent, /申请类型硬件借测/);
    assert.match(document.getElementById('recordApplicationGrid').textContent, /办事处上海办/);
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
    const changeGroups = [...document.querySelectorAll('#recordProductChangeList .record-product-change-group .change-group-name')].map((el) => el.textContent.trim());
    assert.deepEqual(changeGroups, ['计算虚拟化', '分布式存储'], '多模块配置变更应按模块分组');
    const groupBodies = [...document.querySelectorAll('#recordProductChangeList .record-product-change-group-body')];
    groupBodies.forEach((body) => assert.equal(body.hidden, true, '模块明细默认收起'));
    const firstGroup = document.querySelector('#recordProductChangeList .record-product-change-group');
    assert.match(firstGroup.textContent, /3 项变更 · 至 2026-09-29/, '收起时应展示变更摘要');
    firstGroup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(groupBodies[0].hidden, false, '点击分组应展开明细');
    assert.equal(firstGroup.getAttribute('aria-expanded'), 'true');
    assert.match(document.getElementById('recordProductChangeList').textContent, /集群内物理CPU颗数—16 颗/, '首开场景变更前为—');
    assert.match(document.getElementById('recordProductChangeList').textContent, /存储授权容量—100 TB/);
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
    assert.match(document.getElementById('recordXaasDeliveryGrid').textContent, /云授权IDCLA-SASE-JD-050/, '已授权 XaaS 开通结果应展示云授权ID');
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

test('累计超期·审批中记录的详情展示多个可下载附件', () => {
  const { dom, document, window } = setupRecords();
  try {
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const overdueRow = rows.find((row) => row.children[0]?.textContent.includes('AUTH-20260820-200'));
    assert.ok(overdueRow, '应存在累计超期·审批中 Mock 记录');
    overdueRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const grid = document.getElementById('recordProductSupplementGrid');
    assert.match(grid.textContent, /升级审批/);
    assert.match(grid.textContent, /申请原因/);
    const attachments = grid.querySelectorAll('.record-detail-attachment');
    assert.equal(attachments.length, 3, '详情应展示 3 个附件');
    assert.match(grid.textContent, /超期测试说明\.pdf/);
    assert.match(grid.textContent, /测试报告\.docx/);
    assert.match(grid.textContent, /压测截图\.png/);
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

test('复制产品授权记录跳转并自动回填申请表单', () => {
  const { dom, document, window } = setupRecords();
  try {
    const copy = clickAction(document, window, 'copy');
    assert.equal(copy.getAttribute('aria-haspopup'), null);
    assert.equal(document.body.dataset.activeTab, 'hardware');
    assert.equal(document.getElementById('content-hardware').style.display, 'block');
    assert.equal(document.getElementById('content-records').style.display, 'none');
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.equal(document.getElementById('plname').selectedOptions[0].textContent.trim(), 'HCI');
    assert.equal(document.getElementById('cloudVersion').selectedOptions[0].textContent.trim(), 'HCI-6.8.1-VKEY');
    assert.equal(document.getElementById('customerSearchInput').value, '深圳市腾讯计算机系统有限公司');
    assert.equal(document.getElementById('selectedCustomerName').textContent, '深圳市腾讯计算机系统有限公司');
    assert.equal(document.getElementById('area').value, '上海区');
    assert.equal(document.getElementById('unifiedDate').value, '2026-09-29');
    assert.match(document.getElementById('recordActionToastText').textContent, /AUTH-20260701-001/);
  } finally {
    dom.window.close();
  }
});

test('复制非 HCI 产品记录回填历史版本和设备 ID', () => {
  const { dom, document, window } = setupRecords();
  try {
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const wafRow = rows.find((row) => row.children[3]?.textContent.trim() === 'WAF');
    assert.ok(wafRow, '应存在可复制的 WAF 产品授权记录');
    const copy = wafRow.querySelector('[data-record-action="copy"]');
    assert.ok(copy, 'WAF 记录应支持复制');

    copy.click();

    assert.equal(document.getElementById('plname').selectedOptions[0].textContent.trim(), 'WAF');
    assert.equal(document.getElementById('cloudVersion').selectedOptions[0].textContent.trim(), 'WAF-7.0.5');
    assert.equal(document.getElementById('customerSearchInput').value, '中国石油天然气集团有限公司');
    assert.equal(document.getElementById('devIdNew').value, 'GW-WAF-012');
    assert.match(document.getElementById('chipContainer').textContent, /GW-WAF-012/);
    assert.equal(document.getElementById('area').value, '北京区');
    assert.equal(document.getElementById('unifiedDate').value, '2026-09-28');
  } finally {
    dom.window.close();
  }
});

test('复制 XaaS 授权记录跳转并自动回填申请表单', () => {
  const { dom, document, window } = setupRecords();
  try {
    document.querySelector('#navBar [data-tab="records"]').click();
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const xaasRow = rows.find((row) => row.children[3]?.textContent.trim() === 'SASE-GA');
    assert.ok(xaasRow, '应存在可复制的 SASE-GA XaaS 记录');
    const copy = xaasRow.querySelector('[data-record-action="copy"]');
    assert.ok(copy, 'XaaS 记录应支持复制');

    copy.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    assert.equal(document.body.dataset.activeTab, 'xaas');
    assert.equal(document.getElementById('content-xaas').style.display, 'block');
    assert.equal(document.getElementById('content-records').style.display, 'none');
    assert.ok(document.querySelector('#navBar [data-tab="xaas"]').classList.contains('layui-this'));
    assert.ok(document.querySelector('#top_tabs [data-tab="xaas"]').classList.contains('layui-this'));
    assert.equal(document.getElementById('recordDrawerLayer').hidden, true);
    assert.equal(document.getElementById('xaas-contact-name').value, '王蕾');
    assert.equal(document.getElementById('xaas-contact-phone').value, '186****3098');
    assert.equal(document.getElementById('xaas-contact-email').value, 'wanglei***@jd.com');
    assert.equal(document.getElementById('xaas-customer-name').value, '京东集团股份有限公司');
    assert.equal(document.getElementById('xaas-industry-l1').value, '互联网');
    assert.equal(document.getElementById('xaas-industry-l2').value, '电商');
    const productItem = document.querySelector('.xaas-product-item[data-product="SASE-GA"]');
    assert.equal(productItem.querySelector('input[name="xaas-product"]').checked, true);
    assert.ok(productItem.classList.contains('selected'));
    assert.match(productItem.querySelector('.xaas-product-desc').textContent, /带宽10M/);
    assert.match(document.getElementById('sase-customer-need').value, /海外办公/);
    assert.match(document.getElementById('sase-project-scale').value, /500 名办公用户/);
    assert.match(document.getElementById('sase-competitor').value, /国际专线方案/);
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
  const downloadedFiles = [];
  const originalAnchorClick = window.HTMLAnchorElement.prototype.click;
  window.HTMLAnchorElement.prototype.click = function() {
    downloadedFiles.push({ name: this.download, href: this.href });
  };
  try {
    const approveAction = clickAction(document, window, 'approve');
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
    const submissionAttachment = document.querySelector('[aria-label="下载附件 阿里集团-XDR客户信息收集表.xlsx"]');
    assert.ok(submissionAttachment);
    assert.equal(submissionAttachment.tagName, 'BUTTON');
    submissionAttachment.click();
    assert.equal(downloadedFiles.at(-1).name, '阿里集团-XDR客户信息收集表.xlsx');
    assert.match(document.getElementById('recordActionToastText').textContent, /附件下载已开始/);
    assert.equal(document.querySelectorAll('input[name="recordApprovalDecision"]').length, 2);
    assert.equal(document.querySelector('input[name="recordApprovalDecision"]:checked'), null);
    const attachmentInput = document.getElementById('recordApprovalAttachments');
    assert.ok(attachmentInput);
    assert.equal(attachmentInput.multiple, true);
    assert.match(document.getElementById('recordWorkflowContent').textContent, /审批附件（可选）/);
    const attachmentFiles = [
      new window.File(['approval-basis'], '客户情况说明.pdf', { type: 'application/pdf', lastModified: 1 }),
      new window.File(['meeting-note'], '沟通纪要.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', lastModified: 2 })
    ];
    Object.defineProperty(attachmentInput, 'files', { configurable: true, value: attachmentFiles });
    attachmentInput.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.match(document.querySelector('.record-workflow-file-list').textContent, /客户情况说明\.pdf/);
    assert.match(document.querySelector('.record-workflow-file-list').textContent, /沟通纪要\.docx/);
    const removeButtons = document.querySelectorAll('.record-workflow-file-remove');
    assert.equal(removeButtons.length, 2);
    removeButtons[1].click();
    assert.doesNotMatch(document.querySelector('.record-workflow-file-list').textContent, /沟通纪要\.docx/);
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
    assert.match(document.getElementById('recordActionToastText').textContent, /已上传 1 个附件/);
    approveAction.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(document.getElementById('recordWorkflowContent').textContent, /客户情况说明\.pdf/);
    assert.doesNotMatch(document.getElementById('recordWorkflowContent').textContent, /沟通纪要\.docx/);
    assert.match(document.getElementById('recordWorkflowContent').textContent, /申请信息完整，同意进入下一节点/);
    const approvalAttachment = document.querySelector('[aria-label="下载附件 客户情况说明.pdf"]');
    assert.ok(approvalAttachment);
    assert.equal(approvalAttachment.tagName, 'BUTTON');
    approvalAttachment.click();
    assert.equal(downloadedFiles.at(-1).name, '客户情况说明.pdf');
  } finally {
    window.HTMLAnchorElement.prototype.click = originalAnchorClick;
    dom.window.close();
  }
});

test('移动端审核将审批意见、附件和同意操作收纳在固定页脚', () => {
  const { dom, document, window } = setupMobileRecords();
  try {
    const approveAction = clickAction(document, window, 'approve');
    const layer = document.getElementById('recordDrawerLayer');
    const mobileComposer = document.getElementById('recordMobileApprovalComposer');
    const primary = document.getElementById('recordDrawerPrimary');
    const reject = document.getElementById('recordDrawerReject');
    assert.equal(layer.dataset.recordWorkflowAction, 'approve');
    assert.equal(mobileComposer.hidden, false);
    assert.equal(document.getElementById('recordDrawerSecondary').hidden, true);
    assert.equal(reject.hidden, false);
    assert.equal(primary.textContent, '同意');
    assert.ok(document.querySelector('.record-approval-decision'));

    const attachmentInput = document.getElementById('recordApprovalAttachments');
    const attachment = new window.File(['mobile-approval'], '移动端审批依据.pdf', { type: 'application/pdf', lastModified: 1 });
    Object.defineProperty(attachmentInput, 'files', { configurable: true, value: [attachment] });
    attachmentInput.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.match(document.getElementById('recordMobileAttachmentStatus').textContent, /已添加 1 个附件/);

    document.getElementById('recordMobileApprovalOpinion').value = '移动端核验完成，同意开通';
    primary.click();
    assert.equal(layer.hidden, true);
    assert.match(document.getElementById('recordActionToastText').textContent, /审批通过已提交/);
    const submitted = approveAction.closest('tr')._submittedApproval;
    assert.equal(submitted.decision, 'approve');
    assert.equal(submitted.opinion, '移动端核验完成，同意开通');
    assert.equal(submitted.attachments[0].name, '移动端审批依据.pdf');
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
