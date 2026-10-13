'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

test('统一授权日期：时间选择窗口颜色区分（免审区间绿底 vs 需审批区间橙底清晰可见，去除多余预设按键与底部提示）', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const unifiedInput = document.getElementById('unifiedDate');
    const calendarBtn = document.getElementById('unifiedDateCalendarBtn');
    const popoverWindow = document.getElementById('unifiedDatePickerWindow');
    const dateLimitHint = document.getElementById('dateLimitHint');

    assert.ok(unifiedInput, '应存在统一授权日期输入框');
    assert.ok(calendarBtn, '应存在日历弹窗触发按钮');
    assert.ok(popoverWindow, '应存在选择时间的窗口弹窗');
    assert.match(dateLimitHint.textContent, /免审上限\s*90\s*天/);

    // 默认关闭，点击按钮展开
    assert.equal(popoverWindow.classList.contains('show'), false);
    calendarBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(popoverWindow.classList.contains('show'), true, '点击日历按钮应展开选择时间窗口');

    // 检查图例栏：免审区间与需审批区间颜色说明清晰呈现
    const safeLegend = popoverWindow.querySelector('.datepicker-legend-item.safe');
    const warnLegend = popoverWindow.querySelector('.datepicker-legend-item.warning');
    assert.ok(safeLegend, '日历窗口应包含免审区间图例');
    assert.ok(warnLegend, '日历窗口应包含需审批区间图例');
    assert.match(safeLegend.textContent, /免审区间.*90天/);
    assert.match(warnLegend.textContent, /需审批区间.*90天/);

    // 检查快捷预设与底部多余提示已完全移除
    const presetsContainer = popoverWindow.querySelector('.datepicker-presets');
    const footerHint = document.getElementById('dpFooterHint');
    assert.equal(presetsContainer, null, '应已去除快捷预设按键区（30/60/90/120/180天），保持窗口简洁');
    assert.equal(footerHint, null, '应已去除底部多余提示文本条');

    // 日历网格中：当前月份（距离今天 <= 90天）包含免审区间绿色底色(safe-range)
    const safeCells = popoverWindow.querySelectorAll('.datepicker-day-cell.safe-range');
    assert.ok(safeCells.length > 0, '日历网格中应包含带有 safe-range 绿色的免审日期单元格');

    // 翻页至 4 个月后（>90天），日历网格中需审批区间渲染浅橙底色(warning-range)，杜绝白色底无法识别
    const dpNextMonth = document.getElementById('dpNextMonth');
    assert.ok(dpNextMonth, '应存在日历下月切换按钮');
    for (let i = 0; i < 4; i++) {
      dpNextMonth.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    }
    const warnCells = popoverWindow.querySelectorAll('.datepicker-day-cell.warning-range');
    assert.ok(warnCells.length > 0, '翻至90天以后的月份日历网格中应包含带有 warning-range 浅橙色的需审批日期单元格');

    // 切换至 KA 客户（180天限制）联动更新
    if (typeof window.updateDateLimit === 'function') {
      window.updateDateLimit('KA');
      assert.match(dateLimitHint.textContent, /180/);
      assert.match(safeLegend.textContent, /180天/);
      assert.match(warnLegend.textContent, /180天/);
    }
  } finally {
    dom.window.close();
  }
});

test('统一授权日期：去除占位横幅，日期栏提示去重（维持基线免审上限，仅展示单一的“超过 90 天需审批”徽章）', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const unifiedInput = document.getElementById('unifiedDate');
    const applyDateBtn = document.getElementById('applyDateBtn');
    const warningBanner = document.getElementById('unifiedDateWarningBanner');
    const safeBanner = document.getElementById('unifiedDateSafeBanner');
    const approvalHint = document.getElementById('unifiedDateApprovalHint');
    const dateLimitHint = document.getElementById('dateLimitHint');

    // 确认已彻底去除多余的横幅提示
    assert.equal(warningBanner, null, '应彻底去除整行黄色警告横幅（#unifiedDateWarningBanner）');
    assert.equal(safeBanner, null, '应彻底去除整行绿色安全横幅（#unifiedDateSafeBanner）');

    const today = new Date();
    function toDateStr(offsetDays) {
      const d = new Date();
      d.setDate(today.getDate() + offsetDays);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // 1. 选择免审日期（30天）
    const safeDate = toDateStr(30);
    unifiedInput.value = safeDate;
    unifiedInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    assert.equal(applyDateBtn.disabled, false, '选择日期后应用按钮应可用');
    assert.equal(unifiedInput.classList.contains('has-approval-warning'), false, '免审日期输入框不应有超限告警样式');
    assert.equal(approvalHint.style.display, 'none', '免审日期应隐藏需审批提示徽章');
    assert.equal(dateLimitHint.textContent, '免审上限 90 天', '免审日期保持标准免审上限说明');

    // 2. 选择超过限制日期（120天，普通客户限制为90天）
    const overlimitDate = toDateStr(120);
    unifiedInput.value = overlimitDate;
    unifiedInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    assert.equal(applyDateBtn.disabled, false, '超限日期仍允许应用到模块，不应阻断');
    assert.equal(unifiedInput.classList.contains('has-approval-warning'), true, '超限日期输入框应附加 has-approval-warning 样式');
    
    // 关键断言：提示彻底去重，无并排复读
    assert.equal(approvalHint.style.display, 'inline-flex', '超限日期应展示唯一的需审批提示徽章');
    assert.equal(approvalHint.textContent, '超过 90 天需审批', '徽章文案应与规模提示对齐统一为“超过 90 天需审批”');
    assert.equal(dateLimitHint.textContent, '免审上限 90 天', 'dateLimitHint 保持基线属性说明，不得变成“超过 90 天 (需审核)”产生并排重复');
    assert.equal(dateLimitHint.classList.contains('overlimit'), false, 'dateLimitHint 不应添加 overlimit 告警样式');

    // 检查审批流决策是否联动转为人工审核
    const previewType = document.getElementById('previewDecisionType');
    const previewRoute = document.getElementById('previewApprovalRoute');
    if (previewType && previewRoute) {
      assert.match(previewType.textContent, /人工审核|人工审批/);
      assert.match(previewRoute.textContent, /大区及总部营销审核|营销审核/);
    }
  } finally {
    dom.window.close();
  }
});

test('统一授权日期：超限日期应用到所有模块时，各模块同步承接日期并标记审批提示', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const unifiedInput = document.getElementById('unifiedDate');
    const applyDateBtn = document.getElementById('applyDateBtn');

    const today = new Date();
    const d = new Date();
    d.setDate(today.getDate() + 100); // 100天 > 90天
    const overDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    unifiedInput.value = overDate;
    unifiedInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    applyDateBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));

    // 检查 aSV 模块内部的使用授权输入框
    const useAuthInput = document.querySelector('input[name="aSVuse_auth"]');
    assert.ok(useAuthInput, '应存在 aSV 使用授权输入框');
    assert.equal(useAuthInput.value, overDate, '模块日期应同步更新为统一超期日期');

    const parentGrid = useAuthInput.closest('.grid-field');
    assert.ok(parentGrid, '应定位到对应网格字段');
    const moduleHint = parentGrid.querySelector('.approval-threshold-note');
    assert.ok(moduleHint, '模块日期字段右侧应同步显示审批提示标签');
    assert.match(moduleHint.textContent, /超过 90 天需审批/);
  } finally {
    dom.window.close();
  }
});
