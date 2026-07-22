'use strict';

/**
 * 基本信息卡片新版布局测试
 *
 * 目标：验证 `测试设备授权平台V2.html` 中「申请产品授权」Tab 下的
 * 基本信息表单，符合已确认的新版卡片布局结构：
 *  - 外层容器带 basic-info-section
 *  - 标题下包含 basic-title-accent 强调线
 *  - 产品线+版本使用 basic-two-col-row 两列布局
 *  - 申请类型与授权场景各自使用 basic-full-row 全行布局
 *  - 区域+办事处使用标准两列布局
 *  - 设备 ID、接收邮箱和设备 SN 使用 basic-full 全宽
 *  - 授权场景在设备识别后显示，系统校验不伪装成常驻表单字段
 *  - 借测信息区域使用 basic-borrow-panel + borrow-grid 面板
 *  - 客户信息展示销售负责人徽章 selectedSales
 *
 * 采用 jsdom 仅解析（不执行页面脚本），对 DOM 结构做断言。
 */

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const htmlPath = path.join(__dirname, '..', '测试设备授权平台V2.html');
const html = fs.readFileSync(htmlPath, 'utf8');
const cssText = Array.from(html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi))
  .map((match) => match[1])
  .join('\n')
  .replace(/\/\*[\s\S]*?\*\//g, '');

function findCssBlockRange(source, startIndex) {
  const openBrace = source.indexOf('{', startIndex);
  if (startIndex < 0 || openBrace === -1) return null;

  let depth = 0;
  for (let index = openBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) {
      return { start: startIndex, contentStart: openBrace + 1, contentEnd: index, end: index + 1 };
    }
  }
  return null;
}

const mobileMediaMatch = /@media\s*(?:screen\s+and\s*)?\(max-width\s*:\s*768px\)/i.exec(cssText);
const mobileMediaRange = findCssBlockRange(cssText, mobileMediaMatch?.index ?? -1);
const mobileCssText = mobileMediaRange
  ? cssText.slice(mobileMediaRange.contentStart, mobileMediaRange.contentEnd)
  : '';
const desktopCssText = mobileMediaRange
  ? cssText.slice(0, mobileMediaRange.start) + cssText.slice(mobileMediaRange.end)
  : cssText;

function getCssRuleBodies(selector, source = desktopCssText) {
  return Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g))
    .filter((match) => match[1].split(',').some((candidate) => candidate.trim().endsWith(selector)))
    .map((match) => match[2].replace(/\s+/g, ''));
}

function getMatchingCssRuleBodies(element) {
  return [desktopCssText, mobileCssText].flatMap((source) =>
    Array.from(source.matchAll(/([^{}]+)\{([^{}]*)\}/g))
      .filter((match) => match[1].split(',').some((candidate) => {
        try {
          return element.matches(candidate.trim());
        } catch {
          return false;
        }
      }))
      .map((match) => match[2].replace(/\s+/g, ''))
  );
}

function getCssProperty(ruleBody, property) {
  const match = ruleBody.match(new RegExp(`(?:^|;)${property}:([^;]+)`));
  return match?.[1] ?? '';
}

function assertRuleProperty(selector, property, valuePattern, message) {
  const values = getCssRuleBodies(selector).map((body) => getCssProperty(body, property));
  assert.ok(values.some((value) => valuePattern.test(value)), message);
}

function elementHasCssProperty(element, property, valuePattern) {
  return getMatchingCssRuleBodies(element)
    .some((body) => valuePattern.test(getCssProperty(body, property)));
}

function getMobileCss() {
  assert.ok(mobileMediaRange, '应存在完整的 max-width: 768px 移动断点');
  return mobileCssText;
}

// 静默虚拟控制台，避免外部 CSS/资源解析告警污染测试输出
const virtualConsole = new VirtualConsole();
const dom = new JSDOM(html, { virtualConsole });
const doc = dom.window.document;

const sectionBasic = doc.getElementById('section-basic');

