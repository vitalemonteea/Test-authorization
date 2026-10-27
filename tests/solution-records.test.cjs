'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

function setupRecords() {
  const context = loadV2Dom();
  context.window.initRecordsPagination();
  context.window.initRecordsStatusFilters();
  context.window.initRecordsMobileFilter();
  context.window.initRecordDetailDrawer();
  return context;
}

function getRows(document) {
  return [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
}

function getSolutionLines(document) {
  return [...document.querySelectorAll('#recordSolutionLineList .record-solution-line-row:not(.record-solution-line-head)')].map((row) => ({
    name: row.querySelector('.record-solution-line-name').textContent,
    scene: row.querySelector('.solution-scene-tag').textContent,
    devices: row.querySelector('.record-solution-line-device').textContent
  }));
}

function getSolutionMarks(document) {
  return [...document.querySelectorAll('#recordSolutionLineList .record-solution-line-row:not(.record-solution-line-head)')].map((row) => ({
    name: row.querySelector('.record-solution-line-name').textContent,
    mark: row.querySelector('.record-solution-line-marks').textContent.trim()
  }));
}

function openSolutionTab(document) {
  document.querySelector('#navBar li[data-tab="solution"]').click();
}

function selectBorrowCustomer(document, window, customerId) {
  const search = document.getElementById('solutionBorrowCustomerSearch');
  search.value = '';
  search.dispatchEvent(new window.Event('input', { bubbles: true }));
  const item = document.querySelector('[data-solution-borrow-customer="' + customerId + '"]');
  assert.ok(item, '应能找到借测客户 ' + customerId);
  item.click();
}

function click(document, window, id) {
  const element = document.getElementById(id);
  assert.ok(element, '应存在元素 ' + id);
  element.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  return element;
}

test('解决方案主行可展开产品明细，XaaS 行展示云图ID且不展示伪SN', () => {
  const { dom, document } = setupRecords();
  try {
    const solutionRow = getRows(document).find((row) => row.textContent.includes('SOL-20260701-001'));
    assert.ok(solutionRow, '应存在解决方案主行');
    const detail = solutionRow.nextElementSibling;
    assert.equal(detail.classList.contains('solution-detail-row'), true);
    assert.equal(detail.style.display, 'none');

    solutionRow.querySelector('button').click();
    assert.equal(detail.style.display, '');
    assert.match(detail.textContent, /SaaS-XDR/);
    assert.match(detail.textContent, /云图ID: YT-10200001/);
    const xaasRow = [...detail.querySelectorAll('tbody tr')].find((row) => row.textContent.includes('SaaS-XDR'));
    const xaasCells = [...xaasRow.children].filter((cell) => !cell.classList.contains('solution-op-col'));
    assert.equal(xaasCells[3].textContent.trim(), '—', 'XaaS 行设备SN应为破折号');
    assert.match(xaasCells[6].textContent, /^LIC-SaaS-XDR-/);

    const rejectedRow = getRows(document).find((row) => row.textContent.includes('SOL-20260704-002'));
    assert.ok(rejectedRow, '应存在已驳回的解决方案主行');
    rejectedRow.querySelector('td button').click();
    assert.equal(rejectedRow.nextElementSibling.style.display, '');
    assert.match(rejectedRow.nextElementSibling.textContent, /NDR-2\.4\.0/);
  } finally {
    dom.window.close();
  }
});

test('解决方案主抽屉只展示方案级信息，设备行独立打开单品详情', () => {
  const { dom, document, window } = setupRecords();
  try {
    const solutionRow = getRows(document).find((row) => row.textContent.includes('SOL-20260701-001'));
    solutionRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(document.getElementById('recordAuthorizationSection').hidden, true);
    assert.equal(document.getElementById('recordCustomerSection').hidden, false);
    assert.equal(document.getElementById('recordSolutionDeviceHintSection').hidden, false);
    assert.equal(document.getElementById('recordSolutionProductSection'), null);
    assert.equal(document.getElementById('recordSolutionDeliverySection').hidden, false);

    const application = document.getElementById('recordApplicationGrid').textContent;
    assert.doesNotMatch(application, /方案编码/, '方案编码仅后台记录，不在授权记录展示');
    assert.doesNotMatch(application, /SOL-CLOUD-001/);
    assert.match(application, /关联借测单/);
    assert.match(application, /BOR-202607-011/);
    assert.match(application, /企业云一体化方案/);
    assert.equal(document.getElementById('recordSolutionLineSection').hidden, false, '方案产品线应作为独立模块展示');
    assert.doesNotMatch(application, /方案产品线/, '申请信息不再挤入方案产品线');
    const lines = getSolutionLines(document);
    assert.deepEqual(lines.find((line) => line.name === 'HCI'), { name: 'HCI', scene: '首次开通', devices: 'GW-HCI-001' });
    assert.deepEqual(lines.find((line) => line.name === 'SaaS-XDR'), { name: 'SaaS-XDR', scene: '新客户试用', devices: '云图ID: YT-10200001' });

    const customer = document.getElementById('recordCustomerGrid').textContent;
    assert.match(customer, /中国工商银行股份有限公司/);
    assert.match(customer, /YT-10200001/);
    assert.match(customer, /13800138000/);
    assert.match(customer, /license@icbc\.com\.cn/);
    assert.match(document.getElementById('recordSolutionDeliveryGrid').textContent, /6 条产品线 · 6 个设备/);
    assert.match(document.getElementById('recordSolutionDeliveryGrid').textContent, /授权信息-SOL-20260701-001/);

    document.getElementById('recordDrawerSecondary').click();
    solutionRow.querySelector('td button').click();
    const deviceLinks = solutionRow.nextElementSibling.querySelectorAll('.solution-device-detail');
    assert.equal(deviceLinks.length, 6, '每个设备行都应有独立详情入口');
    deviceLinks[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(document.getElementById('recordDrawerTitle').textContent, '设备授权详情');
    assert.equal(document.getElementById('recordApplicationTitle').lastChild.textContent.trim(), '授权信息');
    assert.match(document.getElementById('recordApplicationGrid').textContent, /授权场景首次开通/);
    assert.equal(document.getElementById('recordProductDetailSection').hidden, false);
    assert.equal(document.getElementById('recordSolutionDeviceParamTitle').hidden, false);
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /GW-HCI-001/);
    assert.match(document.getElementById('recordSolutionDeviceParamGrid').textContent, /计算虚拟化/);
    assert.match(document.getElementById('recordProductDeliveryGrid').textContent, /LIC-HCI-001/);
    assert.equal(document.getElementById('recordCustomerSection').hidden, true, '设备详情不重复方案客户信息');
    assert.equal(document.getElementById('recordApprovalSection').hidden, true, '设备详情不重复方案审批信息');
    assert.equal(document.getElementById('recordDrawerBack').hidden, false);

    document.getElementById('recordDrawerBack').click();
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '授权记录详情');
    assert.equal(document.getElementById('recordSolutionDeviceHintSection').hidden, false);
  } finally {
    dom.window.close();
  }
});

