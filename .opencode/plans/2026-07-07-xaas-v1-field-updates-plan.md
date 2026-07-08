# XaaS V1 字段调整 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 subagent-driven-development（推荐）或 executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 调整 XaaS 授权表单的字段显示、数据流和交互逻辑，共 5 项改动。

**架构：** 单 HTML 文件（含内联 CSS/JS），所有改动集中在 `测试设备授权平台.html` 中。数据 mock 和内联逻辑在同一文件内调整。

**技术栈：** 原生 HTML/CSS/JS，无框架

---

### 任务 1：数据改造 - 云图账号数据结构 + Phone 查找逻辑重构

**文件：**
- 修改：`测试设备授权平台.html`

- [ ] **步骤 1：改造 mockCloudAccounts 数据结构**

将 `mockCloudAccounts`（行 2432-2448）从 `phone + realName` 改为包含新增字段：
```js
var mockCloudAccounts = {
    'C100001': [
        { phone: '13800138000', realName: '马化腾', tenantId: 'tenant-001', tenantName: '腾讯科技', masterAccount: '13800138000', masterContact: '马化腾' },
        { phone: '13912345678', realName: '张勇', tenantId: 'tenant-002', tenantName: '阿里巴巴', masterAccount: '13912345678', masterContact: '张勇' }
    ],
    'C100010': [
        { phone: '13612345678', realName: '王磊', tenantId: 'tenant-010', tenantName: '字节跳动', masterAccount: '13612345678', masterContact: '王磊' },
        { phone: '13798765432', realName: '陈静', tenantId: 'tenant-011', tenantName: '字节跳动-飞书', masterAccount: '13798765432', masterContact: '陈静' },
        { phone: '13511112222', realName: '赵岩', tenantId: 'tenant-012', tenantName: '字节跳动-TikTok', masterAccount: '13511112222', masterContact: '赵岩' }
    ],
    'C100004': [
        { phone: '13900139000', realName: '李四', tenantId: 'tenant-004', tenantName: '百度科技', masterAccount: '13900139000', masterContact: '李四' }
    ],
    'C100003': [
        { phone: '13200001111', realName: '任正非', tenantId: 'tenant-003', tenantName: '华为技术', masterAccount: '13200001111', masterContact: '任正非' }
    ]
};
```

- [ ] **步骤 2：重构 mockXaasPhoneLookup 为返回云图账号列表**

将 `mockXaasPhoneLookup`（行 2422-2430）从返回 `{ mcodes, contactName }` 改为直接返回云图账号列表和客户 ID。同时新增一个 phone→accounts 的 mock 映射：

**添加新的 phone-to-accounts 映射**（在 var mockCloudAccounts 下方）：
```js
var mockXaasPhoneToAccounts = {
    '1717717': { accounts: [], contactName: '马化腾' },
    '17177170000': { accounts: [], contactName: '马化腾' },
    '13800138000': { accounts: ['C100001'] },
    '13900139000': { accounts: ['C100004'] },
    '13700137000': { accounts: [] },
    '13600000000': { accounts: ['C100001', 'C100010'] },
    '13500000000': { accounts: [] }
};
```

**修改 `resolveMockXaasCustomer` 函数**（行 2717-2724）：
```js
function resolveMockXaasCustomer(phone) {
    var mock = mockXaasPhoneToAccounts[phone];
    if (!mock) return null;
    // 根据 accounts 中的客户 ID 获取完整的云图账号列表
    var allAccounts = [];
    if (mock.accounts && mock.accounts.length > 0) {
        mock.accounts.forEach(function(cid) {
            var accounts = mockCloudAccounts[cid] || [];
            accounts.forEach(function(acc) {
                // 去重：避免同一 phone 出现多次
                if (!allAccounts.some(function(a) { return a.phone === acc.phone; })) {
                    allAccounts.push(acc);
                }
            });
        });
    }
    return {
        accounts: allAccounts,
        contactName: mock.contactName || ''
    };
}
```

- [ ] **步骤 3：修改 phone blur 事件处理逻辑**

**位置：** 行 3531-3591

