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