test('授权记录支持借测单号、授权码穿透搜索并保留所属方案主行', () => {
  const { dom, document } = setupRecords();
  try {
    const keyword = document.getElementById('recordsDeviceInput');
    const query = document.getElementById('recordsQueryButton');

    keyword.value = 'BOR-202607-011';
    query.click();
    let visible = getRows(document).filter((row) => row.style.display !== 'none');
    assert.equal(visible.length, 1, '借测单号应只命中所属方案主行');
    assert.match(visible[0].textContent, /SOL-20260701-001/);

    keyword.value = 'LIC-SaaS-XDR-001';
    query.click();
    visible = getRows(document).filter((row) => row.style.display !== 'none');
    assert.equal(visible.length, 1, '授权码应穿透命中所属方案主行');
    assert.match(visible[0].textContent, /SOL-20260701-001/);
    assert.equal(visible[0].nextElementSibling.style.display, '', '命中子行时方案明细应自动展开');
    assert.match(visible[0].nextElementSibling.textContent, /LIC-SaaS-XDR-001/);

    document.getElementById('recordsResetButton').click();
    assert.equal(keyword.value, '');
    assert.equal(getRows(document).filter((row) => row.style.display !== 'none').length, Math.min(10, getRows(document).length));
  } finally {
    dom.window.close();
  }
});

