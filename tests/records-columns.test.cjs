'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

test('申请平台列默认隐藏但数据仍可被行数据读取', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const platformHeader = document.querySelectorAll('#content-records .table-scroll-wrap > table > thead th')[2];
    assert.equal(platformHeader.textContent.trim(), '申请平台');
    assert.equal(window.getComputedStyle(platformHeader).display, 'none');

    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    assert.ok(rows.length > 0);
    rows.forEach((row) => {
      const platformCell = row.querySelectorAll('td')[2];
      assert.equal(window.getComputedStyle(platformCell).display, 'none');
    });

    const firstRowData = window.getRecordRowData(rows[0]);
    assert.equal(firstRowData.platform, '本平台', '隐藏列数据仍应可读取供详情抽屉使用');
  } finally {
    dom.window.close();
  }
});

test('设备ID列表头更名为设备ID/云图ID', () => {
  const { dom, document } = loadV2Dom();
  try {
    const headers = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > thead th')];
    const deviceHeader = headers.find((th) => th.textContent.trim() === '设备ID/云图ID');
    assert.ok(deviceHeader, '表头应为 设备ID/云图ID');
    assert.equal(headers.some((th) => th.textContent.trim() === '设备ID'), false);
  } finally {
    dom.window.close();
  }
});

test('XaaS记录设备ID列直接显示云图ID', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const xaasRows = rows.filter((row) => row.querySelectorAll('td')[1].textContent.trim() === 'XaaS');
    assert.ok(xaasRows.length >= 2);
    xaasRows.forEach((row) => {
      const device = window.getRecordRowData(row).device;
      assert.match(device, /^TENANT-/, 'XaaS 记录应显示云图ID');
      assert.doesNotMatch(device, /个设备/);
    });
    const xdrRow = xaasRows.find((row) => row.textContent.includes('AUTH-20260702-015'));
    assert.equal(window.getRecordRowData(xdrRow).device, 'TENANT-XDR-ALB-015');
    const saseRow = xaasRows.find((row) => row.textContent.includes('AUTH-20260629-050'));
    assert.equal(window.getRecordRowData(saseRow).device, 'TENANT-SASE-JD-050');
  } finally {
    dom.window.close();
  }
});