替换为新的三段逻辑：
```js
xaasPhoneInput.addEventListener('blur', function() {
    var phone = this.value.trim();
    var hint = document.getElementById('xaas-phone-hint');
    if (!phone) {
        setXaasCustomer('', '', '');
        resetXaasSearchState();
        hideCloudAccountFields();
        if (hint) hint.textContent = '输入手机号后模拟匹配客户名称；未匹配时可通过搜索选择客户。';
        return;
    }
    var result = resolveMockXaasCustomer(phone);
    if (!result) {
        setXaasCustomer('', '', '');
        resetXaasSearchState();
        hideCloudAccountFields();
        if (hint) hint.textContent = '未匹配到云图客户，请搜索或创建客户。';
        return;
    }
    var contactName = document.getElementById('xaas-contact-name');
    if (contactName && !contactName.value.trim() && result.contactName) contactName.value = result.contactName;
    var accounts = result.accounts || [];
    
    if (accounts.length === 0) {
        // 无云图账号 → 隐藏云图账号，客户名称自由选择
        hideCloudAccountFields();
        setXaasCustomer('', '', '');
        resetXaasSearchState();
        if (hint) hint.textContent = '该手机号未注册云图账号，请搜索或创建客户。';
    } else if (accounts.length === 1) {
        // 单个云图账号 → 隐藏云图账号字段，直接查主数据锁定客户
        hideCloudAccountFields();
        fillCloudAccountInfo(accounts[0]);
        var cid = findCustomerIdByPhone(accounts[0].phone);
        if (cid) {
            var matchedCustomers = resolveCustomersByMcodes([cid]);
            if (matchedCustomers.length > 0) {
                var c = matchedCustomers[0];
                setXaasCustomer(c.name, c.id, c.type, c.sales, true);
                if (hint) hint.textContent = '已根据云图账号匹配客户名称。';
            } else {
                setXaasCustomer('', '', '');
                if (hint) hint.textContent = '云图账号存在但主数据无对应客户，请搜索或创建。';
            }
        } else {
            setXaasCustomer('', '', '');
            if (hint) hint.textContent = '云图账号存在但无法匹配客户，请搜索或创建。';
        }
    } else {
        // 多个云图账号 → 显示云图账号下拉，用户选择后查主数据
        showCloudAccountSelection(accounts);
        setXaasCustomer('', '', '');
        resetXaasSearchState();
        if (hint) hint.textContent = '已找到 ' + accounts.length + ' 个云图账号，请选择所属账号。';
    }
});
```

- [ ] **步骤 4：添加新的辅助函数**

在 `resolveMockXaasCustomer` 附近添加：