test('申请人、申请日期与产品线可组合过滤解决方案记录', () => {
  const { dom, document, window } = setupRecords();
  try {
    const applicant = document.getElementById('recordsApplicantInput');
    const dateInput = document.getElementById('applyDateRange');
    const productSelect = document.getElementById('recordsProductSelect');
    const query = document.getElementById('recordsQueryButton');

    applicant.value = '钱七';
    query.click();
    let visible = getRows(document).filter((row) => row.style.display !== 'none');
    assert.ok(visible.length > 0);
    visible.forEach((row) => assert.match(row.cells[11].textContent, /钱七/));

    applicant.value = '';
    dateInput.value = '2026-07-01 ~ 2026-07-01';
    query.click();
    visible = getRows(document).filter((row) => row.style.display !== 'none');
    assert.ok(visible.length > 0);
    visible.forEach((row) => assert.match(row.cells[12].textContent, /^2026-07-01/));

    dateInput.value = '';
    productSelect.value = 'SaaS-XDR';
    productSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    visible = getRows(document).filter((row) => row.style.display !== 'none');
    const solutionRow = visible.find((row) => row.textContent.includes('SOL-20260701-001'));
    assert.ok(solutionRow, '子产品 SaaS-XDR 过滤应保留所属方案主行');
    assert.match(solutionRow.nextElementSibling.textContent, /SaaS-XDR/);

    document.getElementById('recordsResetButton').click();
    assert.equal(document.getElementById('recordsProductSelect').value, '全部');
    assert.equal(dateInput.value, '');
  } finally {
    dom.window.close();
  }
});