test('基本信息外层容器应带 basic-info-section 类', () => {
  assert.ok(sectionBasic, '#section-basic 应存在');
  const section = sectionBasic.closest('.special-form-section');
  assert.ok(section, '#section-basic 应位于 .special-form-section 内');
  assert.ok(
    section.classList.contains('basic-info-section'),
    '基本信息容器应带 basic-info-section 类'
  );
});

test('基本信息标题下应包含 basic-title-accent 强调线', () => {
  const section = sectionBasic.closest('.basic-info-section');
  const title = section.querySelector('.section-title');
  assert.ok(title, '基本信息标题应存在');
  assert.strictEqual(title.textContent.trim(), '基本信息');
  assert.ok(
    title.nextElementSibling?.classList.contains('basic-title-accent'),
    '基本信息标题下应紧跟 .basic-title-accent'
  );
});

test('所有既有基本信息字段仍应存在', () => {
  const fieldIds = [
    'plname',
    'cloudVersion',
    'planDevTypeFormItem',
    'deviceIdFormItem',
    'authSceneFormItem',
    'area',
    'office',
    'userEmail',
    'customerSearchInput',
    'devSnFormItem',
    'borrowTestFields'
  ];
  fieldIds.forEach((id) => assert.ok(doc.getElementById(id), `既有基本信息字段 #${id} 应保留`));
});

test('桌面端基础布局与标题强调线应符合样式合同', () => {
  assertRuleProperty(
    '.basic-two-col-row',
    'grid-template-columns',
    /^(?:repeat\(2,minmax\(0,1fr\)\)|minmax\(0,1fr\)minmax\(0,1fr\))$/,
    '.basic-two-col-row 应为两列'
  );
  assertRuleProperty(
    '.basic-full-row',
    'grid-template-columns',
    /^(?:1fr|minmax\(0,1fr\))$/,
    '.basic-full-row 应为单列，使字段输入框占满整行'
  );

  const accentRules = getCssRuleBodies('.basic-title-accent');
  assert.ok(accentRules.length > 0, '.basic-title-accent 应有样式规则');
  assert.ok(
    accentRules.some((body) => {
      const height = getCssProperty(body, 'height');
      const background = getCssProperty(body, 'background') || getCssProperty(body, 'background-color');
      return /^(?!0(?:px|rem|em)?$)\d*\.?\d+(?:px|rem|em)$/.test(height) && background.length > 0;
    }),
    '.basic-title-accent 应有可见高度和背景'
  );
});

test('移动端全行布局应保持单列', () => {
  const mobileCss = getMobileCss().replace(/\s+/g, '');
  assert.ok(
    /\.basic-full-row(?:,[^{}]+)*\{[^{}]*grid-template-columns:1fr(?:;|})/.test(mobileCss),
    '移动端 .basic-full-row 应为 1fr'
  );
});