```js
function findCustomerIdByPhone(phone) {
    // 根据手机号查找对应的客户ID
    for (var cid in mockCloudAccounts) {
        var accounts = mockCloudAccounts[cid];
        for (var i = 0; i < accounts.length; i++) {
            if (accounts[i].phone === phone) return cid;
        }
    }
    return null;
}

function hideCloudAccountFields() {
    var item = document.getElementById('xaasCloudAccountItem');
    if (item) item.classList.remove('show');
    var detail = document.getElementById('xaasCloudAccountDetail');
    if (detail) detail.style.display = 'none';
}

function fillCloudAccountInfo(account) {
    var detail = document.getElementById('xaasCloudAccountDetail');
    if (!detail) return;
    document.getElementById('xaas-tenant-id').textContent = account.tenantId || '-';
    document.getElementById('xaas-tenant-name').textContent = account.tenantName || '-';
    document.getElementById('xaas-master-account').textContent = account.masterAccount || '-';
    document.getElementById('xaas-master-contact').textContent = account.masterContact || '-';
    detail.style.display = 'block';
}

function showCloudAccountSelection(accounts) {
    var item = document.getElementById('xaasCloudAccountItem');
    var nativeSelect = document.getElementById('xaas-cloud-account');
    var container = item ? item.querySelector('.custom-select') : null;
    var list = container ? container.querySelector('.custom-select-list') : null;
    if (!item || !nativeSelect || !list) return;
    
    // 更新原生select
    var optsHtml = '<option value="">请选择云图账号</option>';
    for (var i = 0; i < accounts.length; i++) {
        optsHtml += '<option value="' + accounts[i].phone + '" data-tenant-id="' + (accounts[i].tenantId||'') + '" data-tenant-name="' + (accounts[i].tenantName||'') + '" data-master-account="' + (accounts[i].masterAccount||'') + '" data-master-contact="' + (accounts[i].masterContact||'') + '">' + accounts[i].phone + '（' + accounts[i].realName + '）</option>';
    }
    nativeSelect.innerHTML = optsHtml;
    
    // 更新自定义下拉UI
    var valueSpan = item.querySelector('.custom-select-trigger .custom-select-value');
    if (valueSpan) { valueSpan.textContent = '请选择云图账号'; valueSpan.classList.remove('has-value'); }
    var lisHtml = '<li class="custom-select-option selected" data-value="">请选择云图账号</li>';
    for (var j = 0; j < accounts.length; j++) {
        var display = accounts[j].phone + '（' + accounts[j].realName + '）';
        lisHtml += '<li class="custom-select-option" data-value="' + accounts[j].phone + '" data-tenant-id="' + (accounts[j].tenantId||'') + '" data-tenant-name="' + (accounts[j].tenantName||'') + '" data-master-account="' + (accounts[j].masterAccount||'') + '" data-master-contact="' + (accounts[j].masterContact||'') + '">' + display + '</li>';
    }
    list.innerHTML = lisHtml;
    // 绑定新选项点击
    var options = list.querySelectorAll('.custom-select-option');
    options.forEach(function(option) {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            if (this.classList.contains('disabled') || this.getAttribute('aria-disabled') === 'true') return;
            options.forEach(function(opt) { opt.classList.remove('selected'); });
            this.classList.add('selected');
            if (valueSpan) {
                valueSpan.textContent = this.textContent;
                if (this.dataset.value) valueSpan.classList.add('has-value'); else valueSpan.classList.remove('has-value');
            }
            if (nativeSelect) {
                nativeSelect.value = this.dataset.value;
                nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
            container.classList.remove('open');
        });
    });
    item.classList.add('show');
}
```

- [ ] **步骤 5：修改云图账号 change 事件处理**

**位置：** 行 3595-3603

替换为：
```js
var xaasCloudAccountSelect = document.getElementById('xaas-cloud-account');
if (xaasCloudAccountSelect) {
    xaasCloudAccountSelect.addEventListener('change', function() {
        var selectedOption = this.options[this.selectedIndex];
        var displayText = selectedOption ? selectedOption.text : '';
        var trigger = document.querySelector('#xaasCloudAccountItem .custom-select-trigger .custom-select-value');
        if (trigger) trigger.textContent = displayText || '请选择云图账号';
        
        // 填充云图账号详情
        if (selectedOption && selectedOption.value) {
            var account = {
                tenantId: selectedOption.dataset.tenantId || '',
                tenantName: selectedOption.dataset.tenantName || '',
                masterAccount: selectedOption.dataset.masterAccount || '',
                masterContact: selectedOption.dataset.masterContact || '',
                phone: selectedOption.value,
                realName: selectedOption.text.split('（')[1] ? selectedOption.text.split('（')[1].replace('）', '') : ''
            };
            fillCloudAccountInfo(account);
            
            // 反查主数据，锁定客户
            var cid = findCustomerIdByPhone(account.phone);
            resetXaasSearchState();
            if (cid) {
                var matchedCustomers = resolveCustomersByMcodes([cid]);
                if (matchedCustomers.length > 0) {
                    var c = matchedCustomers[0];
                    setXaasCustomer(c.name, c.id, c.type, c.sales, true);
                } else {
                    setXaasCustomer('', '', '');
                }
            } else {
                setXaasCustomer('', '', '');
            }
        } else {
            hideCloudAccountFields();
        }
    });
}
```

---

### 任务 2：UI 改造 - 云图账号详情字段 + 字段顺序 + 删除所属区域

