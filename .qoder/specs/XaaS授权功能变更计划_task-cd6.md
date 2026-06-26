# XaaS授权功能变更计划

## Context
当前XaaS授权模块需要针对试用中客户的授权管理进行优化，包括调整提示文案、重构延长有效期交互（从独立区域改为各产品规格内调整）、新增字段和审批规则入口。

## 涉及文件
- `d:\原型\测试授权\测试设备授权平台.html` (V1)
- `d:\原型\测试授权\测试设备授权平台V2.html` (V2)

---

## Task 1：修改试用客户提示文案

### 1.1 添加试用状态数据模型
在两个文件的JS中，为每个XaaS产品添加试用状态标记（原型阶段用模拟数据）：
```js
// 产品试用状态映射（模拟数据）
var xaasTrialStatus = {
    'SaaS-XDR': false,
    'NGDR': false,
    'SaaS-aES': false,
    'SASE-XDLP': false,
    'SASE-ZTNA': false,
    'SASE-SWG': false,
    '钓鱼邮件防护': false,
    '云威胁情报网关': false,
    'SASE-GA': false
};
```

### 1.2 每个产品项添加试用状态提示区域
在每个产品的 `.xaas-product-item` 内部，在checkbox和描述之间，添加一个提示区域：
- 当 `trialStatus[product] === true` 时显示："客户正在试用该产品，支持修改授权信息或延长有效期"
- 用黄色背景/警告图标样式展示

### 1.3 更新CSS
为试用提示添加样式：`.xaas-product-trial-hint`，黄色背景、警告图标、圆角样式。

---

## Task 2：删除"延长试用授权有效期"独立区域，迁移到各产品规格中

### 2.1 删除独立延长区域
在两个文件中，删除以下HTML：
- V1: 第1893-1908行的 `.layui-form-item`（延长试用授权有效期checkbox + datepicker）
- V2: 第2078-2095行的 `.layui-form-item`（同上）

### 2.2 删除相关JS
- 删除 `setXaasExtendDateLimit()` 函数（V1: ~2338行, V2: ~2655行）
- 删除 `xaas-extend-check` 的change事件监听
- 从 `resetXaasForm` 中移除 `xaas-extend-date-new` 的重置
- 删除 `updateXaasApplyReason` 中的 extendChecked 逻辑

### 2.3 每个产品内联规格区添加"授权有效期"字段
在每个产品的 `.xaas-inline-spec-area` 中添加：
```html
<div class="spec-field-row spec-expiry-row">
    <label>授权有效期</label>
    <input type="date" class="spec-expiry-date" data-product="产品名" disabled>
    <button type="button" class="spec-expiry-btn" title="仅正在试用中的客户支持调整授权有效期" disabled>📅 修改授权有效期</button>
    <span class="spec-expiry-hint" style="display:none;font-size:12px;color:#b45309;">
        ⚠ 编辑授权有效期时，默认选中的日期为当前的授权到期时间。可选日期为授权到期时间之后，不可缩短有效期。
    </span>
</div>
```

对于没有inline spec area的产品（如云威胁情报网关），添加独立的inline spec area仅包含有效期字段。

### 2.4 授权有效期按钮启用/禁用逻辑
在JS中添加函数 `updateXaasExpiryButtons(trialStatus)`：
- 遍历所有 `.spec-expiry-btn`
- 如果 `trialStatus[product] === true`：启用按钮，点击后显示日期输入框，默认值为当前授权到期时间，min设置为当前授权到期时间
- 如果 `trialStatus[product] === false`：禁用按钮，灰色，hover显示tooltip "仅正在试用中的客户支持调整授权有效期，请先为客户开通试用授权再提交修改授权有效期申请。"

### 2.5 更新申请理由显隐逻辑
`updateXaasApplyReason` 函数中，将 `extendChecked` 条件改为检测是否有任何授权有效期按钮被激活（点击展开）。

---

## Task 3：授权有效期日期选择逻辑

### 3.1 日期选择器逻辑（在 `updateXaasExpiryButtons` 中实现）
当点击"修改授权有效期"按钮时：
1. 显示日期输入框
2. 从产品数据的 `defaultExpiry` 获取当前授权到期时间
3. 设置date input的 `value = 当前授权到期时间`
4. 设置date input的 `min = 当前授权到期时间`
5. 用户只能选择当前到期时间之后的日期

### 3.2 产品默认到期时间数据
为每个产品添加 `defaultExpiry` 数据属性或JS映射，如：
```js
var xaasProductExpiry = {
    'SaaS-XDR': '2026-07-07',   // 模拟数据
    'SASE-GA': '2026-07-07',
    // ...其他产品
};
```
计算方法：当前日期 + 有效期天数（如SASE-GA有效期15天，则到期日为当前+15天）。

---

## Task 4：SaaS-XDR试用额外信息添加"项目预计落地时间"

### 4.1 V1文件修改
在第1872行（安全预算区间字段）后面，添加：
```html
<div class="xaas-extra-field full"><label>项目预计落地时间<span class="required-star">*</span></label><input type="date" id="xdr-project-landing-date" class="layui-input" style="max-width:200px;"></div>
```

### 4.2 V2文件修改
V2的SaaS-XDR额外信息目前只包含"测试场景"字段，在测试场景后面添加：
```html
<div class="xaas-extra-field full"><label>项目预计落地时间<span class="required-star">*</span></label><input type="date" id="xdr-project-landing-date" class="layui-input" style="max-width:200px;"></div>
```

### 4.3 添加重置逻辑
在 `resetXaasForm` 函数中添加 `xdr-project-landing-date` 的重置。

---

## Task 5：页面上方添加"查看审批规则"入口

### 5.1 HTML添加
在XaaS表单区域顶部（V1约第1780行附近，V2约第1965行附近），在 `<div class="section-title">订阅产品</div>` 之前添加：
```html
<div class="xaas-approval-rule-bar">
    <span class="xaas-approval-rule-link" onclick="showXaasApprovalRules()">
        <span class="material-symbols-outlined" style="font-size:18px;vertical-align:middle;">info</span>
        查看审批规则
    </span>
</div>
```

### 5.2 JS: showXaasApprovalRules函数
添加模拟弹窗/页面显示审批规则内容，包含：
- XaaS授权审批流程说明
- 修改规格审批要求
- 延长有效期审批要求

### 5.3 CSS样式
`.xaas-approval-rule-bar` 右对齐、悬浮变色、蓝色文字链接样式。

---

## Verification
1. 在浏览器中打开V1和V2页面，测试XaaS授权 Tab
2. 验证试用提示文案是否按预期显示
3. 验证各产品规格区显示"修改授权有效期"按钮
4. 验证启用/禁用状态及hover提示
5. 验证日期选择器默认值、可选范围
6. 验证"项目预计落地时间"字段出现在SaaS-XDR额外信息中
7. 验证"查看审批规则"入口和弹窗功能
8. 验证提交表单时日期字段校验