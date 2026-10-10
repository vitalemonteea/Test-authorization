'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

test('统一授权日期：日历窗口颜色区分（免审区间 vs 需审核区间）与图例动态联动', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const unifiedInput = document.getElementById('unifiedDate');
    const calendarBtn = document.getElementById('unifiedDateCalendarBtn');
    const popoverWindow = document.getElementById('unifiedDatePickerWindow');
    const dateLimitHint = document.getElementById('dateLimitHint');

    assert.ok(unifiedInput, '应存在统一授权日期输入框');
    assert.ok(calendarBtn, '应存在日历弹窗触发按钮');
    assert.ok(popoverWindow, '应存在选择时间的窗口弹窗');
    assert.match(dateLimitHint.textContent, /最长\s*90\s*天|免审上限\s*90\s*天/);

    // 默认关闭，点击按钮或输入框展开
    assert.equal(popoverWindow.classList.contains('show'), false);
    calendarBtn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(popoverWindow.classList.contains('show'), true, '点击日历按钮应展开选择时间窗口');

    // 检查图例栏
    const safeLegend = popoverWindow.querySelector('.datepicker-legend-item.safe');
    const warnLegend = popoverWindow.querySelector('.datepicker-legend-item.warning');
    assert.ok(safeLegend, '日历窗口应包含免审区间图例');
    assert.ok(warnLegend, '日历窗口应包含需审核区间图例');
    assert.match(safeLegend.textContent, /免审区间.*90天/);
    assert.match(warnLegend.textContent, /需审核区间.*90天/);

    // 快捷预设按钮存在免审与审核区分
    const safePresets = popoverWindow.querySelectorAll('.preset-chip-btn.safe');
    const warnPresets = popoverWindow.querySelectorAll('.preset-chip-btn.warning');
    assert.ok(safePresets.length >= 3, '应提供30/60/90天等免审预设');
    assert.ok(warnPresets.length >= 2, '应提供120/180天等需审核预设');

    // 日历网格中应渲染免审单元格
    const safeCells = popoverWindow.querySelectorAll('.datepicker-day-cell.safe-range');
    assert.ok(safeCells.length > 0, '日历网格中应包含带有 safe-range 绿色的免审日期单元格');

    // 悬停免审单元格检查底部提示
    const footerHint = document.getElementById('dpFooterHint');
    assert.ok(footerHint, '应存在日历弹窗底部实时提示条');
    safeCells[0].dispatchEvent(new window.MouseEvent('mouseenter', { bubbles: true }));
    assert.match(footerHint.textContent, /免审区间/);

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

test('统一授权日期：选择免审日期 vs 超过限制日期的审批提示、告警横幅与审批路线联动', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const unifiedInput = document.getElementById('unifiedDate');
    const applyDateBtn = document.getElementById('applyDateBtn');
    const warningBanner = document.getElementById('unifiedDateWarningBanner');
    const safeBanner = document.getElementById('unifiedDateSafeBanner');
    const approvalHint = document.getElementById('unifiedDateApprovalHint');
    const dateLimitHint = document.getElementById('dateLimitHint');

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
    assert.equal(warningBanner.classList.contains('show'), false, '免审日期不应展示超期告警横幅');
    assert.equal(safeBanner.classList.contains('show'), true, '免审日期应展示符合自助审批横幅');
    assert.equal(approvalHint.style.display, 'none', '免审日期应隐藏需审批提示徽章');

    // 2. 选择超过限制日期（120天，普通客户限制为90天）
    const overlimitDate = toDateStr(120);
    unifiedInput.value = overlimitDate;
    unifiedInput.dispatchEvent(new window.Event('change', { bubbles: true }));

    assert.equal(applyDateBtn.disabled, false, '超限日期仍允许应用到模块，不应阻断');
    assert.equal(unifiedInput.classList.contains('has-approval-warning'), true, '超限日期输入框应附加 has-approval-warning 样式');
    assert.equal(warningBanner.classList.contains('show'), true, '超限日期应展开 warningBanner 提示横幅');
    assert.match(warningBanner.textContent, /超过 90 天免审限制.*人工审批/);
    assert.equal(approvalHint.style.display, 'inline-flex', '超限日期应展示需审批提示徽章');
    assert.match(approvalHint.textContent, /超过 90 天需审批/);
    assert.match(dateLimitHint.textContent, /需审核/);

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