**文件：**
- 修改：`测试设备授权平台.html`

- [ ] **步骤 1：在云图账号下拉下方添加详情字段 HTML**

**位置：** 行 1709-1711（`#xaasCloudAccountItem` 的 `</div>` 闭合前）

在 `#xaasCloudAccountItem` 的 `.layui-input-block` 中，下拉组件下方新增：
```html
<div class="cloud-account-detail" id="xaasCloudAccountDetail" style="display:none; margin-top:12px; background:#f8f9ff; border-radius:8px; padding:12px 14px;">
    <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px 24px;">
        <div class="grid-field"><span class="gf-label" style="width:100px;">租户 ID</span><span class="gf-val" id="xaas-tenant-id" style="color:#333;font-weight:500;">-</span></div>
        <div class="grid-field"><span class="gf-label" style="width:100px;">租户名</span><span class="gf-val" id="xaas-tenant-name" style="color:#333;font-weight:500;">-</span></div>
        <div class="grid-field"><span class="gf-label" style="width:100px;">主账号</span><span class="gf-val" id="xaas-master-account" style="color:#333;font-weight:500;">-</span></div>
        <div class="grid-field"><span class="gf-label" style="width:100px;">主账号联系人</span><span class="gf-val" id="xaas-master-contact" style="color:#333;font-weight:500;">-</span></div>
    </div>
</div>
```

- [ ] **步骤 2：调整字段顺序 - 移动云图账号到客户名称之前**

将 `#xaasCloudAccountItem` 的整块 DOM（行 1693-1711）从客户名称字段之后（当前在行 1693）移动到客户名称字段之前（移到行 1666 的 `<div class="layui-form-item">` 客户名称之前）。

操作：剪切行 1693-1711 的完整块，粘贴到行 1664（客户联系人邮箱字段的 `</div>` 闭合后）和行 1666（客户名称字段的 `<div class="layui-form-item">` 之前）之间。

- [ ] **步骤 3：删除所属区域字段**

删除 `xaas-region` 相关整块 DOM（行 1776-1817），包含 label、tooltip、自定义下拉组件。

- [ ] **步骤 4：移除 JS 中 xaas-region 的校验引用**

搜索并移除 JS 中所有 `xaas-region` 的引用（校验函数中如果有则移除，约行 3820-3900 区域）。

搜索：`xaas-region`，检查是否有校验或重置逻辑并移除。

- [ ] **步骤 5：添加 cloud-account-detail 样式**

在 CSS 区域（约行 220 附近）为云图账号详情添加样式：
```css
.cloud-account-detail { border: 1px solid #e5eeff; }
.cloud-account-detail .grid-field { display: flex; align-items: center; padding: 4px 0; gap: 8px; }
.cloud-account-detail .gf-label { font-size: 13px; color: #666; width: 80px; flex-shrink: 0; }
.cloud-account-detail .gf-val { font-size: 13px; color: #333; font-weight: 500; }
```

---

### 任务 3：SASE-SWG 去除每分支带宽字段

**文件：**
- 修改：`测试设备授权平台.html`

- [ ] **步骤 1：移除 HTML 中的每分支带宽行**

删除 `#swg-bw-row` 整块（行 2064-2068）：
```html
<div class="spec-field-row" id="swg-bw-row" style="display:none;">
    <label>每分支带宽</label>
    <input type="number" id="swg-bw" value="100" min="1">
    <span class="spec-unit">M</span>
</div>
```

- [ ] **步骤 2：移除 xaasSpecValues 和 xaasDefaultSpecValues 中的 bandwidth**

在 `xaasSpecValues`（行 2466）中：
```js
'SASE-SWG': { swgType: '用户版', userCount: 50, branchCount: 3 },
```
在 `xaasDefaultSpecValues`（行 2476）中同理。

- [ ] **步骤 3：移除重置逻辑和绑定**

