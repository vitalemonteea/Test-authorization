'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

const ATRUST_VERSIONS = [
  '零信任分析中心（aTrust -A.2.6.10及以上）',
  '控制中心（SDPC2.4.10，或ZTAC2.2.72及以上）',
  '控制中心(SDPC2.2.16到2.3.10，ZTAC2.2.72到2.2.71)',
  '控制中心（SDPC2.2.16以下版本，不含2.2.16；ZTAC2.2.72以下版本，不包含2.2.72版本）',
  '综合网关（HYBRID2.4.10及以上）',
  '综合网关(HYBRID2.2.16到2.3.10版本)',
  '综合网关（HYBRID2.2.16以下版本，不含2.2.16）',
  '代理网关'
];

const NGAF_VERSIONS = [
  'NGAF8.0.60及以上',
  'vAF8.0.107及以上虚拟化版本'
];

function versionLabels(document) {
  return Array.from(document.getElementById('cloudVersion').options).map((option) => option.textContent.trim());
}

function visualVersionLabels(document) {
  return Array.from(document.querySelectorAll('[data-select-id="cloudVersion"] .custom-select-option'))
    .map((option) => option.textContent.trim());
}

test('aTrust 使用真实环境的 8 个版本选项并支持选择', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '20';
    fireChange(product, window);

    assert.deepEqual(versionLabels(document), ATRUST_VERSIONS);
    assert.deepEqual(visualVersionLabels(document), ATRUST_VERSIONS);
    assert.equal(document.getElementById('cloudVersion').value, 'atrust-analysis-a2.6.10-plus');
    assert.equal(
      document.querySelector('[data-select-id="cloudVersion"] .custom-select-value').textContent.trim(),
      ATRUST_VERSIONS[0]
    );

    const proxyGateway = document.querySelector('[data-select-id="cloudVersion"] [data-value="atrust-proxy-gateway"]');
    proxyGateway.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    assert.equal(document.getElementById('cloudVersion').value, 'atrust-proxy-gateway');
    assert.equal(document.querySelector('[data-select-id="cloudVersion"] .custom-select-value').textContent.trim(), '代理网关');
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('NGAF 仅展示真实环境对应的两个版本', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    product.value = '22';
    fireChange(product, window);

    assert.deepEqual(versionLabels(document), NGAF_VERSIONS);
    assert.deepEqual(visualVersionLabels(document), NGAF_VERSIONS);
    assert.equal(document.getElementById('cloudVersion').value, 'ngaf-8.0.60-plus');
    assert.equal(
      document.querySelector('[data-select-id="cloudVersion"] .custom-select-value').textContent.trim(),
      NGAF_VERSIONS[0]
    );
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('从 aTrust 或 NGAF 切回 HCI 时恢复原有 HCI 版本列表', () => {
  const { dom, document, window, errors } = loadV2Dom();
  try {
    const product = document.getElementById('plname');
    const initialVersions = versionLabels(document);
    assert.ok(initialVersions.length > 20);
    assert.equal(initialVersions[0], 'HCI-6.8.1-VKEY');

    product.value = '20';
    fireChange(product, window);
    assert.equal(versionLabels(document).length, 8);

    product.value = '45';
    fireChange(product, window);
    assert.deepEqual(versionLabels(document), initialVersions);
    assert.equal(document.getElementById('cloudVersion').value, '6.8.1_1');
    assert.equal(
      document.querySelector('[data-select-id="cloudVersion"] .custom-select-value').textContent.trim(),
      'HCI-6.8.1-VKEY'
    );
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});

test('真实版本长文案在版本下拉中换行且不产生横向滚动', () => {
  const { dom, document } = loadV2Dom({ runScripts: false });
  try {
    const css = Array.from(document.querySelectorAll('style')).map((style) => style.textContent).join('\n');
    assert.match(
      css,
      /\.custom-select\[data-select-id="cloudVersion"\] \.custom-select-list \{ overflow-x: hidden; \}/
    );
    assert.match(
      css,
      /\.custom-select\[data-select-id="cloudVersion"\] \.custom-select-option \{[\s\S]*?white-space: normal; overflow-wrap: anywhere;/
    );
  } finally {
    dom.window.close();
  }
});
