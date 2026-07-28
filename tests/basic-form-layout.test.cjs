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
  assert.ok(
    elementHasCssProperty(section, 'width', /^100%$/),
    '基本信息卡应固定占满主表单宽度，不应按内容动态收缩'
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

test('移动端始终隐藏模块导航且脚本不得写入内联显隐状态', () => {
  const mobileCss = getMobileCss().replace(/\s+/g, '');
  assert.match(
    mobileCss,
    /body\[data-active-tab="hardware"\]\.module-nav\{display:none!important;/,
    '移动端即使处于产品授权页也必须隐藏模块导航'
  );
  assertRuleProperty('.module-nav', 'display', /^none$/, '模块导航默认状态应为隐藏');
  assert.doesNotMatch(
    html,
    /moduleNav\.style\.display\s*=/,
    'Tab 切换脚本不应使用内联 display 覆盖响应式规则'
  );
});

test('桌面布局应约束顶部账号入口并始终保留模块导航', () => {
  const headerRules = getCssRuleBodies('.layui-layout-admin .layui-header');
  assert.ok(
    headerRules.some((body) => getCssProperty(body, 'width') === 'auto' && getCssProperty(body, 'min-width') === '0'),
    '顶部栏应由 left/right 决定宽度，避免账号入口向右溢出'
  );
  assert.ok(
    getCssRuleBodies('.header-user-dropdown').some((body) => getCssProperty(body, 'flex') === '00auto'),
    '账号入口不得在顶部栏内被压缩'
  );

  const compactMediaMatch = /@media\s*\(max-width\s*:\s*1366px\)\s*and\s*\(min-width\s*:\s*769px\)/i.exec(cssText);
  const compactMediaRange = findCssBlockRange(cssText, compactMediaMatch?.index ?? -1);
  assert.ok(compactMediaRange, '应存在 769px 至 1366px 的紧凑桌面断点');
  const compactCss = cssText.slice(compactMediaRange.contentStart, compactMediaRange.contentEnd).replace(/\s+/g, '');
  assert.match(compactCss, /\.module-nav\{display:block;/, '桌面宽度不应隐藏右侧模块导航');
  assert.match(compactCss, /\.content-body\{padding:12px188px12px32px;/, '紧凑桌面应为右侧模块导航保留空间');
});

test('1024 宽度应将左侧导航收为图标轨并保留右侧导航空间', () => {
  const railMediaMatch = /@media\s*\(max-width\s*:\s*1100px\)\s*and\s*\(min-width\s*:\s*769px\)/i.exec(cssText);
  const railMediaRange = findCssBlockRange(cssText, railMediaMatch?.index ?? -1);
  assert.ok(railMediaRange, '应存在 769px 至 1100px 的图标轨断点');
  const railCss = cssText.slice(railMediaRange.contentStart, railMediaRange.contentEnd).replace(/\s+/g, '');
  assert.match(railCss, /\.layui-layout-admin\.layui-side\{width:64px;/, '左侧导航应收窄为 64px');
  assert.match(railCss, /\.layui-layout-admin\.layui-header,\.layui-layout-admin\.layui-body\{left:64px;/, '顶部栏和正文应同步左移');
  assert.match(railCss, /\.brand-title,\.navBarulliacite\{display:none;/, '图标轨应隐藏品牌标题和菜单文字');
  assert.match(railCss, /\.content-body\{padding:12px188px12px24px;/, '正文仍应为右侧模块导航预留空间');
});

test('硬件授权应使用带状态反馈的粘性操作栏', () => {
  const actionBar = doc.getElementById('standardActionBar');
  assert.ok(actionBar, '应存在标准表单操作栏');
  assert.equal(actionBar.closest('form')?.id, 'formsn');
  assert.ok(doc.getElementById('standardActionStatusText'), '操作栏应包含实时状态文案');
  assert.equal(actionBar.querySelector('[role="status"]')?.getAttribute('aria-live'), 'polite');
  assert.deepEqual(
    Array.from(actionBar.querySelectorAll('button')).map((button) => button.textContent.trim()),
    ['重置', '立即获取'],
    '次要操作应位于主要操作之前'
  );
  assertRuleProperty('.standard-action-bar', 'position', /^sticky$/, '操作栏应跟随滚动容器粘附');
  assertRuleProperty('.standard-action-bar', 'bottom', /^0$/, '操作栏应粘附在滚动容器底部');
  assertRuleProperty('body[data-active-tab="hardware"] .layui-footer', 'display', /^none$/, '硬件授权页应释放旧页脚空间');
});

test('顶部图标和关键自定义下拉应具有可读名称', () => {
  const headerButtons = Array.from(doc.querySelectorAll('.header-menu-btn, .header-icon-btn'));
  assert.deepEqual(
    headerButtons.map((button) => button.getAttribute('aria-label')),
    ['展开侧边导航', '操作手册', '系统设置']
  );

  const expectedLabels = {
    plname: '产品线',
    cloudVersion: '版本',
    planDevType: '申请类型',
    area: '区域',
    office: '办事处'
  };
  Object.entries(expectedLabels).forEach(([selectId, label]) => {
    const trigger = doc.querySelector(`[data-select-id="${selectId}"] .custom-select-trigger`);
    assert.equal(trigger?.getAttribute('aria-label'), label, `${selectId} 下拉应有明确名称`);
  });
  const productTrigger = doc.querySelector('[data-select-id="plname"] .custom-select-trigger');
  assert.equal(productTrigger.getAttribute('role'), 'combobox');
  assert.equal(productTrigger.getAttribute('aria-expanded'), 'false');
  assert.equal(productTrigger.getAttribute('aria-controls'), 'productLineOptions');
});

test('首屏应通过硬件授权 Tab 状态入口显示右侧模块导航', () => {
  const switchTabDefinition = html.indexOf('function switchTab(tabName)');
  const switchTabInitialization = html.indexOf("switchTab('hardware');", switchTabDefinition);
  const xaasSection = html.indexOf('// ===== XaaS 授权场景切换 =====', switchTabDefinition);
  assert.ok(switchTabDefinition >= 0, '应存在统一的 switchTab 状态入口');
  assert.ok(switchTabInitialization > switchTabDefinition, '首屏应显式初始化 hardware Tab');
  assert.ok(switchTabInitialization < xaasSection, 'hardware Tab 初始化应在其他业务逻辑启动前完成');
  assert.match(
    html,
    /function switchTab\(tabName\)\s*\{\s*document\.body\.dataset\.activeTab\s*=\s*tabName;/,
    '切换 Tab 时应同步 body 的 activeTab 页面状态'
  );
  const hardwareNavRules = getCssRuleBodies('body[data-active-tab="hardware"] .module-nav');
  assert.ok(
    hardwareNavRules.some((body) =>
      getCssProperty(body, 'display') === 'block!important' &&
      getCssProperty(body, 'visibility') === 'visible!important' &&
      getCssProperty(body, 'opacity') === '1!important'
    ),
    '硬件授权状态应强制显示右侧模块导航'
  );
  assertRuleProperty('.module-nav', 'z-index', /^2100$/, '右侧模块导航应位于固定正文层之上');
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
    panelBackgrounds.some((value) => /^#(?:fff|ffffff)$/i.test(value)),
    '.device-facts-panel 应使用中性白色背景，减少嵌套卡片感'
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
  assert.ok(row.classList.contains('product-version-row'), '产品与版本行应带 product-version-row 比例布局类');
  assertRuleProperty(
    '.product-version-row',
    'grid-template-columns',
    /^minmax\(0,2fr\)minmax\(0,3fr\)$/,
    '版本字段应比产品线获得更多展示空间'
  );
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

test('客户信息应位于产品线之后，硬件信息文件位于客户与设备之间', () => {
  const productRow = doc.getElementById('plname').closest('.basic-two-col-row');
  const customer = doc.getElementById('customerInfoFormItem');
  const hwInfo = doc.getElementById('hwInfoSection');
  const device = doc.getElementById('deviceIdFormItem');
  assert.equal(productRow.nextElementSibling, customer, '客户信息应直接位于产品线/版本下方');
  assert.equal(customer.nextElementSibling, hwInfo, '硬件信息文件应紧跟客户信息');
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
  assert.ok(display.querySelector('.customer-summary-main'), '客户选中态应使用单条摘要布局');
  assert.ok(display.querySelector('#changeCustomerButton'), '客户摘要应提供更换客户操作');
  assert.match(html, /customerInfoFormItem\.classList\.add\('has-selection'\)/, '选择客户后应切换为摘要状态');
});

test('客户编码仅用于内部查询且不在页面展示', () => {
  const display = doc.getElementById('customerInfoDisplay');
  assert.equal(doc.getElementById('selectedCustomerId'), null, '客户摘要不应展示内部客户编码');
  assert.doesNotMatch(display.textContent, /客户ID/, '客户摘要不应保留客户ID标签');
  assert.doesNotMatch(html, /class="item-id"/, '客户搜索结果不应展示内部客户编码');
  assert.doesNotMatch(html, /请输入客户ID/, '页面输入提示不应引导展示客户编码');
  assert.equal(doc.getElementById('customerSearchInput').placeholder, '请输入客户名称搜索');
  assert.match(html, /data-id="' \+ c\.id \+ '"/, '客户编码应继续作为内部查询键保留');
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

test('接收邮箱应在输入框内提示优先填写客户邮箱', () => {
  const email = doc.getElementById('userEmail');
  assert.match(email.placeholder, /建议优先填写客户邮箱/);
  assert.match(email.title, /授权结果及相关文件/);
  assert.equal(doc.getElementById('userEmailHelp'), null, '不应在输入框下方重复占用一行');
});

test('超期申请补充信息应使用整行自适应表单布局', () => {
  const fields = doc.getElementById('overlimit-fields');
  const reason = doc.getElementById('overlimitReason');
  const upload = doc.getElementById('overlimitFileInfo');
  assert.ok(fields.classList.contains('basic-full-row'));
  assert.equal(reason.closest('.layui-input-block').parentElement.parentElement, fields);
  assert.ok(elementHasCssProperty(reason, 'width', /^100%$/), '申请理由应占满内容区');
  assert.ok(elementHasCssProperty(reason, 'min-height', /^80px$/), '申请理由应提供稳定的多行录入高度');
  assert.ok(elementHasCssProperty(reason, 'resize', /^none$/), '申请理由不应允许拖拽破坏布局');
  assert.ok(elementHasCssProperty(upload, 'flex', /^11auto$/), '文件状态区域应自适应填满剩余宽度');
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