在 resetAllXaas 函数中（行 2969-2972）移除 `swg-bw`：
```js
['ngdr-pc','ngdr-server','saes-pc','saes-server','xdla-users','ztna-users','swg-users','swg-branch','mail-count','ga-bw'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = el.id === 'mail-count' ? 10000 : (el.id === 'ga-bw' ? 5 : (el.id === 'swg-branch' ? 3 : 50));
});
```

在 `xaasDefaultSpecValues['SASE-SWG']` 中也移除 `bandwidth`。

- [ ] **步骤 4：移除 bindInlineSpecInput 绑定**

删除行 3498：
```js
bindInlineSpecInput('swg-bw', 'SASE-SWG', 'bandwidth');
```

- [ ] **步骤 5：移除 collectXaasSpecs 中的带宽读取**

在 collectXaasSpecs 函数中（行 3097-3100）移除：
```js
current.bandwidth = numberValue('swg-bw', 100);
```

- [ ] **步骤 6：移除 renderSpecFields 中的带宽**

在 renderSpecFields 函数中（行 3202-3205）移除带宽行：
```js
html += '<div class="spec-field" id="spec-swg-bw-field"' + (v.swgType==='用户版'?' style="display:none"':'') + '><label>每分支带宽(M)</label><input type="number" id="spec-swg-bw" value="' + v.bandwidth + '" min="' + (baseline ? baseline.bandwidth : 1) + '"></div>';
```

- [ ] **步骤 7：移除弹窗确认回写中的带宽**

在 specModal 确认回调中（行 3253-3257）移除：
```js
nextValues.bandwidth = parseInt(document.getElementById('spec-swg-bw').value) || 100;
```

- [ ] **步骤 8：移除 SASE-SWG 验证中的带宽**

在 validateXaasSpecs 函数中（行 3072）修改：
```js
if (product === 'SASE-SWG') return ensureAtLeast('userCount', '授权用户数') && ensureAtLeast('branchCount', '分支数');
```

- [ ] **步骤 9：移除 setNumberMin 中的带宽**

在 setSpecMinFromBaseline 函数中（行 3175-3178）移除：
```js
setNumberMin('swg-bw', baseline.bandwidth);
```

- [ ] **步骤 10：移除 SWG 类型切换时带宽行逻辑**

在 SWG inline select change 事件中（行 3505-3510）移除 `bwRow` 隐藏/显示逻辑。

- [ ] **步骤 11：移除 swg-bw 重置初始值**

在 resetXaasForm 函数中（行 2971）移除 `swg-bw` 相关三元判断。

---

### 任务 4：SASE-GA 去除修改规格按钮 + 二次申请置灰

**文件：**
- 修改：`测试设备授权平台.html`

- [ ] **步骤 1：从 SASE-GA 产品项删除修改规格按钮**

在行 2082-2085 中，删除 `.xaas-product-right` 内的：
```html
<button type="button" class="xaas-spec-btn">修改规格</button>
```
保留其他元素。

- [ ] **步骤 2：删除 ga-inline-spec 展开区**

删除行 2091-2117 整块 `#ga-inline-spec`。

- [ ] **步骤 3：从 inlineSpecProducts 移除 SASE-GA**

在行 2480 中修改：
```js
var inlineSpecProducts = ['NGDR', 'SaaS-aES', 'SASE-SWG'];
```

- [ ] **步骤 4：从 inline spec ID 映射移除 SASE-GA**

在行 3415-3420 中移除：
```js
'ga-inline-spec': 'SASE-GA'
```

- [ ] **步骤 5：从 bindInlineSpecInput 移除 GA**

删除行 3500：
```js
bindInlineSpecInput('ga-bw', 'SASE-GA', 'bandwidth');
```

- [ ] **步骤 6：从 spec 按钮点击事件中移除 SASE-GA**

在行 3299-3300 的 `else if` 链中移除：
```js
else if (product === 'SASE-GA') inlineSpecId = 'ga-inline-spec';
```

- [ ] **步骤 7：在 refreshXaasProductItem 中处理 GA 置灰**

