'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

test('仅已授权和已过期记录显示行内下载授权操作', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordDownloadActions();
    const rows = [...document.querySelectorAll('#content-records .table-scroll-wrap tbody > tr:not(.solution-detail-row)')];
    assert.ok(rows.length > 0);
    rows.forEach((row) => {
      const status = row.dataset.status || row.querySelector('.sticky-right > div > span')?.textContent.trim();
      const download = row.querySelector('.record-download-action');
      if (status === '已授权' || status === '已过期') {
        assert.ok(download, `${status}记录应显示下载授权`);
        assert.equal(download.tagName, 'BUTTON');
        assert.equal(download.getAttribute('aria-label'), '下载授权');
      } else {
        assert.equal(download, null, `${status}记录不应显示下载授权`);
      }
    });
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('下载授权生成不预设扩展名的单个 Mock 文件', () => {
  const { dom, document, window } = loadV2Dom({
    beforeParse(browserWindow) {
      browserWindow.HTMLAnchorElement.prototype.click = function click() {
        browserWindow.__recordDownload = { href: this.href, filename: this.download };
      };
    }
  });
  try {
    window.initRecordDownloadActions();
    const download = document.querySelector('.record-download-action');
    assert.ok(download);
    download.click();
    assert.match(window.__recordDownload.href, /^data:application\/octet-stream/);
    assert.match(window.__recordDownload.filename, /^授权信息-AUTH-/);
    assert.equal(window.__recordDownload.filename.includes('.'), false);
  } finally {
    dom.window.close();
  }
});

test('记录操作通过悬浮和键盘聚焦解释功能意义', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    window.initRecordDownloadActions();
    window.initRecordActionTips();
    window.initRecordsTooltip();

    const expectedTips = {
      '复制': '基于当前记录创建一份新申请',
      '续期': '基于当前授权发起延期申请',
      '撤销': '撤回尚未完成的申请',
      '审核': '进入审批处理页面',
      '重新提交': '补充驳回原因涉及的信息后再次发起审批',
      '下载': '下载本次生成的授权信息'
    };
    Object.entries(expectedTips).forEach(([label, tip]) => {
      const action = [...document.querySelectorAll('[data-action-tip]')].find((item) => item.textContent.trim() === label);
      assert.ok(action, `${label}操作应存在说明`);
      assert.equal(action.getAttribute('data-action-tip'), tip);
      assert.match(action.getAttribute('aria-label'), new RegExp(tip));
    });
    assert.equal(document.querySelector('.sticky-right .ml-auto > *:first-child').hasAttribute('data-action-tip'), false, '查看保持不提示');
    const download = [...document.querySelectorAll('[data-action-tip]')].find((item) => item.textContent.trim() === '下载');
    download.dispatchEvent(new window.MouseEvent('mouseenter'));
    const tooltip = document.getElementById('recordsActionTooltip');
    assert.ok(tooltip.classList.contains('show'));
    assert.equal(tooltip.textContent, expectedTips['下载']);
    download.dispatchEvent(new window.MouseEvent('mouseleave'));
    assert.equal(tooltip.classList.contains('show'), false);
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('授权记录固定表头应始终覆盖滚动中的固定正文列', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const regularHeader = document.querySelector('#content-records thead th:not(.sticky-left):not(.sticky-right)');
    const rightHeader = document.querySelector('#content-records thead th.sticky-right');
    const rightBodyCell = document.querySelector('#content-records tbody td.sticky-right');
    const regularHeaderStyle = window.getComputedStyle(regularHeader);
    const rightHeaderStyle = window.getComputedStyle(rightHeader);
    const rightBodyStyle = window.getComputedStyle(rightBodyCell);

    assert.equal(regularHeaderStyle.position, 'sticky');
    assert.equal(regularHeaderStyle.top, '0px');
    assert.ok(Number(regularHeaderStyle.zIndex) > Number(rightBodyStyle.zIndex));
    assert.ok(Number(rightHeaderStyle.zIndex) > Number(regularHeaderStyle.zIndex));
    assert.equal(rightHeaderStyle.backgroundColor, 'rgb(255, 255, 255)');
  } finally {
    dom.window.close();
  }
});

test('审批状态与操作区使用固定栅格并保持操作左对齐', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    const headerCell = document.querySelector('#content-records thead th.sticky-right');
    const headerLayout = headerCell.firstElementChild;
    const bodyCell = document.querySelector('#content-records tbody td.sticky-right');
    const bodyLayout = bodyCell.firstElementChild;
    const actionList = bodyLayout.querySelector('.ml-auto');
    const firstAction = actionList.firstElementChild;

    assert.equal(window.getComputedStyle(headerCell).width, '270px');
    assert.equal(window.getComputedStyle(headerLayout).display, 'grid');
    assert.equal(window.getComputedStyle(headerLayout).gridTemplateColumns, '72px minmax(0,1fr)');
    assert.equal(window.getComputedStyle(bodyLayout).display, 'grid');
    assert.equal(window.getComputedStyle(actionList).marginLeft, '0px');
    assert.equal(window.getComputedStyle(actionList).justifySelf, 'start');
    assert.equal(window.getComputedStyle(firstAction).minHeight, '24px');
  } finally {
    dom.window.close();
  }
});

test('顶部审批状态统计可筛选记录并同步状态下拉与分页', () => {
  const { dom, document, window } = loadV2Dom();
  try {
    window.initRecordsPagination();
    window.initRecordsStatusFilters();
    const rejectedButton = document.querySelector('[data-record-status="已驳回"]');
    const allRows = [...document.querySelectorAll('#content-records .table-scroll-wrap > table > tbody > tr:not(.solution-detail-row)')];
    const rejectedRows = allRows.filter((row) => window.getRecordRowStatus(row) === '已驳回');

    assert.equal(document.querySelector('[data-record-status=""] .record-status-count').textContent, String(allRows.length));
    assert.equal(rejectedButton.querySelector('.record-status-count').textContent, String(rejectedRows.length));
    rejectedButton.click();
    assert.equal(rejectedButton.getAttribute('aria-pressed'), 'true');
    assert.ok(rejectedButton.classList.contains('is-active'));
    assert.equal(document.getElementById('recordsStatusSelect').value, '已驳回');
    assert.match(document.getElementById('paginationInfo').textContent, new RegExp('共 ' + rejectedRows.length + ' 条'));
    const visibleRows = allRows.filter((row) => row.style.display !== 'none');
    assert.ok(visibleRows.length > 0);
    assert.ok(visibleRows.every((row) => window.getRecordRowStatus(row) === '已驳回'));

    document.getElementById('recordsResetButton').click();
    assert.equal(document.getElementById('recordsStatusSelect').value, '全部');
    assert.equal(document.querySelector('[data-record-status=""]').getAttribute('aria-pressed'), 'true');
  } finally {
    dom.window.close();
  }
});