test('紧凑桌面宽度应隐藏右侧模块导航并保留顶部账号入口空间', () => {
  const compactMediaMatch = /@media\s*\(max-width\s*:\s*1366px\)\s*and\s*\(min-width\s*:\s*769px\)/i.exec(cssText);
  const compactMediaRange = findCssBlockRange(cssText, compactMediaMatch?.index ?? -1);
  assert.ok(compactMediaRange, '应存在 769px 至 1366px 的紧凑桌面断点');
  const compactCss = cssText.slice(compactMediaRange.contentStart, compactMediaRange.contentEnd).replace(/\s+/g, '');
  assert.match(compactCss, /\.module-nav\{display:none;/, '紧凑桌面应隐藏右侧模块导航');
  assert.match(compactCss, /\.content-body\{padding:12px32px;/, '紧凑桌面应释放正文两侧预留空间');
  assert.match(compactCss, /\.header-user-dropdown,\.header-user\{flex-shrink:0;/, '账号入口在紧凑桌面不得被压缩');
});

test('申请类型全行网格项应允许内容安全收缩', () => {
  const item = doc.getElementById('planDevTypeFormItem');
  assert.ok(item.closest('.basic-full-row'), '申请类型应位于 .basic-full-row 内');
  assert.ok(
    elementHasCssProperty(item, 'min-width', /^0(?:px)?$/),
    '申请类型全行内的 .layui-form-item 应设置 min-width: 0'
  );
});

test('申请类型长选中值应安全截断而不撑宽整行', () => {
  const value = doc.querySelector('#planDevTypeFormItem .custom-select-value');
  assert.ok(value, '申请类型应包含 .custom-select-value');
  assert.deepStrictEqual(
    {
      minWidth: elementHasCssProperty(value, 'min-width', /^0(?:px)?$/),
      overflow: elementHasCssProperty(value, 'overflow', /^hidden$/),
      textOverflow: elementHasCssProperty(value, 'text-overflow', /^ellipsis$/),
      whiteSpace: elementHasCssProperty(value, 'white-space', /^nowrap$/)
    },
    {
      minWidth: true,
      overflow: true,
      textOverflow: true,
      whiteSpace: true
    },
    '申请类型选中值应具备完整的单行省略规则'
  );
});

test('设备事实面板应纵向堆叠并符合桌面与移动样式合同', () => {
  const summary = doc.getElementById('deviceFactsSummary');
  const borrow = doc.getElementById('borrowTestFields');
  assert.strictEqual(summary.parentElement, borrow.parentElement, '设备事实与借测信息应位于同一全宽层级');

  const summaryBodies = [
    ...getCssRuleBodies('#deviceFactsSummary'),
    ...getCssRuleBodies('.device-facts-summary')
  ];
  assert.ok(
    summaryBodies.some((body) =>
      getCssProperty(body, 'display') === 'grid' ||
      (getCssProperty(body, 'display') === 'flex' && getCssProperty(body, 'flex-direction') === 'column')
    ),
    '设备事实摘要容器应采用纵向 grid 或 column flex 堆叠'
  );

  const panelBackgrounds = getCssRuleBodies('.device-facts-panel')
    .map((body) => getCssProperty(body, 'background') || getCssProperty(body, 'background-color'));
  assert.ok(
    panelBackgrounds.some((value) => {
      if (/^var\(--[^)]*(?:blue|primary|info)[^)]*\)$/.test(value)) return true;
      const hex = value.match(/^#([0-9a-f]{6})$/i);
      if (!hex) return false;
      const channels = hex[1].match(/.{2}/g).map((channel) => Number.parseInt(channel, 16));
      return channels.every((channel) => channel >= 220) && channels[2] > channels[0] && channels[2] >= channels[1];
    }),
    '.device-facts-panel 应使用浅蓝背景或浅蓝色变量'
  );
  assertRuleProperty(
    '.device-facts-grid',
    'grid-template-columns',
    /^repeat\((?:auto-fit|auto-fill),minmax\(/,
    '桌面端 .device-facts-grid 应使用自适应网格'
  );

  const mobileCss = getMobileCss().replace(/\s+/g, '');
  assert.ok(
    /\.device-facts-grid(?:,[^{}]+)*\{[^{}]*grid-template-columns:(?:repeat\(2,minmax\(0,1fr\)\)|1fr1fr)(?:;|})/.test(mobileCss),
    '移动端 .device-facts-grid 应为两列'
  );
});

test('产品线与版本应在同一 basic-two-col-row 两列布局中', () => {
  const plname = doc.getElementById('plname');
  const row = plname.closest('.basic-two-col-row');
  assert.ok(row, '产品线应位于 .basic-two-col-row 内');
  assert.ok(row.querySelector('#cloudVersion'), '同一行应包含版本 cloudVersion');
});

test('授权场景应占满独立整行，区域与办事处保持标准两列布局', () => {
  const authSceneItem = doc.getElementById('authSceneFormItem');
  const authSceneRow = doc.getElementById('authSceneRow');
  const area = doc.getElementById('area');
  const office = doc.getElementById('office');
  const areaItem = area.closest('.layui-form-item');
  const officeItem = office.closest('.layui-form-item');
  const officeRow = areaItem.parentElement;
  assert.ok(authSceneRow.classList.contains('basic-full-row'), '授权场景应使用全行单列轨道');
  assert.strictEqual(authSceneItem.parentElement, authSceneRow, '授权场景应为独立行的直接子项');
  assert.ok(officeRow.classList.contains('basic-two-col-row'), '区域与办事处应使用标准两列布局');
  assert.notStrictEqual(officeRow, authSceneRow, '授权场景不应再与区域、办事处挤在同一行');
  assert.strictEqual(areaItem.parentElement, officeRow, '区域应为两列行的直接子项');
  assert.strictEqual(officeItem.parentElement, officeRow, '办事处应为两列行的直接子项');
});

test('硬件信息文件应紧跟产品线与版本并位于设备字段之前', () => {
  const productRow = doc.getElementById('plname').closest('.basic-two-col-row');
  const hwInfo = doc.getElementById('hwInfoSection');
  const device = doc.getElementById('deviceIdFormItem');
  assert.equal(productRow.nextElementSibling, hwInfo, '硬件信息文件应直接位于产品线/版本下方');
  assert.ok(hwInfo.compareDocumentPosition(device) & 4, '硬件信息文件应位于设备字段之前');
  assert.ok(hwInfo.classList.contains('basic-full'), '硬件信息文件应占满整行');
});

test('客户信息应展示销售负责人徽章 selectedSales', () => {
  const sales = doc.getElementById('selectedSales');
  assert.ok(sales, 'selectedSales 元素应存在');
  assert.ok(
    sales.classList.contains('sales-person-badge'),
    'selectedSales 应带 sales-person-badge 类'
  );
  const display = doc.getElementById('customerInfoDisplay');
  assert.ok(display.contains(sales), 'selectedSales 应位于客户信息展示区内');
});

test('申请类型表单项应位于 basic-full-row 并占满整行', () => {
  const item = doc.getElementById('planDevTypeFormItem');
  assert.ok(item, 'planDevTypeFormItem 应存在');
  assert.ok(
    item.querySelector('[data-select-id="planDevType"]'),
    'planDevTypeFormItem 应包裹申请类型下拉'
  );
  const row = item.closest('.basic-full-row');
  assert.ok(row, '申请类型应位于 .basic-full-row 内');
  assert.strictEqual(item.parentElement, row, '申请类型应为 .basic-full-row 的直接子项');
});

test('借测信息区域应使用 basic-borrow-panel 面板与 borrow-grid 网格', () => {
  const borrow = doc.getElementById('borrowTestFields');
  assert.ok(borrow, 'borrowTestFields 应存在');
  assert.ok(
    borrow.classList.contains('basic-borrow-panel'),
    '借测信息区域应带 basic-borrow-panel 类'
  );
  assert.ok(borrow.querySelector('.basic-borrow-title'), '借测信息区域应含标题 basic-borrow-title');
  assert.ok(borrow.querySelector('.borrow-grid'), '借测信息区域应含 borrow-grid 两列网格');
});

test('接收邮箱、设备SN和设备ID应为全宽 basic-full', () => {
  const email = doc.getElementById('userEmail').closest('.layui-form-item');
  assert.ok(email.classList.contains('basic-full'), '接收邮箱应为全宽');
  assert.ok(
    doc.getElementById('devSnFormItem').classList.contains('basic-full'),
    '设备SN 应为全宽'
  );
  assert.ok(
    doc.getElementById('deviceIdFormItem').classList.contains('basic-full'),
    '设备ID 应为全宽'
  );
});

test('申请参数与审批明细不作为申请人可见字段', () => {
  assert.equal(doc.getElementById('requestParametersFormItem'), null, '不应保留常驻申请参数表单项');
  const preview = doc.getElementById('approvalPreview');
  assert.ok(preview, '内部审批状态容器应存在');
  assert.equal(preview.hidden, true, '内部审批状态容器应始终隐藏');
  assert.equal(preview.querySelector('.layui-form-label'), null, '不应展示审批预览字段标签');
});

test('设备兼容性仅作为设备ID下方的异常提示', () => {
  const deviceItem = doc.getElementById('deviceIdFormItem');
  const blocking = doc.getElementById('deviceCompatibilityBlocking');
  assert.ok(deviceItem.contains(blocking), '兼容性提示应位于设备ID表单项内');
  assert.equal(blocking.hidden, true, '无冲突时兼容性提示应隐藏');
  assert.equal(blocking.querySelector('.layui-form-label'), null, '兼容性提示不应伪装成字段');
});