test('提交多设备方案后主行设备数与明细行随追加设备同步', () => {
  const { dom, document, window } = setupRecords();
  try {
    openSolutionTab(document);
    selectBorrowCustomer(document, window, 'C100107');
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-006';
    click(document, window, 'solutionBorrowLookup');

    document.querySelector('[data-solution-add-device="AF"]').click();
    const extraInput = document.querySelector('[data-solution-extra-device="AF"]');
    extraInput.value = 'GW-AF-EXTRA-002';
    extraInput.dispatchEvent(new window.Event('input', { bubbles: true }));

    click(document, window, 'solutionSubmitWhole');
    assert.match(document.getElementById('solutionApplicationStatus').textContent, /已授权/);

    const generated = document.querySelector('#content-records .solution-parent[data-solution-generated="true"]');
    assert.ok(generated, '应生成方案授权主行');
    const detail = generated.nextElementSibling;
    const deviceSummary = generated.cells[6].querySelector('.device-summary');
    assert.equal(deviceSummary.textContent.trim(), 'GW-AF-930 等3个设备', 'AF 主设备 + 追加设备 + 已开启的 SASE-GA 应合计 3 个设备；实际明细：' + detail.textContent);
    assert.match(deviceSummary.getAttribute('data-full'), /GW-AF-EXTRA-002/);

    const detailRows = [...detail.querySelectorAll('tbody tr')].filter((row) => row.querySelector('td'));
    assert.equal(detailRows.length, 3, '展开明细应按设备逐行生成；实际行：' + detailRows.map((row) => row.textContent.slice(0, 12)).join(' | '));
    assert.match(detail.textContent, /GW-AF-EXTRA-002/);

    const recordId = generated.cells[0].textContent.trim().replace('chevron_right', '');
    const stored = window.solutionRecordStore[recordId];
    assert.ok(stored, '应写入方案记录详情数据');
    assert.equal(stored.productLines.length, 3);
    assert.equal(stored.source, '关联借测单');
    assert.equal(stored.borrowOrder, 'BOR-202608-006');
    assert.ok(stored.biz.some((item) => item.label === '客户需求'));

    generated.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.match(document.getElementById('recordApplicationGrid').textContent, /BOR-202608-006/);
    const afOps = [...document.querySelectorAll('#recordSolutionLineList [data-record-solution-line="AF"] .record-solution-line-op')];
    assert.equal(afOps.length, 2, '多设备产线在操作列按设备各给一个入口');
    assert.deepEqual(afOps.map((op) => op.querySelector('.record-solution-line-op-device').textContent), ['GW-AF-930', 'GW-AF-EXTRA-002']);
    const saseLine = getSolutionLines(document).find((line) => line.name === 'SASE-GA');
    assert.ok(saseLine, '方案产品线应展示 SASE-GA');
    assert.equal(saseLine.scene, '新客户审批');
    assert.match(document.getElementById('recordSolutionBizGrid').textContent, /客户需求/);
    assert.equal(document.getElementById('recordSolutionDeviceHintSection').hidden, false);

    document.getElementById('recordDrawerSecondary').click();
    generated.querySelector('td button').click();
    const deviceLinks = detail.querySelectorAll('.solution-device-detail');
    assert.equal(deviceLinks.length, 3, '每个设备行都应提供独立详情入口');
    deviceLinks[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '设备授权详情');
    assert.match(document.getElementById('recordApplicationGrid').textContent, /授权场景首次开通/);
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /GW-AF-EXTRA-002/);
    assert.match(document.getElementById('recordSolutionDeviceParamGrid').textContent, /已启用授权功能/);
    assert.match(document.getElementById('recordProductDeliveryGrid').textContent, /LIC-AF-003-2/);

    deviceLinks[2].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '设备授权详情');
    assert.equal(document.getElementById('recordXaasSubscriptionSection').hidden, false, 'XaaS 设备行应展示订阅授权明细');
    assert.equal(document.getElementById('recordProductDetailSection').hidden, true, 'XaaS 设备行不应展示硬件授权对象');
    assert.match(document.getElementById('recordApplicationGrid').textContent, /授权场景新客户审批/);
    assert.match(document.getElementById('recordXaasSubscriptionList').textContent, /SASE 产品族/);
    assert.match(document.getElementById('recordXaasSubscriptionList').textContent, /SASE-GA 全球加速/);
    assert.match(document.getElementById('recordXaasSubscriptionList').textContent, /带宽5M/);
    assert.equal(document.getElementById('recordCustomerSection').hidden, false, 'XaaS 设备行保留设备级联系人');
    assert.match(document.getElementById('recordCustomerGrid').textContent, /联系人姓名/);
    assert.doesNotMatch(document.getElementById('recordCustomerGrid').textContent, /所属云图账号/, '客户信息已在方案主记录展示，设备行不重复');
    assert.equal(document.getElementById('recordXaasSupplementSection').hidden, true, '业务补充信息已在方案主记录展示，设备行不重复');
    assert.equal(document.getElementById('recordApprovalSection').hidden, true, '审批信息已在方案主记录展示，设备行不重复');
    assert.match(document.getElementById('recordXaasDeliveryGrid').textContent, /租户\/实例标识/);
    assert.match(document.getElementById('recordXaasDeliveryGrid').textContent, /出版版本/);
    assert.match(document.getElementById('recordXaasDeliveryGrid').textContent, /LIC-SASE-GA-003/);
  } finally {
    dom.window.close();
  }
});

test('方案设备详情的授权场景和超限标记使用标签样式', () => {
  const { dom, document, window } = setupRecords();
  try {
    const solutionRow = getRows(document).find((row) => row.textContent.includes('SOL-20260701-001'));
    const rowData = window.getRecordRowData(solutionRow);
    const detail = window.getSolutionRecordDetail(solutionRow, rowData);
    detail.productLines = detail.productLines.map((device, index) => ({
      ...device,
      authScene: index === 0 ? '延期' : device.authScene,
      overlimit: index === 0 ? '超时间限制' : undefined
    }));
    window.solutionRecordStore = window.solutionRecordStore || {};
    window.solutionRecordStore[rowData.applicationNo] = detail;

    solutionRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    solutionRow.querySelector('td button').click();
    const links = solutionRow.nextElementSibling.querySelectorAll('.solution-device-detail');
    links[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const scene = document.querySelector('#recordApplicationGrid .solution-scene-tag');
    assert.ok(scene, '授权场景应使用蓝色标签');
    assert.equal(scene.textContent, '延期');
    assert.equal(window.getComputedStyle(scene).backgroundColor, 'rgb(229, 238, 255)');

    const overlimit = document.querySelector('#recordApplicationGrid .solution-overlimit-tag');
    assert.ok(overlimit, '超限标记应使用橙色标签');
    assert.equal(overlimit.textContent, '超时间限制');
    assert.equal(window.getComputedStyle(overlimit).backgroundColor, 'rgb(255, 241, 214)');

    links[1].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.querySelector('#recordApplicationGrid .solution-overlimit-tag'), null, '空超限值不应显示彩色标签');
    assert.ok(document.querySelector('#recordApplicationGrid .solution-scene-tag'), '设备场景标签仍应保留');

    document.getElementById('recordDrawerSecondary').click();
    const productRow = getRows(document).find((row) => row.textContent.includes('AUTH-20260701-001'));
    productRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.querySelector('#recordApplicationGrid .solution-scene-tag'), null, '原单品详情不应套用方案标签样式');
    assert.equal(document.querySelector('#recordApplicationGrid .solution-overlimit-tag'), null);
  } finally {
    dom.window.close();
  }
});

