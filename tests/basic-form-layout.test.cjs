'use strict';

/**
 * 基本信息表单布局对齐测试（V1 -> V2）
 *
 * 目标：验证 `测试设备授权平台V2.html` 中「申请产品授权」Tab 下的
 * 基本信息表单，已恢复与 V1（测试设备授权平台.html）一致的布局结构：
 *  - 外层容器带 basic-info-section
 *  - 产品线+版本、区域+办事处 使用 basic-two-col-row 两列布局
 *  - 关键字段使用 basic-full 全宽
 *  - 申请类型带 planDevTypeFormItem 包装
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

test('产品线与版本应在同一 basic-two-col-row 两列布局中', () => {
  const plname = doc.getElementById('plname');
  const row = plname.closest('.basic-two-col-row');
  assert.ok(row, '产品线应位于 .basic-two-col-row 内');
  assert.ok(row.querySelector('#cloudVersion'), '同一行应包含版本 cloudVersion');
});

test('区域与办事处应在同一 basic-two-col-row 两列布局中', () => {
  const area = doc.getElementById('area');
  const row = area.closest('.basic-two-col-row');
  assert.ok(row, '区域应位于 .basic-two-col-row 内');
  assert.ok(row.querySelector('#office'), '同一行应包含办事处 office');
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

test('申请类型表单项应有 planDevTypeFormItem 包装且为全宽', () => {
  const item = doc.getElementById('planDevTypeFormItem');
  assert.ok(item, 'planDevTypeFormItem 应存在');
  assert.ok(
    item.querySelector('[data-select-id="planDevType"]'),
    'planDevTypeFormItem 应包裹申请类型下拉'
  );
  assert.ok(item.classList.contains('basic-full'), '申请类型应为全宽 basic-full');
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

test('接收邮箱/设备SN/设备ID/授权场景 应为全宽 basic-full', () => {
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
  assert.ok(
    doc.getElementById('authSceneFormItem').classList.contains('basic-full'),
    '授权场景应为全宽'
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