test('多设备记录悬浮展开设备ID明细', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordDownloadActions();
    window.initRecordActionTips();
    window.initRecordsTooltip();
    const summaries = [...document.querySelectorAll('#content-records .device-summary')];
    assert.ok(summaries.length >= 2, '多设备记录应存在悬浮展开入口');
    summaries.forEach((summary) => {
      assert.match(summary.textContent, /\d+个设备$/);
      assert.ok(summary.getAttribute('data-full').includes('\n'), '明细应为多行设备ID');
    });

    const solutionSummary = summaries.find((el) => el.textContent.trim() === '6个设备');
    solutionSummary.dispatchEvent(new window.MouseEvent('mouseenter'));
    const tooltip = document.getElementById('recordsActionTooltip');
    assert.ok(tooltip.classList.contains('show'));
    assert.ok(tooltip.classList.contains('is-multiline'));
    ['GW-HCI-001', 'GW-AC-005', 'GW-NGAF-003', 'GW-AD-002', 'GW-WOC-001'].forEach((id) => {
      assert.ok(tooltip.textContent.includes(id), `悬浮明细应包含 ${id}`);
    });
    solutionSummary.dispatchEvent(new window.MouseEvent('mouseleave'));
    assert.equal(tooltip.classList.contains('show'), false);

    const actionTip = document.querySelector('#content-records [data-action-tip]');
    actionTip.dispatchEvent(new window.MouseEvent('mouseenter'));
    assert.ok(tooltip.classList.contains('show'));
    assert.equal(tooltip.classList.contains('is-multiline'), false, '单行提示不应沿用多行样式');
    actionTip.dispatchEvent(new window.MouseEvent('mouseleave'));
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('设备ID/云图ID列截断时悬浮展示完整信息', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordsTooltip();
    const deviceCells = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row) > td:nth-child(7)')];
    assert.ok(deviceCells.length > 0);
    deviceCells.forEach((cell) => {
      assert.equal(cell.dataset.recordsTooltipReady, 'true', '设备ID/云图ID单元格应绑定悬浮提示');
      const style = window.getComputedStyle(cell);
      assert.equal(style.overflow, 'hidden');
      assert.equal(style.textOverflow, 'ellipsis');
    });

    const tooltip = document.getElementById('recordsActionTooltip');
    const tenantCell = deviceCells.find((cell) => cell.textContent.trim() === 'TENANT-XDR-ALB-015');
    // 模拟列宽不足导致文本被截断
    Object.defineProperty(tenantCell, 'scrollWidth', { value: 180 });
    Object.defineProperty(tenantCell, 'clientWidth', { value: 150 });
    tenantCell.dispatchEvent(new window.MouseEvent('mouseenter'));
    assert.ok(tooltip.classList.contains('show'), '截断单元格悬浮应展示完整信息');
    assert.equal(tooltip.textContent, 'TENANT-XDR-ALB-015');
    tenantCell.dispatchEvent(new window.MouseEvent('mouseleave'));
    assert.equal(tooltip.classList.contains('show'), false);

    const plainCell = deviceCells.find((cell) => cell.textContent.trim() === 'GW-2024-HCI-001');
    plainCell.dispatchEvent(new window.MouseEvent('mouseenter'));
    assert.equal(tooltip.classList.contains('show'), false, '未截断时不应弹出提示');
    plainCell.dispatchEvent(new window.MouseEvent('mouseleave'));
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('移动端授权记录页纵向堆叠并取消冻结列', () => {
  const { dom, document } = loadV2Dom();
  try {
    // 页面应存在移动端适配所需的钩子类
    assert.ok(document.querySelector('#content-records .records-page-head .records-title-wrap h1'));
    assert.ok(document.querySelector('#content-records .records-filter-layout .records-filter-actions #recordsQueryButton'));
    assert.ok(document.querySelector('#content-records .records-pagination #paginationInfo'));

    const styleText = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const mobileBlocks = styleText.match(/@media \(max-width:\s*768px\)\s*\{[\s\S]*?\n\s*\}/g) || [];
    const mobileCss = mobileBlocks.join('\n').replace(/\s+/g, '');
    assert.match(mobileCss, /\.records-page-head\{flex-direction:column/, '移动端标题与状态条应纵向堆叠');
    assert.match(mobileCss, /#recordsStatusSummary\{overflow-x:auto/, '移动端状态筛选条应可横向滑动');
    assert.match(mobileCss, /\.records-filter-layout\{flex-direction:column/, '移动端筛选区应纵向排列');
    assert.match(mobileCss, /\.records-filter-actionsbutton\{flex:1/, '移动端查询按钮应整行等分');
    assert.match(mobileCss, /\.sticky-right\{position:static;left:auto;right:auto\}/, '移动端应取消左右冻结列');
    assert.match(mobileCss, /\.records-pagination\{flex-wrap:wrap/, '移动端分页栏应允许换行');
  } finally {
    dom.window.close();
  }
});

test('移动端筛选栏提供搜索快捷筛选并可展开完整筛选', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordsPagination();
    window.initRecordsStatusFilters();
    window.initRecordsMobileFilter();

    const bar = document.getElementById('recordsMobileFilterbar');
    assert.ok(bar.querySelector('#recordsMobileSearch'));
    assert.ok(bar.querySelector('#recordsMobileType'));
    assert.ok(bar.querySelector('#recordsMobileStatus'));
    assert.equal(window.getComputedStyle(bar).display, 'none', '桌面端默认隐藏移动筛选栏');

    const styleText = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const mobileBlocks = styleText.match(/@media \(max-width:\s*768px\)\s*\{[\s\S]*?\n\s*\}/g) || [];
    const mobileCss = mobileBlocks.join('\n').replace(/\s+/g, '');
    assert.match(mobileCss, /\.records-mobile-filterbar\{display:flex/, '移动端应展示筛选栏');
    assert.match(mobileCss, /\.records-filter-card\{display:none\}/, '移动端完整筛选面板默认收起');
    assert.match(mobileCss, /\.records-filter-card\.open\{display:block\}/, '点击筛选后展开面板');

    // 筛选按钮展开/收起完整筛选面板
    const toggle = document.getElementById('recordsMobileFilterToggle');
    const card = document.getElementById('recordsFilterCard');
    toggle.click();
    assert.ok(card.classList.contains('open'));
    assert.equal(toggle.getAttribute('aria-expanded'), 'true');
    toggle.click();
    assert.equal(card.classList.contains('open'), false);

    // 快捷状态筛选直接过滤记录并与状态芯片/下拉联动
    const mobileStatus = document.getElementById('recordsMobileStatus');
    mobileStatus.value = '已驳回';
    mobileStatus.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(document.getElementById('recordsStatusSelect').value, '已驳回');
    assert.equal(document.querySelector('[data-record-status="已驳回"]').getAttribute('aria-pressed'), 'true');
    assert.ok(mobileStatus.closest('.records-quick-select').classList.contains('has-value'));

    // 快捷类型与搜索同步到完整筛选表单
    const mobileType = document.getElementById('recordsMobileType');
    mobileType.value = '产品授权';
    mobileType.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(document.getElementById('recordsTypeSelect').value, '产品授权');
    const mobileSearch = document.getElementById('recordsMobileSearch');
    mobileSearch.value = 'GW-2024';
    mobileSearch.dispatchEvent(new window.Event('input', { bubbles: true }));
    assert.equal(document.getElementById('recordsDeviceInput').value, 'GW-2024');

    // 重置后快捷筛选与搜索恢复默认
    document.getElementById('recordsResetButton').click();
    assert.equal(mobileStatus.value, '');
    assert.equal(mobileType.value, '');
    assert.equal(mobileSearch.value, '');
    assert.equal(document.getElementById('recordsDeviceInput').value, '');
    assert.equal(mobileStatus.closest('.records-quick-select').classList.contains('has-value'), false);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('快捷筛选使用自定义下拉面板替代原生选项弹窗', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordsPagination();
    window.initRecordsStatusFilters();
    window.initRecordsMobileFilter();

    const bar = document.getElementById('recordsMobileFilterbar');
    const typeSelect = document.getElementById('recordsMobileType');
    assert.equal(window.getComputedStyle(typeSelect).display, 'none', '原生 select 不参与展示');
    const triggers = bar.querySelectorAll('.quick-trigger');
    assert.equal(triggers.length, 3, '类型/状态/产品线各有一个自定义触发按钮');

    const panels = bar.querySelectorAll('.records-quick-panel');
    assert.equal(panels.length, 3, '应生成三个自定义下拉面板');
    const typePanel = panels[0];
    assert.equal(typePanel.querySelector('.quick-panel-title').textContent, '类型', '面板应带分组标题');
    assert.ok(typePanel.querySelector('.quick-option-grid'), '选项应为 chip 网格布局');
    const typeOptions = [...typePanel.querySelectorAll('.quick-option')].map((item) => item.textContent.trim());
    assert.deepEqual(typeOptions, ['全部', '产品授权', 'XaaS', '解决方案']);

    // 点击触发按钮展开面板，当前选中项高亮，遮罩显示
    const typeTrigger = triggers[0];
    typeTrigger.click();
    assert.equal(typePanel.hidden, false);
    assert.equal(typeTrigger.getAttribute('aria-expanded'), 'true');
    assert.equal(bar.querySelector('.records-quick-backdrop').hidden, false);
    assert.ok(typePanel.querySelector('.quick-option[data-value=""]').classList.contains('is-selected'), '未筛选时默认选中全部');

    // 选择选项后：同步表单、更新触发文案、收起面板
    [...typePanel.querySelectorAll('.quick-option')].find((item) => item.dataset.value === '产品授权').click();
    assert.equal(typeSelect.value, '产品授权');
    assert.equal(document.getElementById('recordsTypeSelect').value, '产品授权');
    assert.equal(typeTrigger.querySelector('.quick-label').textContent, '产品授权');
    assert.equal(typePanel.hidden, true);
    assert.equal(bar.querySelector('.records-quick-backdrop').hidden, true);

    // Escape 关闭面板
    typeTrigger.click();
    assert.equal(typePanel.hidden, false);
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(typePanel.hidden, true);

    // 重置后触发文案恢复占位词
    document.getElementById('recordsResetButton').click();
    assert.equal(typeTrigger.querySelector('.quick-label').textContent, '类型');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('产品线快捷筛选含 XaaS 产品并参与过滤，扫帚按钮一键重置', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordsPagination();
    window.initRecordsStatusFilters();
    window.initRecordsMobileFilter();

    const bar = document.getElementById('recordsMobileFilterbar');
    const mobileProduct = document.getElementById('recordsMobileProduct');
    const productSelect = document.getElementById('recordsProductSelect');
    const productOptions = [...mobileProduct.options].map((option) => option.value);
    ['HCI', 'SaaS-XDR', 'SASE-GA', '企业云一体化方案'].forEach((value) => {
      assert.ok(productOptions.includes(value), `产品线选项应含 ${value}`);
    });
    assert.ok([...productSelect.options].map((option) => option.value).includes('SaaS-XDR'), '完整表单产品线下拉同步填充');

    // 产品线面板选择 XaaS 产品后过滤记录并同步完整表单
    const productPanel = bar.querySelectorAll('.records-quick-panel')[2];
    assert.equal(productPanel.querySelector('.quick-panel-title').textContent, '产品线');
    const productTrigger = bar.querySelectorAll('.quick-trigger')[2];
    productTrigger.click();
    assert.equal(productPanel.hidden, false);
    [...productPanel.querySelectorAll('.quick-option')].find((item) => item.dataset.value === 'SaaS-XDR').click();
    assert.equal(productSelect.value, 'SaaS-XDR');
    assert.equal(productTrigger.querySelector('.quick-label').textContent, 'SaaS-XDR');
    const allRows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const visibleRows = allRows.filter((row) => row.style.display !== 'none');
    assert.ok(visibleRows.length > 0);
    visibleRows.forEach((row) => {
      assert.equal(row.cells[3].textContent.trim(), 'SaaS-XDR', '可见记录应均为所选产品线');
    });

    // 产品线与状态可组合过滤
    const mobileStatus = document.getElementById('recordsMobileStatus');
    mobileStatus.value = '待审批';
    mobileStatus.dispatchEvent(new window.Event('change', { bubbles: true }));
    const combinedRows = allRows.filter((row) => row.style.display !== 'none');
    combinedRows.forEach((row) => {
      assert.equal(row.cells[3].textContent.trim(), 'SaaS-XDR');
      assert.equal(window.getRecordRowStatus(row), '待审批');
    });

    // 扫帚按钮一键重置全部筛选
    const broom = document.getElementById('recordsMobileReset');
    assert.equal(broom.querySelector('.material-symbols-outlined').textContent, 'cleaning_services', '重置按钮使用扫帚图标');
    broom.click();
    assert.equal(productSelect.value, '全部');
    assert.equal(mobileProduct.value, '');
    assert.equal(productTrigger.querySelector('.quick-label').textContent, '产品线');
    assert.equal(document.getElementById('recordsStatusSelect').value, '全部');
    assert.equal(allRows.filter((row) => row.style.display !== 'none').length, Math.min(10, allRows.length), '重置后恢复首页全量记录');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('授权类型筛选真正过滤记录且状态芯片高亮即时切换', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordsPagination();
    window.initRecordsStatusFilters();
    window.initRecordsMobileFilter();

    const allRows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const visible = () => allRows.filter((row) => row.style.display !== 'none');

    // 快捷类型选产品授权：解决方案/XaaS 记录应被过滤
    const mobileType = document.getElementById('recordsMobileType');
    mobileType.value = '产品授权';
    mobileType.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.ok(visible().length > 0);
    visible().forEach((row) => {
      assert.equal(row.cells[1].textContent.trim(), '产品授权', '类型筛选后不应出现解决方案/XaaS记录');
    });

    // 桌面端类型下拉也参与过滤并反向同步快捷筛选
    const typeSelect = document.getElementById('recordsTypeSelect');
    typeSelect.value = '解决方案';
    typeSelect.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.ok(visible().length > 0);
    visible().forEach((row) => {
      assert.equal(row.cells[1].textContent.trim(), '解决方案');
    });
    assert.equal(mobileType.value, '解决方案', '快捷筛选应反向同步');

    // 类型与状态组合过滤
    const mobileStatus = document.getElementById('recordsMobileStatus');
    mobileStatus.value = '已驳回';
    mobileStatus.dispatchEvent(new window.Event('change', { bubbles: true }));
    visible().forEach((row) => {
      assert.equal(row.cells[1].textContent.trim(), '解决方案');
      assert.equal(window.getRecordRowStatus(row), '已驳回');
    });

    // 重置后类型筛选清空
    document.getElementById('recordsResetButton').click();
    assert.equal(typeSelect.value, '全部');
    assert.equal(mobileType.value, '');
    assert.equal(visible().length, Math.min(10, allRows.length));

    // 状态芯片基础规则不再使用 transition，背景高亮即时切换
    const styleText = [...document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const chipRule = styleText.match(/\.record-status-filter\{[^}]*\}/);
    assert.ok(chipRule, '应存在状态芯片基础规则');
    assert.doesNotMatch(chipRule[0], /transition/, '芯片背景切换不应依赖 transition，避免后台标签页停帧');
    const rejectedChip = document.querySelector('[data-record-status="已驳回"]');
    rejectedChip.click();
    assert.equal(window.getComputedStyle(rejectedChip).backgroundColor, 'rgb(238, 244, 255)', '选中芯片背景应立即变为高亮色');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('筛选表单下拉使用自定义面板替代原生选项弹窗', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordsPagination();
    window.initRecordsStatusFilters();
    window.initRecordsMobileFilter();
    window.initRecordsFormSelects();

    // 三个筛选下拉均被包装为自定义组件，原生 select 隐藏
    const wraps = document.querySelectorAll('#recordsFilterCard .records-form-select');
    assert.equal(wraps.length, 3, '类型/状态/产品线均应升级为自定义下拉');
    const typeSelect = document.getElementById('recordsTypeSelect');
    assert.equal(window.getComputedStyle(typeSelect).display, 'none', '原生 select 不参与展示');
    const typeWrap = typeSelect.closest('.records-form-select');
    const typeTrigger = typeWrap.querySelector('.form-select-trigger');
    assert.equal(typeTrigger.querySelector('.form-select-value').textContent, '全部', '触发器应显示当前选中项');
    assert.equal(typeTrigger.getAttribute('aria-label'), '类型');

    // 展开面板：选项完整、当前项高亮
    typeTrigger.click();
    assert.ok(typeWrap.classList.contains('open'));
    assert.equal(typeTrigger.getAttribute('aria-expanded'), 'true');
    const typeOptions = [...typeWrap.querySelectorAll('.form-select-option')];
    assert.deepEqual(typeOptions.map((item) => item.textContent.replace('check', '').trim()), ['全部', '产品授权', 'XaaS', '解决方案']);
    assert.ok(typeOptions[0].classList.contains('is-selected'));

    // 选择选项：同步 select、触发过滤、收起面板
    typeOptions.find((item) => item.dataset.value === '解决方案').click();
    assert.equal(typeSelect.value, '解决方案');
    assert.equal(typeTrigger.querySelector('.form-select-value').textContent, '解决方案');
    assert.equal(typeWrap.classList.contains('open'), false);
    const allRows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    allRows.filter((row) => row.style.display !== 'none').forEach((row) => {
      assert.equal(row.cells[1].textContent.trim(), '解决方案');
    });

    // 产品线面板包含动态填充的选项（含 XaaS 产品）
    const productSelect = document.getElementById('recordsProductSelect');
    const productTrigger = productSelect.closest('.records-form-select').querySelector('.form-select-trigger');
    productTrigger.click();
    const productOptionValues = [...productSelect.closest('.records-form-select').querySelectorAll('.form-select-option')].map((item) => item.dataset.value);
    ['全部', 'HCI', 'SaaS-XDR', 'SASE-GA'].forEach((value) => {
      assert.ok(productOptionValues.includes(value), `产品线面板应含 ${value}`);
    });
    // 展开产品线时类型面板应自动关闭（同时只开一个）
    assert.equal(document.querySelectorAll('#recordsFilterCard .records-form-select.open').length, 1);

    // Escape 关闭；重置后触发器文案同步回全部
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    assert.equal(document.querySelectorAll('#recordsFilterCard .records-form-select.open').length, 0);
    document.getElementById('recordsResetButton').click();
    assert.equal(typeTrigger.querySelector('.form-select-value').textContent, '全部', '重置后触发器文案应同步');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('授权记录表新增设备SN与云授权ID两列', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const headers = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > thead th')].map((th) => th.textContent.replace('info', '').trim());
    assert.equal(headers[6], '设备ID/云图ID');
    assert.equal(headers[7], '设备SN');
    assert.equal(headers[8], '云授权ID');

    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    // 硬件行：SN 按设备ID推导；云授权ID 仅在授权生成后（已通过/已授权/已过期）有值
    const hciRow = rows.find((row) => row.textContent.includes('AUTH-20260701-001'));
    const hciData = window.getRecordRowData(hciRow);
    assert.equal(hciData.device, 'GW-2024-HCI-001');
    assert.equal(hciData.deviceSn, 'SN-2024-HCI-001');
    assert.equal(hciData.cloudAuthId, 'CLA-2024-HCI-001', '已授权记录应有云授权ID');
    const ngafRow = rows.find((row) => row.textContent.includes('AUTH-20260703-022'));
    const ngafData = window.getRecordRowData(ngafRow);
    assert.equal(ngafData.deviceSn, 'SN-2024-NGAF-003');
    assert.equal(ngafData.cloudAuthId, '—', '审批中记录云授权ID尚未生成');
    const sipRow = rows.find((row) => row.textContent.includes('AUTH-20260704-028'));
    assert.equal(window.getRecordRowData(sipRow).cloudAuthId, 'CLA-SIP-001', '已通过记录应有云授权ID');
    const wafRow = rows.find((row) => row.textContent.includes('AUTH-20260630-041'));
    assert.equal(window.getRecordRowData(wafRow).cloudAuthId, 'CLA-WAF-012', '非云化产品已授权同样有云授权ID');
    // XaaS 行：无 SN；云授权ID 仅在授权生成后有值（待审批为 —）
    const xaasRow = rows.find((row) => row.textContent.includes('AUTH-20260702-015'));
    const xaasData = window.getRecordRowData(xaasRow);
    assert.equal(xaasData.deviceSn, '—');
    assert.equal(xaasData.cloudAuthId, '—', '待审批记录云授权ID尚未生成');
    const saseRow = rows.find((row) => row.textContent.includes('AUTH-20260629-050'));
    assert.equal(window.getRecordRowData(saseRow).cloudAuthId, 'CLA-SASE-JD-050', '已授权 XaaS 记录应有云授权ID');
    // 解决方案行：SN 列悬浮展开 SN 明细
    const solutionRow = rows.find((row) => row.textContent.includes('SOL-20260701-001'));
    const snSummary = solutionRow.cells[7].querySelector('.device-summary');
    assert.ok(snSummary, '方案行 SN 列应为悬浮展开入口');
    assert.equal(snSummary.textContent.trim(), '6个设备');
    ['SN-HCI-001', 'SN-AC-005', 'SN-NGAF-003', 'SN-AD-002', 'SN-WOC-001'].forEach((sn) => {
      assert.ok(snSummary.getAttribute('data-full').includes(sn), `SN 明细应包含 ${sn}`);
    });
    assert.equal(solutionRow.cells[8].textContent.trim(), '—');
    // 方案明细子表跨列数同步
    const detailRow = document.querySelector('#content-records .solution-detail-row td[colspan]');
    assert.equal(detailRow.getAttribute('colspan'), '13');

    // 新列参与截断悬浮：绑定 tooltip 且具备省略号样式
    window.initRecordsTooltip();
    [7, 8].forEach((cellIndex) => {
      const cell = hciRow.cells[cellIndex];
      assert.equal(cell.dataset.recordsTooltipReady, 'true', `第${cellIndex + 1}列应绑定悬浮提示`);
      const style = window.getComputedStyle(cell);
      assert.equal(style.overflow, 'hidden');
      assert.equal(style.textOverflow, 'ellipsis');
    });
  } finally {
    dom.window.close();
  }
});

test('扩大容量仅展示已授权模块且导航同步', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    product.dispatchEvent(new window.Event('change', { bubbles: true }));
    const planType = document.getElementById('planDevType');
    planType.value = '1';
    planType.dispatchEvent(new window.Event('change', { bubbles: true }));
    window.addChip('ACTIVE-NGAF-001');

    // 有效期内调整场景：勾选扩大容量/规格
    const increase = document.querySelector('#requestContentGroup input[value="increase_capacity"]');
    assert.ok(increase, '调整场景应提供扩大容量选项');
    increase.checked = true;
    increase.dispatchEvent(new window.Event('change', { bubbles: true }));

    const ngafCard = document.getElementById('module-NGAF-intelligent-ops');
    assert.equal(ngafCard.hidden, false, '已授权模块应保持展示');
    assert.equal(ngafCard.dataset.currentlyAuthorized, 'true');
    const unauthorizedCards = [...document.querySelectorAll('#content .module-item')].filter(
      (card) => card.dataset.currentlyAuthorized !== 'true'
    );
    assert.ok(unauthorizedCards.length > 0);
    unauthorizedCards.forEach((card) => {
      assert.equal(card.hidden, true, `未授权模块 ${card.id} 应隐藏`);
      const navItem = document.querySelector(`.module-nav-item[data-target="${card.id}"]`);
      if (navItem) assert.equal(navItem.hidden, true, `未授权模块导航 ${card.id} 应隐藏`);
    });

    // 追加勾选增开模块后恢复当前产品线全部模块展示（其它产品线的模块卡保持隐藏）
    const addModule = document.querySelector('#requestContentGroup input[value="add_module"]');
    addModule.checked = true;
    addModule.dispatchEvent(new window.Event('change', { bubbles: true }));
    const ngafLineIds = ['module-NGAF-gateway', 'module-NGAF-ssl-vpn', 'module-NGAF-advanced-functionality',
      'module-NGAF-engine-zero', 'module-NGAF-vmware', 'module-NGAF-hardware-specs', 'module-NGAF-engine-model',
      'module-NGAF-neural-x-new', 'module-NGAF-neural-x-unknown', 'module-NGAF-website',
      'module-NGAF-software-update', 'module-NGAF-threat-deception', 'module-NGAF-intelligent-ops',
      'module-NGAF-threat-intel-gateway', 'module-NGAF-sofast', 'module-NGAF-iot', 'module-NGAF-fingerprint'];
    [...document.querySelectorAll('#content .module-item')].forEach((card) => {
      const inLine = ngafLineIds.includes(card.id);
      assert.equal(card.hidden, !inLine, inLine ? `增开模块场景 ${card.id} 应展示` : `非本产品线模块 ${card.id} 应保持隐藏`);
      const navItem = document.querySelector(`.module-nav-item[data-target="${card.id}"]`);
      if (navItem) assert.equal(navItem.hidden, !inLine);
    });
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('授权有效期按最先到期模块取值并在详情展示模块明细', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    // 表头带取值说明并绑定悬浮提示
    const info = document.querySelector('#content-records thead .records-validity-info');
    assert.ok(info, '授权有效期表头应有说明图标');
    assert.match(info.getAttribute('data-action-tip'), /最先到期模块/);
    window.initRecordsTooltip();
    assert.equal(info.dataset.recordsTooltipReady, 'true');

    // 详情抽屉：多模块已授权记录展示各模块到期日，列值等于最早到期日
    window.initRecordDownloadActions();
    window.initRecordActionTips();
    window.initRecordDetailDrawer();
    const view = document.querySelector('[data-record-action="view"]');
    view.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    const changeList = document.getElementById('recordProductChangeList').textContent;
    assert.match(changeList, /2026-07-01 ~ 2026-09-29/, '配置变更仍展示整单有效期');
    assert.match(changeList, /授权至—2026-09-29/, '首个模块授权至应与列值一致');
    assert.match(changeList, /授权至—2026-10-29/, '其余模块授权至展示各自日期');
    const deliveryText = document.getElementById('recordProductDeliveryGrid').textContent;
    assert.match(deliveryText, /2026-07-01 ~ 2026-09-29（按最先到期模块）/);
    assert.doesNotMatch(deliveryText, /计算虚拟化（至/, '开通结果不再逐模块列出到期日（模块明细见配置变更）');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('审批抽屉配置变更同样按模块折叠展示', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordDownloadActions();
    window.initRecordActionTips();
    window.initRecordDetailDrawer();
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const hciRow = rows.find((row) => row.textContent.includes('AUTH-20260701-123'));
    const approve = hciRow.querySelector('[data-record-action="approve"]');
    assert.ok(approve, '待审批记录应有审核入口');
    approve.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    const changeList = document.getElementById('recordApproveChangeList');
    assert.ok(changeList, '审批抽屉应包含配置变更');
    const groups = [...changeList.querySelectorAll('.record-product-change-group .change-group-name')].map((el) => el.textContent.trim());
    assert.deepEqual(groups, ['计算虚拟化', '分布式存储'], '审批抽屉多模块变更应分组');
    const bodies = [...changeList.querySelectorAll('.record-product-change-group-body')];
    bodies.forEach((body) => assert.equal(body.hidden, true, '审批抽屉模块明细默认收起'));
    const firstGroup = changeList.querySelector('.record-product-change-group');
    assert.match(firstGroup.textContent, /3 项变更 · 至 /, '收起时展示变更摘要');
    firstGroup.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(bodies[0].hidden, false, '点击分组应展开明细');
    assert.match(document.getElementById('recordApproveObjectGrid').textContent, /云授权ID/, '审批抽屉授权对象应含云授权ID');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});