test('方案主记录用独立模块展示产品线、授权场景与超限标记', () => {
  const { dom, document, window } = setupRecords();
  try {
    const solutionRow = getRows(document).find((row) => row.textContent.includes('SOL-20260701-001'));
    solutionRow.querySelector('[data-record-action="view"]').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    assert.equal(document.getElementById('recordSolutionLineSection').hidden, false);
    const head = document.querySelector('#recordSolutionLineList .record-solution-line-head');
    assert.deepEqual([...head.children].map((cell) => cell.textContent), ['产品线', '授权场景', '超限标记', '设备', '操作']);

    const lines = getSolutionLines(document);
    assert.deepEqual(lines.map((line) => line.name), ['HCI', 'AC', 'NGAF', 'AD', 'WOC', 'SaaS-XDR']);
    assert.deepEqual(lines.map((line) => line.scene), ['首次开通', '首次开通', '首次开通', '首次开通', '首次开通', '新客户试用']);
    assert.deepEqual(lines.map((line) => line.devices), ['GW-HCI-001', 'GW-AC-005', 'GW-NGAF-003', 'GW-AD-002', 'GW-WOC-001', '云图ID: YT-10200001']);

    const marks = getSolutionMarks(document);
    assert.equal(marks.find((line) => line.name === 'AC').mark, '超时间限制');
    assert.deepEqual(marks.filter((line) => line.name !== 'AC').map((line) => line.mark), ['—', '—', '—', '—', '—']);

    const hciScene = document.querySelector('#recordSolutionLineList .solution-scene-tag');
    assert.equal(window.getComputedStyle(hciScene).backgroundColor, 'rgb(229, 238, 255)');
    assert.equal(window.getComputedStyle(hciScene).color, 'rgb(0, 80, 203)');

    const acMark = document.querySelector('#recordSolutionLineList .solution-overlimit-tag');
    assert.equal(acMark.textContent, '超时间限制');
    assert.equal(window.getComputedStyle(acMark).backgroundColor, 'rgb(255, 241, 214)');
    assert.equal(window.getComputedStyle(acMark).color, 'rgb(138, 75, 0)');

    const acRow = document.querySelector('#recordSolutionLineList [data-record-solution-line="AC"]');
    assert.equal(acRow.querySelector('.record-solution-line-device .solution-device-detail'), null, '设备列不再内联详情入口');
    const acLink = acRow.querySelector('.record-solution-line-ops .solution-device-detail');
    assert.equal(acLink.textContent, '查看详情');
    acLink.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '设备授权详情');
    assert.match(document.getElementById('recordProductDeviceGrid').textContent, /GW-AC-005/);
    assert.match(document.getElementById('recordApplicationGrid').textContent, /超时间限制/);
    assert.equal(document.getElementById('recordDrawerBack').hidden, false);

    document.getElementById('recordDrawerBack').click();
    assert.equal(document.getElementById('recordDrawerTitle').textContent, '授权记录详情');
    assert.equal(document.getElementById('recordSolutionLineSection').hidden, false);

    document.getElementById('recordDrawerSecondary').click();
    solutionRow.querySelector('td button').click();
    solutionRow.nextElementSibling.querySelector('.solution-device-detail').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('recordSolutionLineSection').hidden, true, '设备详情不重复展示方案产品线模块');
  } finally {
    dom.window.close();
  }
});