在 refreshXaasProductItem 函数中（约行 2754），增加 SASE-GA 特殊逻辑：
```js
// SASE-GA 特殊处理：移除修改规格按钮
if (product === 'SASE-GA') {
    if (specBtn) specBtn.style.display = 'none';
    var gaStatus = getXaasTrialStatus(product);
    if (gaStatus === 'previous' || gaStatus === 'active') {
        if (cb) { cb.disabled = true; cb.checked = false; }
        item.classList.add('disabled');
        // 确保已购买的 GA 提示
        var gaHint = item.querySelector('.xaas-product-trial-hint');
        if (gaHint) {
            gaHint.classList.add('show');
            var textSpan = gaHint.querySelector('span:last-child');
            if (textSpan) textSpan.textContent = 'GA只支持新用户使用';
        } else {
            // 如果没有 trial-hint，创建一个
            var hintDiv = document.createElement('div');
            hintDiv.className = 'xaas-product-trial-hint show';
            hintDiv.innerHTML = '<span class="trial-icon">⚠</span><span>GA只支持新用户使用</span>';
            item.appendChild(hintDiv);
        }
    }
}
```

- [ ] **步骤 8：从重置逻辑移除 GA**

在 `resetXaasForm`（行 2969）中移除 `ga-bw`：
```js
['ngdr-pc','ngdr-server','saes-pc','saes-server','xdla-users','ztna-users','swg-users','swg-branch','mail-count'].forEach(function(id) { ... });
```
移除 `setCustomSelectValue('ga-bw', '5');`（行 2973）。

- [ ] **步骤 9：从 xaasSpecValues 中移除 GA**

在 `xaasSpecValues`（行 2467）中移除：
```js
'SASE-GA': { bandwidth: 5 },
```
在 `xaasDefaultSpecValues`（行 2477）中同理移除。

- [ ] **步骤 10：从 validateXaasSpecs 移除 GA 校验**

在 validateXaasSpecs 函数中（行 3074）移除：
```js
if (product === 'SASE-GA') return ensureAtLeast('bandwidth', '带宽');
```

- [ ] **步骤 11：从 collectXaasSpecs 移除 GA**

移除行 3103-3104：
```js
} else if (product === 'SASE-GA') {
    current.bandwidth = numberValue('ga-bw', 5);
```

- [ ] **步骤 12：从 buildSpecModalHtml 移除 GA 弹窗**

移除行 3208-3209 的 GA 分支。

- [ ] **步骤 13：从 specModal 确认中移除 GA**

移除行 3260-3261 的 GA 分支。

- [ ] **步骤 14：从 buildDescText 移除 GA**

移除行 3283：
```js
if (product === 'SASE-GA') return '有效期15天，带宽' + v.bandwidth + 'M';
```

- [ ] **步骤 15：从 clearXaasEditSpecGuards 移除 GA**

移除行 3154：
```js
clearCustomSelectDisabledOptions('ga-bw');
```

- [ ] **步骤 16：从 setSpecMinFromBaseline 移除 GA**

移除行 3181-3182。

- [ ] **步骤 17：从 renderSpecFields 移除 GA**

移除行 3208-3209 的 GA 分支。

---

### 任务 5：验证

**文件：**
- 修改：`测试设备授权平台.html`

- [ ] **步骤 1：全局搜索残留引用**

搜索 `swg-bw`、`bandwidth`、`ga-bw`、`SASE-GA`、`xaas-region`，确认没有遗漏的引用。

- [ ] **步骤 2：手动测试场景验证**

在浏览器中打开 HTML 文件，逐一验证：
1. 输入手机号 13800138000（1个云图账号）→ 云图账号隐藏，客户名称自动锁定，详情字段隐藏
2. 输入手机号 13600000000（多个云图账号）→ 显示云图账号下拉，选一个后显示租户信息，客户名称锁定
3. 输入手机号 13500000000（无云图账号）→ 客户名称可自由搜索
4. 确认"所属区域"字段已消失
5. 勾选 SASE-SWG → 展开规格区，确认无"每分支带宽"行
6. 勾选 SASE-GA → 确认无"修改规格"按钮
7. 选择已使用过 GA 的客户（如 C100002）→ SASE-GA 置灰，显示"GA只支持新用户使用"
