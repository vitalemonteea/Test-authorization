#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Patch 测试设备授权平台V2.html with:
1. solutionBorrowGlobalCloud and solutionLocalGlobalCloud spans.
2. Complete JavaScript implementation for:
   - Dynamic biz fields free configuration engine in solutionConfigModal
   - Cloud tenant ID as customer global identity
   - Industry selection alignment with XaaS
   - At-least-one pair auto-on guard (e.g. STA/AF, AF/aES)
"""

from pathlib import Path
import re

HTML_PATH = Path(__file__).resolve().parents[1] / "测试设备授权平台V2.html"

def patch():
    content = HTML_PATH.read_text(encoding="utf-8")
    
    # 1. Add global cloud badges if not present
    if 'id="solutionBorrowGlobalCloud"' not in content:
        content = content.replace(
            '<span class="customer-type-badge" id="solutionBorrowCustomerType" style="display:none;"></span>',
            '<span class="customer-type-badge" id="solutionBorrowCustomerType" style="display:none;"></span>\n                                                        <span class="customer-global-cloud-badge" id="solutionBorrowGlobalCloud" style="display:none;margin-left:6px;"></span>'
        )
    if 'id="solutionLocalGlobalCloud"' not in content:
        content = content.replace(
            '<span class="customer-type-badge" id="solutionLocalCustomerType" style="display:none;"></span>',
            '<span class="customer-type-badge" id="solutionLocalCustomerType" style="display:none;"></span>\n                                                        <span class="customer-global-cloud-badge" id="solutionLocalGlobalCloud" style="display:none;margin-left:6px;"></span>'
        )

    # 2. Locate the solution script block
    # Start anchor: var defaultBizTemplateFields = {
    # End anchor: initSolutionTab();
    
    js_start = content.find("        var defaultBizTemplateFields = {")
    if js_start == -1:
        # Maybe it's earlier or not found, search for productCatalog
        print("Searching from productCatalog...")
        js_start = content.find("        var productCatalog = [")
    
    assert js_start != -1, "Could not find start anchor for solution script!"
    
    js_end_marker = "        initSolutionTab();\n    }());"
    js_end = content.find(js_end_marker)
    assert js_end != -1, "Could not find end anchor for solution script!"
    js_end += len(js_end_marker)

    new_js = '''        var defaultBizTemplateFields = {
            none: [],
            dsoc: [
                { name: '测试主打场景', type: 'select', options: ['原有NDR升级场景（我司SIP/友商NDR）', '新建安全运营场景', 'SOC替换场景（含SOC共存）', '多分支统一管理场景'], required: true },
                { name: '测试驱动力', type: 'checkbox', options: ['各类安全设备告警量大且误报多，威胁运营效率低', '现有威胁运营平台不达预期，想替换', '重大安全问题，需要加强安全建设', '被监管单位通报，需要加强安全建设', '护网重保缺少统一值守平台，值守难度较大', '客户有创新及体现政绩的诉求'], required: true },
                { name: '客户预期效果', type: 'checkbox', options: ['全流量检测:深信服自有产品及三方产品统一接入', '聚合降噪:海量告警基于GPT聚合成少量精准事件', '告警研判:安全GPT全量研判告警及事件', '智能对抗:外联或外部攻击实现自动化对抗', '威胁运营成果展示:报表/大屏直观展示成果'], required: true },
                { name: '组件接入说明', type: 'textarea', options: [], required: true },
                { name: '测试需求调研文档', type: 'file', options: [], required: true },
                { name: '转销计划说明', type: 'textarea', options: [], required: true }
            ],
            accel: [
                { name: '客户需求', type: 'textarea', options: [], required: true },
                { name: '项目规模', type: 'textarea', options: [], required: true },
                { name: '竞争对手', type: 'textarea', options: [], required: true },
                { name: '客户所在省份/国家', type: 'text', options: [], required: true },
                { name: '备注', type: 'textarea', options: [], required: false }
            ],
            network: [
                { name: '客户需求', type: 'textarea', options: [], required: true },
                { name: '项目规模', type: 'textarea', options: [], required: true },
                { name: '竞争对手', type: 'textarea', options: [], required: true }
            ],
            mss: [
                { name: '所属行业', type: 'text', options: [], required: true },
                { name: '客户联系人', type: 'text', options: [], required: true },
                { name: '客户组件情况', type: 'textarea', options: [], required: true },
                { name: '本次测试PK范围', type: 'textarea', options: [], required: true }
            ],
            dsp: [
                { name: '关注价值', type: 'checkbox', options: ['数据风险发现', '静态分类分级', '应用/API资产', '对接第三方组件-分级管控', '数据流转可视'], required: true },
                { name: '风险场景', type: 'checkbox', options: ['员工访问互联网应用', '第三方共享', '内部应用到应用', '数据运维开发场景', '其他场景'], required: true },
                { name: 'PK友商', type: 'select', options: ['奇安信', '安恒', '绿盟', '安华金和', '原点安全', '美创', '暂无友商竞争', '其他友商'], required: true },
                { name: '能否远程', type: 'select', options: ['能-长期远程', '能-临时远程', '不能'], required: true },
                { name: '预算', type: 'text', options: [], required: false },
                { name: '客户交流纪要', type: 'file', options: [], required: true }
            ],
            custom: [
                { name: '业务测试场景', type: 'textarea', options: [], required: true }
            ]
        };
        var configs = [
            { code: 'SOL-CLOUD-001', name: '企业云一体化方案', productLines: ['HCI', 'AC', 'NGAF', 'AD', 'WOC', 'SaaS-XDR'], status: 'enabled', authDays: 90, bizTemplate: 'none', bizFields: [], updatedAt: '2026-08-06 09:30' },
            { code: 'SOL-SEC-002', name: '安全态势感知方案', productLines: ['XDR', 'NGAF', 'WAF'], status: 'enabled', authDays: 60, bizTemplate: 'none', bizFields: [], updatedAt: '2026-08-05 16:20' },
            { code: 'SOL-XAAS-004', name: '云网安全运营方案', productLines: ['SASE-GA', 'SaaS-XDR'], status: 'enabled', authDays: 30, bizTemplate: 'none', bizFields: [], updatedAt: '2026-08-06 10:30' },
            { code: 'SOL-GLOBAL-005', name: '全球组网方案', productLines: ['AF', 'SASE-GA', 'SASE-SWG'], status: 'enabled', authDays: 30, bizTemplate: 'network', bizFields: (defaultBizTemplateFields.network || []), updatedAt: '2026-08-26 14:30' },
            { code: 'SOL-ACCEL-006', name: '全球加速方案-SaaS版', productLines: ['SASE-ZTNA', 'SASE-GA'], status: 'enabled', authDays: 30, bizTemplate: 'accel', bizFields: (defaultBizTemplateFields.accel || []), updatedAt: '2026-09-02 10:00' },
            { code: 'SOL-ACCEL-007', name: '全球加速方案-本地版', productLines: ['aTrust', 'SASE-GA'], status: 'enabled', authDays: 30, bizTemplate: 'accel', bizFields: (defaultBizTemplateFields.accel || []), updatedAt: '2026-09-02 10:10' },
            { code: 'SOL-DSOC-008', name: '分布式安全运营方案', productLines: ['XDR', 'STA', 'AF', 'aES'], status: 'enabled', authDays: 30, bizTemplate: 'dsoc', bizFields: (defaultBizTemplateFields.dsoc || []), updatedAt: '2026-09-02 11:00' },
            { code: 'SOL-LEGACY-003', name: '旧版云安全方案', productLines: ['HCI', 'WAF'], status: 'disabled', authDays: 15, bizTemplate: 'none', bizFields: [], updatedAt: '2026-07-28 10:12' }
        ];
        var borrowOrders = {
            'BOR-202608-001': { number: 'BOR-202608-001', approvalStatus: '审批通过', returned: false, revoked: false, applicant: '李晓', customer: '华东智造集团有限公司', solutionCode: 'SOL-CLOUD-001', solution: '企业云一体化方案', productLines: ['HCI', 'AC', 'NGAF', 'AD', 'WOC', 'SaaS-XDR'], devices: { HCI: 'GW-HCI-208', AC: 'GW-AC-512', NGAF: 'GW-NGAF-318', AD: 'GW-AD-209', WOC: 'GW-WOC-115' }, startDate: '2026-08-06', endDate: '2026-11-04', approvalInfo: '资产系统审批通过（Mock）', cloud: { account: 'huadong-admin', tenantId: 'YT-10010101' } },
            'BOR-202608-002': { number: 'BOR-202608-002', approvalStatus: '审批中', returned: false, revoked: false },
            'BOR-202608-005': { number: 'BOR-202608-005', approvalStatus: '审批通过', returned: false, revoked: false, applicant: '陈卓', customer: '星海智联科技有限公司', solutionCode: 'SOL-XAAS-004', solution: '云网安全运营方案', productLines: ['SASE-GA', 'SaaS-XDR'], devices: {}, startDate: '2026-08-08', endDate: '2026-08-23', approvalInfo: '资产系统审批通过（Mock）', cloud: { account: 'xinghai-admin', tenantId: 'YT-10010688' } },
            'BOR-202608-006': { number: 'BOR-202608-006', approvalStatus: '审批通过', returned: false, revoked: false, applicant: '韩磊', customer: '环球致远贸易有限公司', solutionCode: 'SOL-GLOBAL-005', solution: '全球组网方案', productLines: ['AF', 'SASE-GA', 'SASE-SWG'], devices: { AF: 'GW-AF-930' }, startDate: '2026-08-20', endDate: '2026-11-18', approvalInfo: '资产系统审批通过（Mock）', cloud: { account: 'global-admin', tenantId: 'YT-10010777' } },
            'BOR-202608-007': { number: 'BOR-202608-007', approvalStatus: '审批通过', returned: false, revoked: false, applicant: '韩梅', customer: '环宇速联科技有限公司', solutionCode: 'SOL-ACCEL-006', solution: '全球加速方案-SaaS版', productLines: ['SASE-ZTNA', 'SASE-GA'], devices: {}, startDate: '2026-08-25', endDate: '2026-09-24', approvalInfo: '资产系统审批通过（Mock）', cloud: { account: 'oceanlink-admin', tenantId: 'YT-10010888' } },
            'BOR-202608-008': { number: 'BOR-202608-008', approvalStatus: '审批通过', returned: false, revoked: false, applicant: '秦峰', customer: '明澈水务集团有限公司', solutionCode: 'SOL-DSOC-008', solution: '分布式安全运营方案', productLines: ['XDR', 'STA', 'AF', 'aES'], devices: { AF: 'GW-AF-771', STA: 'GW-STA-352', aES: 'GW-aES-483' }, startDate: '2026-08-28', endDate: '2026-09-27', approvalInfo: '资产系统审批通过（Mock）', cloud: { account: 'mingche-admin', tenantId: 'YT-10010999' } },
            'BOR-202608-003': { number: 'BOR-202608-003', approvalStatus: '审批通过', returned: true, revoked: false },
            'BOR-202608-004': { number: 'BOR-202608-004', approvalStatus: '审批通过', returned: false, revoked: true },
            'BOR-202608-ERR': { number: 'BOR-202608-ERR', error: true }
        };
        var application = { source: 'borrow', solution: null, lines: [], params: {}, biz: {}, accelBiz: {}, networkBiz: {}, applicant: '', customer: '', cloud: null, borrow: null, authDays: 0, authEndDate: '', activeLine: '', status: 'draft', recordId: '' };
        var editingConfigCode = '';
        function getCurrentApplicant() {
            var userNameEl = document.querySelector('.header-user .user-name');
            return (userNameEl ? userNameEl.textContent.trim() : '钱金城94903');
        }
        function formatDateOffset(days) {
            var d = new Date();
            d.setDate(d.getDate() + Number(days || 0));
            return d.toISOString().split('T')[0];
        }
        var solutionBorrowCustomer = null;
        var solutionLocalCustomer = null;
        var solutionBorrowCustomers = [
            { id: 'C100101', name: '华东智造集团有限公司', type: 'KA', sales: '周青', orders: ['BOR-202608-001'], cloud: { account: 'huadong-admin', tenantId: 'YT-10010101' } },
            { id: 'C100102', name: '北辰智慧能源有限公司', type: 'normal', sales: '赵凯', orders: ['BOR-202608-002'] },
            { id: 'C100103', name: '苏州新零售集团有限公司', type: 'KA', sales: '林舟', orders: ['BOR-202608-003'] },
            { id: 'C100104', name: '西南智慧物流有限公司', type: 'normal', sales: '陈颖', orders: ['BOR-202608-004'] },
            { id: 'C100105', name: '星澜数字服务有限公司', type: 'normal', sales: '沈思', orders: ['BOR-202608-ERR'] },
            { id: 'C100106', name: '星海智联科技有限公司', type: 'KA', sales: '许岚', orders: ['BOR-202608-005'], cloud: { account: 'xinghai-admin', tenantId: 'YT-10010688' } },
            { id: 'C100107', name: '环球致远贸易有限公司', type: 'KA', sales: '宋雨', orders: ['BOR-202608-006'], cloud: { account: 'global-admin', tenantId: 'YT-10010777' } },
            { id: 'C100108', name: '环宇速联科技有限公司', type: 'KA', sales: '宋雨', orders: ['BOR-202608-007'], cloud: { account: 'oceanlink-admin', tenantId: 'YT-10010888' } },
            { id: 'C100109', name: '明澈水务集团有限公司', type: 'KA', sales: '许岚', orders: ['BOR-202608-008'], cloud: { account: 'mingche-admin', tenantId: 'YT-10010999' } }
        ];
        // 分布式安全运营方案专用业务申请字段默认值（Mock 预填）
        var solutionBizDefaults = {
            mainScenario: '新建安全运营场景',
            testDrivers: ['各类安全设备告警量大且误报多，威胁运营效率低，各分支无法统一监测'],
            expectedEffects: ['聚合降噪：海量告警基于GPT能力聚合成少量精准事件，有效降低误报，识别关键攻击'],
            componentNotes: '已部署 SIP 与深信服 AF，XDR 平台对接三方日志组件统一接入',
            researchDoc: '',
            resalePlan: '测试通过后转销，计划 Q4 完成采购流程'
        };
        // 全球加速方案专用业务申请字段默认值
        var solutionAccelBizDefaults = {
            customerNeed: '验证海外办公访问国内核心业务系统的加速与安全接入效果',
            projectScale: '覆盖 3 个海外区域，约 800 名办公用户',
            competitor: '传统国际专线方案',
            region: '新加坡',
            remark: ''
        };
        // 全球组网方案业务申请字段默认值（Mock 预填）
        var solutionNetworkBizDefaults = {
            customerNeed: '验证海外办公与国内核心业务访问质量',
            projectScale: '覆盖 3 个海外区域，约 800 名办公用户',
            competitor: '传统国际专线方案'
        };

        function id(name) { return document.getElementById(name); }
        function escapeHtml(value) {
            return String(value == null ? '' : value).replace(/[&<>'"]/g, function(char) {
                return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
            });
        }
        function enabledConfigs() { return configs.filter(function(item) { return item.status === 'enabled'; }); }
        function findConfig(code) { return configs.find(function(item) { return item.code === code; }); }
        function setStatus(status) {
            application.status = status;
            var current = id('solutionApplicationStatus');
            current.className = 'solution-status ' + status;
            current.textContent = { draft: '草稿', pending: '待 W3 审批', rejected: 'W3 审批已驳回', failed: '整单失败', success: '已授权' }[status];
        }
        function openSolutionConfigDrawer() {
            var menu = document.getElementById('settingsDropdownMenu');
            if (menu) menu.classList.remove('show');
            var drawer = id('solutionConfigDrawer');
            drawer.hidden = false;
            drawer.setAttribute('aria-hidden', 'false');
            renderConfigs();
        }
        function closeSolutionConfigDrawer() {
            var drawer = id('solutionConfigDrawer');
            drawer.hidden = true;
            drawer.setAttribute('aria-hidden', 'true');
        }

        var tplLabels = {
            none: '无业务信息',
            dsoc: '分布式安全运营',
            accel: '全球加速',
            network: '全球组网',
            mss: '安全托管服务',
            dsp: '数据安全方案',
            custom: '自定义动态配置'
        };

        function renderConfigs() {
            var keyword = id('solutionConfigSearch').value.trim().toLowerCase();
            var filter = id('solutionConfigStatus').value;
            var rows = configs.filter(function(item) {
                return (!keyword || item.code.toLowerCase().indexOf(keyword) !== -1 || item.name.toLowerCase().indexOf(keyword) !== -1) && (filter === 'all' || item.status === filter);
            });
            id('solutionConfigRows').innerHTML = rows.length ? rows.map(function(item) {
                var tplName = tplLabels[item.bizTemplate] || (item.bizTemplate ? item.bizTemplate : '无业务信息');
                var count = (item.bizFields && item.bizFields.length) ? item.bizFields.length : ((defaultBizTemplateFields[item.bizTemplate] || []).length);
                var countStr = count > 0 ? (' (' + count + '项)') : '';
                var bizBadge = '<td><span class="solution-biz-badge" style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:#f1f5f9;color:#334155;border:1px solid #e2e8f0;">' + escapeHtml(tplName + countStr) + '</span></td>';
                return '<tr data-solution-config-code="' + item.code + '">' +
                    '<td><strong>' + item.code + '</strong></td>' +
                    '<td>' + escapeHtml(item.name) + '</td>' +
                    '<td><div class="solution-chip-list">' + item.productLines.map(function(line) { return '<span class="solution-chip">' + line + '</span>'; }).join('') + '</div></td>' +
                    bizBadge +
                    '<td>' + (item.authDays ? escapeHtml(String(item.authDays)) + '天' : '—') + '</td>' +
                    '<td><span class="solution-status ' + (item.status === 'enabled' ? 'success' : 'failed') + '">' + (item.status === 'enabled' ? '启用' : '停用') + '</span></td>' +
                    '<td>' + item.updatedAt + '</td>' +
                    '<td><button type="button" class="solution-table-action" data-solution-config-action="edit">编辑</button><button type="button" class="solution-table-action" data-solution-config-action="toggle">' + (item.status === 'enabled' ? '停用' : '启用') + '</button></td>' +
                    '</tr>';
            }).join('') : '<tr><td colspan="8" style="text-align:center;color:#778194">没有符合条件的配置</td></tr>';
            var active = enabledConfigs();
            id('solutionAssetReadSummary').textContent = '资产系统可读取 ' + active.length + ' 个启用配置';
            id('solutionLocalConfig').innerHTML = '<option value="">请选择启用方案</option>' + active.map(function(item) { return '<option value="' + item.code + '">' + item.code + ' | ' + escapeHtml(item.name) + '</option>'; }).join('');
        }

        function renderModalBizFields(fields) {
            var container = id('solutionConfigBizFieldsList');
            if (!container) return;
            if (!fields || !fields.length) {
                container.innerHTML = '<div style="font-size:12px;color:#94a3b8;text-align:center;padding:12px;">该模板无需业务申请信息，或可点击上方“+ 添加业务字段”自由新增。</div>';
                return;
            }
            var typeOptions = [
                { value: 'text', label: '单行文本' },
                { value: 'textarea', label: '多行文本' },
                { value: 'select', label: '单选下拉' },
                { value: 'checkbox', label: '多选复选框' },
                { value: 'file', label: '附件上传' },
                { value: 'number', label: '数字' }
            ];
            container.innerHTML = fields.map(function(f, idx) {
                var isChoice = f.type === 'select' || f.type === 'checkbox';
                var optVal = Array.isArray(f.options) ? f.options.join(',') : (f.options || '');
                var typeSelectHtml = '<select class="solution-select solution-biz-field-type" style="width:105px;height:28px;font-size:12px;padding:2px 6px;">' +
                    typeOptions.map(function(t) { return '<option value="' + t.value + '"' + (f.type === t.value ? ' selected' : '') + '>' + t.label + '</option>'; }).join('') +
                    '</select>';
                return '<div class="solution-biz-field-row" style="display:flex;align-items:center;gap:6px;background:#fff;padding:6px;border:1px solid #e2e8f0;border-radius:4px;" data-biz-field-idx="' + idx + '">' +
                    '<input class="solution-input solution-biz-field-name" style="flex:1.2;height:28px;font-size:12px;padding:2px 8px;" placeholder="字段名称，如：PK友商" value="' + escapeHtml(f.name || '') + '">' +
                    typeSelectHtml +
                    '<input class="solution-input solution-biz-field-options" style="flex:1.5;height:28px;font-size:12px;padding:2px 8px;' + (isChoice ? '' : 'display:none;') + '" placeholder="选项用逗号隔开，如：友商A,友商B" value="' + escapeHtml(optVal) + '">' +
                    '<label style="display:flex;align-items:center;gap:3px;font-size:11px;color:#475569;margin-bottom:0;cursor:pointer;white-space:nowrap;"><input type="checkbox" class="solution-biz-field-req"' + (f.required ? ' checked' : '') + '>必填</label>' +
                    '<button type="button" class="solution-table-action solution-biz-field-del" style="color:#ef4444;height:24px;line-height:22px;padding:0 6px;font-size:11px;">删除</button>' +
                    '</div>';
            }).join('');
        }

        function readModalBizFields() {
            var container = id('solutionConfigBizFieldsList');
            if (!container) return [];
            var rows = container.querySelectorAll('.solution-biz-field-row');
            var list = [];
            rows.forEach(function(row) {
                var nameInput = row.querySelector('.solution-biz-field-name');
                var typeSelect = row.querySelector('.solution-biz-field-type');
                var optInput = row.querySelector('.solution-biz-field-options');
                var reqCheck = row.querySelector('.solution-biz-field-req');
                var name = nameInput ? nameInput.value.trim() : '';
                var type = typeSelect ? typeSelect.value : 'text';
                var optStr = optInput ? optInput.value.trim() : '';
                var req = reqCheck ? reqCheck.checked : false;
                var options = [];
                if (type === 'select' || type === 'checkbox') {
                    options = optStr ? optStr.split(',').map(function(s) { return s.trim(); }).filter(Boolean) : [];
                }
                if (name) {
                    list.push({ name: name, type: type, options: options, required: req });
                }
            });
            return list;
        }

        function openConfigModal(code) {
            editingConfigCode = code || '';
            var item = code ? findConfig(code) : null;
            id('solutionConfigModalTitle').textContent = item ? '编辑解决方案' : '新增解决方案';
            id('solutionConfigCode').value = item ? item.code : '';
            id('solutionConfigCode').readOnly = !!item;
            id('solutionConfigName').value = item ? item.name : '';
            id('solutionConfigAuthDays').value = item ? (item.authDays || '') : '';
            var tpl = (item && item.bizTemplate) ? item.bizTemplate : 'none';
            if (id('solutionConfigBizTemplate')) id('solutionConfigBizTemplate').value = tpl;
            var currentFields = (item && item.bizFields && item.bizFields.length) ? item.bizFields : (defaultBizTemplateFields[tpl] || []);
            renderModalBizFields(JSON.parse(JSON.stringify(currentFields)));
            id('solutionConfigChecks').innerHTML = productCatalog.map(function(line) { return '<label><input type="checkbox" value="' + line + '"' + (item && item.productLines.indexOf(line) !== -1 ? ' checked' : '') + '><span>' + line + '</span></label>'; }).join('');
            id('solutionConfigError').textContent = '';
            id('solutionConfigModal').hidden = false;
            id('solutionConfigModal').setAttribute('aria-hidden', 'false');
        }
        function closeConfigModal() { id('solutionConfigModal').hidden = true; id('solutionConfigModal').setAttribute('aria-hidden', 'true'); }
        function saveConfig() {
            var code = id('solutionConfigCode').value.trim().toUpperCase();
            var name = id('solutionConfigName').value.trim();
            var authDays = Number(id('solutionConfigAuthDays').value);
            var lines = Array.prototype.slice.call(id('solutionConfigChecks').querySelectorAll('input:checked')).map(function(input) { return input.value; });
            var bizTemplate = id('solutionConfigBizTemplate') ? id('solutionConfigBizTemplate').value : 'none';
            var bizFields = readModalBizFields();
            var error = '';
            if (!code) error = '请填写方案编码。';
            else if (!name) error = '请填写方案名称。';
            else if (!authDays || authDays <= 0 || Math.floor(authDays) !== authDays) error = '请填写有效的授权天数（正整数）。';
            else if (!lines.length) error = '请至少选择一个产品线。';
            else if (!editingConfigCode && findConfig(code)) error = '方案编码已存在。';
            else if (configs.some(function(item) { return item.code !== editingConfigCode && item.name === name; })) error = '方案名称已存在。';
            if (error) { id('solutionConfigError').textContent = error; return; }
            if (editingConfigCode) {
                var existing = findConfig(editingConfigCode);
                existing.name = name;
                existing.authDays = authDays;
                existing.productLines = lines;
                existing.bizTemplate = bizTemplate;
                existing.bizFields = bizFields;
                existing.updatedAt = '2026-08-06 10:00';
            } else {
                configs.unshift({ code: code, name: name, productLines: lines, status: 'enabled', authDays: authDays, bizTemplate: bizTemplate, bizFields: bizFields, updatedAt: '2026-08-06 10:00' });
            }
            closeConfigModal();
            renderConfigs();
        }
        function toggleConfig(code) {
            var item = findConfig(code);
            item.status = item.status === 'enabled' ? 'disabled' : 'enabled';
            item.updatedAt = '2026-08-06 10:05';
            renderConfigs();
        }

        function resetApplication() {
            application.solution = null;
            application.lines = [];
            application.params = {};
            application.borrow = null;
            application.authDays = 0;
            application.authEndDate = '';
            application.activeLine = '';
            application.recordId = '';
            application.biz = {};
            application.accelBiz = {};
            application.networkBiz = {};
            setStatus('draft');
            id('solutionLockedScope').hidden = true;
            id('solutionBizSection').hidden = true;
            id('solutionAccelBizSection').hidden = true;
            id('solutionProductWorkspace').hidden = true;
            renderWorkflow();
        }
        function isXaasLine(line) { return line === 'XDR' || line === 'SASE-GA' || line === 'SASE-SWG' || line === 'SaaS-XDR' || line === 'SASE-ZTNA'; }
        // 分布式安全运营方案：XDR 走生产对齐授权模块卡，且整单附带业务申请信息模块
        function isDsocSolution() { return !!application.solution && application.solution.code === 'SOL-DSOC-008'; }
        // 全球加速方案（本地版/SaaS版）：业务字段统一放业务申请信息模块，产品面板不再展示
        function isAccelSolution() { return !!application.solution && (application.solution.code === 'SOL-ACCEL-006' || application.solution.code === 'SOL-ACCEL-007'); }
        // 全球组网方案：业务字段统一放业务申请信息模块，产品面板不再展示
        function isGlobalNetworkSolution() { return !!application.solution && application.solution.code === 'SOL-GLOBAL-005'; }
        function createParams(line, deviceId, endDate, versionOption) {
            var defaults = productDefaults[line] || { version: '', modules: [], spec: '' };
            var params = {
                version: defaults.version,
                deviceId: deviceId || '',
                modules: (defaults.modules || []).slice(),
                spec: defaults.spec,
                endDate: endDate || '2026-11-04'
            };
            if (line === 'SASE-GA') {
                return {
                    version: '',
                    endDate: endDate || '2026-08-23',
                    bandwidth: '5',
                    customerNeed: '验证海外办公与国内核心业务访问质量',
                    projectScale: '覆盖 3 个海外区域，约 800 名办公用户',
                    competitor: '传统国际专线方案'
                };
            }
            if (line === 'SASE-SWG') {
                return {
                    version: defaults.version,
                    endDate: endDate || '2026-08-23',
                    customerNeed: '验证海外办公人员上网安全防护与统一管控',
                    projectScale: '覆盖 5 个海外办公点，约 300 名办公用户',
                    competitor: 'Zscaler'
                };
            }
            if (line === 'SASE-ZTNA') {
                return {
                    version: defaults.version,
                    endDate: endDate || '2026-08-23',
                    userCount: defaults.userCount || '50',
                    customerNeed: '验证海外与移动办公人员零信任安全接入体验',
                    projectScale: '覆盖 4 个海外办公点，约 200 名移动办公用户',
                    competitor: 'Zscaler 私有接入'
                };
            }
            if (line === 'XDR' && isDsocSolution()) {
                var dsocVersion = versionOption || 'LOCAL-XDR2.0.45及以上版本（XDR+GPT）';
                if (dsocVersion === 'LOCAL-XDR2.0.12及以上版本（XDR+GPT）') {
                    return {
                        version: dsocVersion,
                        endDate: endDate || '2026-10-02',
                        modules: ['XDR平台软件', '辅助运营GPT', '智能值守GPT', '每天日志接入量上限', '流量检测GPT', '软件升级授权', '规则库更新授权', '高级漏洞管理', '第三方日志分析-SIEM', 'XDR性能扩容授权', '自有组件接入授权', '威胁情报服务', '安全事件深度挖掘XTH', '移动运营小助手', '物联网安全管控模块', 'SOAR', '自定义工单流程', '云安全中心', '知识库', '等保合规管理', '绩效考核'],
                        xdr_platform_count: '3',
                        xdr_platform_end: '2026-10-02',
                        xdr_ops_gpt_scene: '云上部署',
                        xdr_ops_gpt_end: '2026-10-02',
                        xdr_ops_gpt_enabled: '是',
                        xdr_duty_gpt_scene: '云上部署',
                        xdr_duty_gpt_cot: '匹配3节点XDR',
                        xdr_duty_gpt_end: '2026-10-02',
                        xdr_duty_gpt_enabled: '是',
                        xdr_daily_log_count: '1',
                        xdr_daily_log_end: '2026-10-02',
                        xdr_traffic_gpt_end: '2026-10-02',
                        xdr_traffic_gpt_enabled: '否',
                        xdr_software_upgrade: '2026-10-02',
                        xdr_rule_update: '2026-10-02',
                        xdr_vuln_mgmt: '2026-10-02',
                        xdr_siem: '2026-10-02',
                        xdr_perf_scale_count: '1',
                        xdr_perf_scale_end: '2026-10-02',
                        xdr_component_count: '10',
                        xdr_component_end: '2026-10-02',
                        xdr_threat_intel: '2026-10-02',
                        xdr_xth: '2026-10-02',
                        xdr_mobile_assistant: '2026-10-02',
                        xdr_iot_control: '2026-10-02',
                        xdr_soar: '2026-10-02',
                        xdr_custom_workflow: '2026-10-02',
                        xdr_cloud_center_version: '云环境接入(免费版)',
                        xdr_cloud_center_points: '1000',
                        xdr_cloud_center_end: '2026-10-02',
                        xdr_knowledge_base: '2026-10-02',
                        xdr_compliance: '2026-10-02',
                        xdr_performance: '2026-10-02'
                    };
                }
                return {
                    version: dsocVersion,
                    endDate: endDate || '2026-10-02',
                    modules: ['XDR平台软件', '辅助运营GPT', '智能值守GPT', '级联服务授权', 'XDR性能扩容授权(天日志量)', '流量检测GPT', '软件升级授权', '规则库更新授权', '高级漏洞管理', '第三方日志分析-SIEM', '自有组件接入授权', '威胁情报服务', '安全事件深度挖掘XTH', '移动运营小助手', '物联网安全管控模块', 'SOAR', '自定义工单流程', '云安全中心', '知识库', '等保合规管理', '绩效考核', '智能对抗服务'],
                    xdr_platform_count: '3',
                    xdr_platform_end: '2026-10-02',
                    xdr_ops_gpt_scene: '云上部署',
                    xdr_ops_gpt_end: '2026-10-02',
                    xdr_duty_gpt_scene: '云上部署',
                    xdr_duty_gpt_cot: '匹配3节点XDR',
                    xdr_duty_gpt_end: '2026-10-02',
                    xdr_cascade_count: '1',
                    xdr_cascade_end: '2026-10-02',
                    xdr_perf_log_count: '1',
                    xdr_perf_log_end: '2026-10-02',
                    xdr_traffic_gpt_end: '2026-10-02',
                    xdr_software_upgrade: '2026-10-02',
                    xdr_rule_update: '2026-10-02',
                    xdr_vuln_mgmt: '2026-10-02',
                    xdr_siem: '2026-10-02',
                    xdr_component_count: '10',
                    xdr_component_end: '2026-10-02',
                    xdr_threat_intel: '2026-10-02',
                    xdr_xth: '2026-10-02',
                    xdr_mobile_assistant: '2026-10-02',
                    xdr_iot_control: '2026-10-02',
                    xdr_soar: '2026-10-02',
                    xdr_custom_workflow: '2026-10-02',
                    xdr_cloud_center_version: '云环境接入(免费版)',
                    xdr_cloud_center_points: '1000',
                    xdr_cloud_center_end: '2026-10-02',
                    xdr_knowledge_base: '2026-10-02',
                    xdr_compliance: '2026-10-02',
                    xdr_performance: '2026-10-02',
                    xdr_smart_defense: '2026-10-02'
                };
            }
            if (line === 'SaaS-XDR' || line === 'XDR') {
                return {
                    version: defaults.version,
                    endDate: endDate || '2026-08-23',
                    logAmount: '20000',
                    testScenario: '新建安全运营场景',
                    testDriver: '各类安全设备告警量大且误报多，威胁运营效率低',
                    coreNeed: '作为常态化威胁检测/运营中心',
                    expectedResult: '威胁运营成果展示',
                    isPk: '仅产品',
                    competitorName: '示例安全运营平台',
                    customerEnv: '已部署 AF、SIP 与终端安全组件',
                    securityOpMode: 'SIP运营',
                    securityStaff: '3个以上',
                    existingComponents: ['AF', 'SIP'],
                    thirdPartyDevices: '第三方 EDR 8.2、日志平台 3.0',
                    budgetInfo: '当年预算',
                    securityBudget: '50-80W',
                    projectLandingDate: '2026-10-15',
                    collectedFile: '星海-XDR客户信息收集表.xlsx'
                };
            }
            if (line === 'AF') {
                return {
                    version: defaults.version,
                    endDate: endDate || '2026-09-26',
                    deviceId: deviceId || '',
                    modules: (defaults.modules || []).slice(),
                    spec: defaults.spec,
                    af_gw_users: '10',
                    af_gw_lines: '10',
                    af_branches: '10',
                    af_sslvpn_users: '10',
                    af_vmware_bw: '授权100Mbs',
                    af_cpu: '授权CPU2核',
                    af_av_engine_update: '2026-09-26',
                    af_cloudbrain_yz: '2026-09-26',
                    af_cloudbrain_yj: '2026-09-26',
                    af_web_portal: '2026-09-26',
                    af_software_update: '2026-09-26',
                    af_honeypot: '2026-09-26',
                    af_intelligent_ops: '2026-09-26',
                    af_sofast_best: '2026-09-26',
                    af_iot_fingerprint: '2026-09-26'
                };
            }
            if (line === 'aES') {
                return {
                    version: defaults.version,
                    endDate: endDate || '2026-10-02',
                    deviceId: deviceId || '',
                    modules: (defaults.modules || []).slice(),
                    spec: defaults.spec,
                    aes_license_count: '1',
                    aes_license_end: endDate || '2026-10-02'
                };
            }
            if (line === 'HCI') {
                params.infoFile = deviceId ? ('硬件信息-' + deviceId + '.xlsx') : '';
                params.clusterId = defaults.clusterId || deviceId || '';
            }
            if (line === 'AC') {
                params.gatewayLines = defaults.gatewayLines || '10';
                params.gatewayBranch = defaults.gatewayBranch || '10';
                params.gatewayMobile = defaults.gatewayMobile || '10';
                params.multiFeatures = (defaults.multiFeatures || []).slice();
                params.proxyFeatures = (defaults.proxyFeatures || []).slice();
                params.internetSecurityAuth = defaults.internetSecurityAuth || '2026-09-24';
                params.appUrlUpdate = defaults.appUrlUpdate || '2026-09-24';
                params.terminalCount = defaults.terminalCount || '1000';
                params.terminalAuth = defaults.terminalAuth || '2026-09-24';
                params.softwareUpgrade = defaults.softwareUpgrade || '2026-09-24';
                params.leakAudit = defaults.leakAudit || '2026-09-24';
            }
            if (line === 'STA') {
                params.sta_lines = '4';
                params.sta_mobile = '10';
                params.sta_branch = '10';
                params.sta_software_upgrade = '2026-10-02';
                params.sta_web_protection = '2026-10-02';
            }
            return params;
        }
        function getBorrowOrderStatus(order) {
            if (order.error) return '查询失败';
            if (order.approvalStatus !== '审批通过') return order.approvalStatus || '未审批';
            if (order.returned) return '已归还';
            if (order.revoked) return '已撤销';
            return '审批通过，借测中';
        }
        function renderSolutionBorrowOrders() {
            var select = id('solutionBorrowOrder');
            var selected = select.value;
            var hasCustomer = !!solutionBorrowCustomer;
            var orders = hasCustomer ? Object.keys(borrowOrders).map(function(number) { return borrowOrders[number]; }).filter(function(order) {
                return solutionBorrowCustomer.orders.indexOf(order.number) !== -1;
            }) : [];
            select.disabled = !hasCustomer;
            select.innerHTML = '<option value="">' + (hasCustomer ? '请选择该客户的 Mock 借测单' : '请先选择客户') + '</option>' + orders.map(function(order) {
                return '<option value="' + order.number + '">' + order.number + ' | ' + getBorrowOrderStatus(order) + '</option>';
            }).join('');
            if (orders.some(function(order) { return order.number === selected; })) select.value = selected;
        }
        function resetSolutionBorrowLookup() {
            id('solutionBorrowOrder').value = '';
            id('solutionBorrowState').hidden = true;
            id('solutionBorrowInfo').hidden = true;
            resetApplication();
        }
        function renderSolutionCustomerOptions(keyword, dropdownId, attributeName) {
            var normalized = String(keyword || '').trim().toLowerCase();
            var matched = solutionBorrowCustomers.filter(function(customer) {
                return !normalized || customer.name.toLowerCase().indexOf(normalized) !== -1 || customer.id.toLowerCase().indexOf(normalized) !== -1;
            });
            var dropdown = id(dropdownId);
            dropdown.innerHTML = matched.length ? matched.map(function(customer) {
                var isKa = customer.type === 'KA';
                return '<div class="search-item" ' + attributeName + '="' + escapeHtml(customer.id) + '"><span class="item-left"><span class="item-name">' + escapeHtml(customer.name) + '</span></span>' + (customer.sales ? '<span class="sales-person-badge" style="margin-left:6px;">' + escapeHtml(customer.sales) + '</span>' : '') + '<span class="' + (isKa ? 'item-badge ka' : 'item-badge normal') + '">' + (isKa ? 'KA客户' : '普通客户') + '</span></div>';
            }).join('') : '<div class="search-item" style="cursor:default;color:#778194;">没有匹配的 Mock 客户</div>';
            dropdown.classList.add('show');
        }
        function renderSolutionBorrowCustomers(keyword) { renderSolutionCustomerOptions(keyword, 'solutionBorrowCustomerDropdown', 'data-solution-borrow-customer'); }
        function renderSolutionLocalCustomers(keyword) { renderSolutionCustomerOptions(keyword, 'solutionLocalCustomerDropdown', 'data-solution-local-customer'); }
        function solutionRequiresCloudIdentity() {
            return !!application.solution && activeLines().some(isXaasLine);
        }
        function getSolutionCustomerCloudAccounts(customer) {
            if (!customer) return [];
            if (Array.isArray(customer.cloudAccounts)) return customer.cloudAccounts;
            return customer.cloud ? [customer.cloud] : [];
        }
        function refreshSolutionCustomerCloudSummary() {
            [['solutionBorrowCustomer', solutionBorrowCustomer], ['solutionLocalCustomer', solutionLocalCustomer]].forEach(function(entry) {
                var cloud = id(entry[0] + 'Cloud');
                var accounts = getSolutionCustomerCloudAccounts(entry[1]);
                var shouldShow = solutionRequiresCloudIdentity() && accounts.length > 1;
                cloud.hidden = !shouldShow;
                cloud.textContent = shouldShow ? '请选择所属云图账号（共 ' + accounts.length + ' 个）' : '';
            });
        }
        function setSolutionCustomerSummary(prefix, customer) {
            id(prefix + 'Name').textContent = customer.name;
            var sales = id(prefix + 'Sales');
            sales.textContent = customer.sales || '';
            sales.style.display = customer.sales ? 'inline-block' : 'none';
            var type = id(prefix + 'Type');
            var isKa = customer.type === 'KA';
            type.textContent = isKa ? 'KA客户' : '普通客户';
            type.className = 'customer-type-badge ' + (isKa ? 'ka' : 'normal');
            type.style.display = 'inline-block';

            // 客户全局云图身份标签
            var globalCloudId = prefix === 'solutionBorrowCustomer' ? 'solutionBorrowGlobalCloud' : 'solutionLocalGlobalCloud';
            var globalCloudEl = id(globalCloudId);
            if (globalCloudEl) {
                if (customer.cloud && customer.cloud.tenantId) {
                    globalCloudEl.innerHTML = '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;"><span class="material-symbols-outlined" style="font-size:13px;">cloud_done</span>云图ID: ' + escapeHtml(customer.cloud.tenantId) + '</span>';
                    globalCloudEl.style.display = 'inline-block';
                } else {
                    globalCloudEl.innerHTML = '<span style="display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:500;background:#fef2f2;color:#991b1b;border:1px solid #fecaca;"><span class="material-symbols-outlined" style="font-size:13px;">cloud_off</span>未关联云图账号</span>';
                    globalCloudEl.style.display = 'inline-block';
                }
            }
            refreshSolutionCustomerCloudSummary();
        }
        function clearSolutionCustomerSummary(prefix) {
            id(prefix + 'Name').textContent = '-';
            id(prefix + 'Sales').textContent = '';
            id(prefix + 'Sales').style.display = 'none';
            id(prefix + 'Type').textContent = '';
            id(prefix + 'Type').style.display = 'none';
            id(prefix + 'Cloud').textContent = '';
            id(prefix + 'Cloud').hidden = true;
            var globalCloudId = prefix === 'solutionBorrowCustomer' ? 'solutionBorrowGlobalCloud' : 'solutionLocalGlobalCloud';
            var globalCloudEl = id(globalCloudId);
            if (globalCloudEl) {
                globalCloudEl.innerHTML = '';
                globalCloudEl.style.display = 'none';
            }
        }
        function selectSolutionBorrowCustomer(customer) {
            solutionBorrowCustomer = customer;
            id('solutionBorrowCustomerSearch').value = customer.name;
            setSolutionCustomerSummary('solutionBorrowCustomer', customer);
            id('solutionBorrowCustomerInfoDisplay').classList.add('show');
            id('solutionBorrowCustomerField').classList.add('has-selection');
            id('solutionBorrowCustomerDropdown').classList.remove('show');
            renderSolutionBorrowOrders();
            resetSolutionBorrowLookup();
        }
        function clearSolutionBorrowCustomer(shouldReset) {
            solutionBorrowCustomer = null;
            id('solutionBorrowCustomerSearch').value = '';
            clearSolutionCustomerSummary('solutionBorrowCustomer');
            id('solutionBorrowCustomerInfoDisplay').classList.remove('show');
            id('solutionBorrowCustomerField').classList.remove('has-selection');
            id('solutionBorrowCustomerDropdown').classList.remove('show');
            renderSolutionBorrowOrders();
            if (shouldReset !== false) resetSolutionBorrowLookup();
        }
        function selectSolutionLocalCustomer(customer) {
            solutionLocalCustomer = customer;
            id('solutionLocalCustomerSearch').value = customer.name;
            setSolutionCustomerSummary('solutionLocalCustomer', customer);
            id('solutionLocalCustomerInfoDisplay').classList.add('show');
            id('solutionLocalCustomerField').classList.add('has-selection');
            id('solutionLocalCustomerDropdown').classList.remove('show');
            if (id('solutionLocalConfig').value) selectLocalSolution();
        }
        function clearSolutionLocalCustomer(shouldReset) {
            solutionLocalCustomer = null;
            id('solutionLocalCustomerSearch').value = '';
            clearSolutionCustomerSummary('solutionLocalCustomer');
            id('solutionLocalCustomerInfoDisplay').classList.remove('show');
            id('solutionLocalCustomerField').classList.remove('has-selection');
            id('solutionLocalCustomerDropdown').classList.remove('show');
            if (shouldReset !== false) resetApplication();
        }
        function applyScope(config, details) {
            application.solution = { code: config.code, name: config.name };
            application.lines = details.productLines.slice();
            application.applicant = details.applicant || getCurrentApplicant();
            application.customer = details.customer || (solutionLocalCustomer ? solutionLocalCustomer.name : '');
            application.cloud = details.cloud || (solutionLocalCustomer && solutionLocalCustomer.cloud) || (solutionBorrowCustomer && solutionBorrowCustomer.cloud) || null;
            application.borrow = details.number ? details : null;
            application.authDays = Number(config.authDays) || 0;
            application.authEndDate = application.authDays ?
                formatDateOffset(application.authDays) : (details.endDate || '');
            application.params = {};
            application.lines.forEach(function(line) { application.params[line] = createParams(line, details.devices && details.devices[line], application.authEndDate); });
            application.activeLine = application.lines[0];
            // 按需产品线开关（如未上线的 SASE-SWG）：默认关闭，关闭时不参与填写/校验/提交
            application.lineSwitches = {};
            application.lines.forEach(function(line) { if (isOptionalSolutionLine(line)) application.lineSwitches[line] = false; });
            application.biz = isDsocSolution() ? JSON.parse(JSON.stringify(solutionBizDefaults)) : {};
            application.accelBiz = isAccelSolution() ? JSON.parse(JSON.stringify(solutionAccelBizDefaults)) : {};
            application.networkBiz = isGlobalNetworkSolution() ? JSON.parse(JSON.stringify(solutionNetworkBizDefaults)) : {};
            refreshSolutionCustomerCloudSummary();
            setStatus('draft');
            renderLockedScope();
            renderBizSection();
            renderAccelBizSection();
            renderProductWorkspace();
            renderWorkflow();
        }
        // 业务申请信息模块：仅分布式安全运营方案展示，按 application.biz 同步表单状态
        function renderBizSection() {
            var dsoc = isDsocSolution();
            id('solutionBizSection').hidden = !dsoc;
            if (!dsoc) return;
            var biz = application.biz;
            id('solutionBizGrid').querySelectorAll('[data-solution-biz-param]').forEach(function(node) {
                var key = node.dataset.solutionBizParam;
                if (node.type === 'checkbox') {
                    node.checked = (biz[key] || []).indexOf(node.value) !== -1;
                } else if (node.type !== 'file') {
                    node.value = biz[key] || '';
                }
            });
            var nameEl = id('solutionBizGrid').querySelector('.solution-file-name');
            if (nameEl) { nameEl.textContent = biz.researchDoc || '未选择文件'; nameEl.classList.toggle('empty', !biz.researchDoc); }
        }
        // 全球加速方案业务申请信息
        function renderAccelBizSection() {
            var accel = isAccelSolution();
            var network = isGlobalNetworkSolution();
            id('solutionAccelBizSection').hidden = !(accel || network);
            if (!accel && !network) return;
            var biz = accel ? application.accelBiz : application.networkBiz;
            id('solutionAccelBizGrid').querySelectorAll('[data-solution-accel-param]').forEach(function(node) {
                var onlyAccel = node.closest('[data-solution-accel-only="true"]');
                if (onlyAccel) onlyAccel.hidden = network;
                node.value = biz[node.dataset.solutionAccelParam] || '';
            });
        }
        // 未上线/按需选择的产品线：导航展示开关，关闭时不渲染表单项且不参与校验与提交
        var optionalSolutionLines = ['SASE-SWG'];
        function isOptionalSolutionLine(line) {
            return optionalSolutionLines.indexOf(line) !== -1 || (isDsocSolution() && (line === 'AF' || line === 'aES'));
        }
        function optionalSolutionLineHint(line) {
            return isDsocSolution() && (line === 'AF' || line === 'aES') ? '按需启用（默认关闭）' : '按需启用（未上线，默认关闭）';
        }
        function isLineEnabled(line) {
            return application.lineSwitches ? application.lineSwitches[line] !== false : true;
        }
        function activeLines() {
            return application.lines.filter(isLineEnabled);
        }
        function renderLockedScope() {
            id('solutionLockedScope').hidden = false;
            id('solutionLockedName').value = application.solution.code + ' | ' + application.solution.name;
            id('solutionLockedLines').innerHTML = application.lines.map(function(line) { return '<span class="solution-chip">' + line + '</span>'; }).join('');
            id('solutionLockedAuthEndDate').value = application.authEndDate ? (application.authEndDate + (application.authDays ? '（' + application.authDays + '天）' : '')) : '—';
        }
        function solutionSelectOptions(options, selected) {
            return '<option value="">请选择</option>' + options.map(function(option) { return '<option value="' + escapeHtml(option) + '"' + (option === selected ? ' selected' : '') + '>' + escapeHtml(option) + '</option>'; }).join('');
        }
        function renderXaasFields(line, values) {
            var baseFields = '<div class="solution-field"><label><span class="solution-required">*</span>授权有效期<span class="solution-readonly-note"><span class="material-symbols-outlined">lock</span>统一取方案授权时间</span></label><input class="solution-input" type="date" data-solution-param="endDate" value="' + escapeHtml(values.endDate || '') + '" readonly data-solution-readonly></div>';
            var versionFields = '<div class="solution-field"><label><span class="solution-required">*</span>版本</label><input class="solution-input" data-solution-param="version" value="' + escapeHtml(values.version || '') + '"></div>';
            if (line === 'SASE-GA') {
                var gaBandwidthOptions = ['5', '10', '20', '30', '50'];
                var gaBizFields = (isAccelSolution() || isGlobalNetworkSolution()) ? '' :
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>客户需求</label><textarea class="solution-input" data-solution-param="customerNeed">' + escapeHtml(values.customerNeed || '') + '</textarea></div>' +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>项目规模</label><textarea class="solution-input" data-solution-param="projectScale">' + escapeHtml(values.projectScale || '') + '</textarea></div>' +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>竞争对手</label><textarea class="solution-input" data-solution-param="competitor">' + escapeHtml(values.competitor || '') + '</textarea></div>';
                return baseFields +
                    '<div class="solution-field"><label><span class="solution-required">*</span>带宽<span class="solution-readonly-note">档位：5M / 10M / 20M / 30M / 50M</span></label><select class="solution-select" data-solution-param="bandwidth">' + gaBandwidthOptions.map(function(option) { return '<option value="' + option + '"' + (String(values.bandwidth) === option ? ' selected' : '') + '>' + option + 'M</option>'; }).join('') + '</select></div>' +
                    gaBizFields;
            }
            if (line === 'SASE-SWG') {
                if (isGlobalNetworkSolution()) return baseFields + versionFields;
                return baseFields +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>客户需求</label><textarea class="solution-input" data-solution-param="customerNeed">' + escapeHtml(values.customerNeed || '') + '</textarea></div>' +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>项目规模</label><textarea class="solution-input" data-solution-param="projectScale">' + escapeHtml(values.projectScale || '') + '</textarea></div>' +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>竞争对手</label><textarea class="solution-input" data-solution-param="competitor">' + escapeHtml(values.competitor || '') + '</textarea></div>';
            }
            if (line === 'SASE-ZTNA') {
                var ztnaUserField = '<div class="solution-field"><label><span class="solution-required">*</span>授权用户数</label><input class="solution-input" type="number" min="1" data-solution-param="userCount" value="' + escapeHtml(values.userCount || '50') + '"></div>';
                if (isAccelSolution()) return baseFields + ztnaUserField;
                return baseFields +
                    ztnaUserField +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>客户需求</label><textarea class="solution-input" data-solution-param="customerNeed">' + escapeHtml(values.customerNeed || '') + '</textarea></div>' +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>项目规模</label><textarea class="solution-input" data-solution-param="projectScale">' + escapeHtml(values.projectScale || '') + '</textarea></div>' +
                    '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>竞争对手</label><textarea class="solution-input" data-solution-param="competitor">' + escapeHtml(values.competitor || '') + '</textarea></div>';
            }
            var isPk = values.isPk || '';
            var componentOptions = ['AF', 'aES', 'SIP', 'XDR', 'STA'];
            return versionFields +
                baseFields +
                '<div class="solution-field"><label><span class="solution-required">*</span>日志量（万条）</label><input class="solution-input" type="number" min="1" data-solution-param="logAmount" value="' + escapeHtml(values.logAmount || '') + '"></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>测试场景</label><select class="solution-select" data-solution-param="testScenario">' + solutionSelectOptions(['原有NDR升级场景', '新建安全运营场景', 'SOC替换场景', '多分支统一管理场景'], values.testScenario) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>测试驱动力</label><select class="solution-select" data-solution-param="testDriver">' + solutionSelectOptions(['各类安全设备告警量大且误报多，威胁运营效率低', '现有威胁运营平台不达预期想替换', '重大安全问题，需要加强安全建设', '被监管单位通报，需要加强安全建设', '护网重保缺少统一值守平台，值守难度大', '应对外部各类合规要求', 'MSS不支持接入STA/三方组件，影响服务效果', '客户有创新及体现政绩的诉求', '其他'], values.testDriver) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>核心需求</label><select class="solution-select" data-solution-param="coreNeed">' + solutionSelectOptions(['作为常态化威胁检测/运营中心', '作为护网重保值守平台', '作为分析溯源平台', '满足外部的各类合规需求', '仅作为安全大屏使用', 'MSS不支持接入STA/三方组件，影响服务效果', '客户有创新及体现政绩的诉求'], values.coreNeed) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>测试效果预期</label><select class="solution-select" data-solution-param="expectedResult">' + solutionSelectOptions(['全流量检测', '聚合降噪', '全量高经验盘', '智能化对抗', '威胁运营成果展示'], values.expectedResult) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>是否PK</label><select class="solution-select" data-solution-param="isPk">' + solutionSelectOptions(['否', '仅MSS', '仅产品', '两者都PK'], isPk) + '</select></div>' +
                '<div class="solution-field" data-solution-pk-field' + (isPk === '否' ? ' hidden' : '') + '><label><span class="solution-required">*</span>PK友商公司名</label><input class="solution-input" data-solution-param="competitorName" value="' + escapeHtml(values.competitorName || '') + '"></div>' +
                '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>客户环境信息</label><input class="solution-input" data-solution-param="customerEnv" value="' + escapeHtml(values.customerEnv || '') + '"></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>安全运营模式</label><select class="solution-select" data-solution-param="securityOpMode">' + solutionSelectOptions(['无运营', '单点运维', 'SIP运营', '友商平台', '代运营'], values.securityOpMode) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>安全人员配置</label><select class="solution-select" data-solution-param="securityStaff">' + solutionSelectOptions(['1个', '2个', '3个以上', '渠道代维', '客户自己运维'], values.securityStaff) + '</select></div>' +
                '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>深信服现有设备/组件</label><div class="solution-checkbox-group" data-solution-param="existingComponents">' + componentOptions.map(function(option) { return '<label class="solution-checkbox"><input type="checkbox" value="' + option + '"' + ((values.existingComponents || []).indexOf(option) !== -1 ? ' checked' : '') + '><span>' + option + '</span></label>'; }).join('') + '</div></div>' +
                '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>第三方设备类型及版本号</label><input class="solution-input" data-solution-param="thirdPartyDevices" value="' + escapeHtml(values.thirdPartyDevices || '') + '"></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>预算信息</label><select class="solution-select" data-solution-param="budgetInfo">' + solutionSelectOptions(['当年预算', '明年预算'], values.budgetInfo) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>安全预算区间</label><select class="solution-select" data-solution-param="securityBudget">' + solutionSelectOptions(['10-20W', '20-30W', '30-50W', '50-80W', '80W+'], values.securityBudget) + '</select></div>' +
                '<div class="solution-field"><label><span class="solution-required">*</span>项目预计落地时间</label><input class="solution-input" type="date" data-solution-param="projectLandingDate" value="' + escapeHtml(values.projectLandingDate || '') + '"></div>' +
                '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>客户信息收集表</label><div class="solution-file-input"><label class="solution-file-btn"><span class="material-symbols-outlined">upload_file</span>上传收集表<input type="file" accept=".xlsx,.xls" data-solution-param="collectedFile"></label><span class="solution-file-name' + (values.collectedFile ? '' : ' empty') + '">' + escapeHtml(values.collectedFile || '未选择文件') + '</span></div></div>';
        }
        function renderProductWorkspace() {
            id('solutionProductWorkspace').hidden = false;
            id('solutionProductNav').innerHTML = application.lines.map(function(line, index) {
                var optional = isOptionalSolutionLine(line);
                var enabled = isLineEnabled(line);
                var toggleHtml = optional ? '<div class="toggle-switch' + (enabled ? ' active' : '') + ' solution-line-switch" data-solution-line-switch="' + line + '" role="switch" aria-checked="' + enabled + '" aria-label="启用 ' + line + '" title="' + line + ' ' + optionalSolutionLineHint(line) + '"></div>' : '';
                var orderHtml = optional ? '' : '<small>' + (activeLines().indexOf(line) + 1) + '/' + activeLines().length + '</small>';
                return '<button type="button" data-solution-line="' + line + '" class="' + (line === application.activeLine ? 'is-active' : '') + (!enabled ? ' is-off' : '') + '"><span>' + line + '</span>' + toggleHtml + orderHtml + '</button>';
            }).join('');
            var line = application.activeLine;
            var values = application.params[line];
            var isHci = line === 'HCI';
            var fields = '';
            if (!isLineEnabled(line)) {
                fields = '<div class="solution-line-off-note"><span class="material-symbols-outlined" aria-hidden="true">info</span>' + line + ' 为按需产品线，当前默认关闭，不参与本单申请；打开右上角开关后填写参数。</div>';
            } else if (line === 'XDR' && isDsocSolution()) {
                var dsocVersions = ['LOCAL-XDR2.0.45及以上版本（XDR+GPT）'];
                fields += '<div class="solution-field"><label><span class="solution-required">*</span>版本</label><select class="solution-select" data-solution-param="version">' + dsocVersions.map(function(option) { return '<option value="' + escapeHtml(option) + '"' + (option === values.version ? ' selected' : '') + '>' + escapeHtml(option) + '</option>'; }).join('') + '</select></div>';
                fields += '<div class="solution-field"><label><span class="solution-required">*</span>授权有效期<span class="solution-readonly-note"><span class="material-symbols-outlined">lock</span>统一取方案授权时间</span></label><input class="solution-input" type="date" data-solution-param="endDate" value="' + escapeHtml(values.endDate) + '" readonly data-solution-readonly></div>';
                var dsocCards = values.version === 'LOCAL-XDR2.0.12及以上版本（XDR+GPT）' ? solutionModuleCards.XDR : solutionModuleCards.XDR_V45;
                fields += renderModuleCardsById(line, dsocCards, values);
            } else if (isXaasLine(line)) {
                fields = renderXaasFields(line, values);
            } else {
                fields += '<div class="solution-field"><label><span class="solution-required">*</span>版本</label><input class="solution-input" data-solution-param="version" value="' + escapeHtml(values.version) + '"></div>';
                fields += '<div class="solution-field"><label><span class="solution-required">*</span>授权有效期<span class="solution-readonly-note"><span class="material-symbols-outlined">lock</span>统一取方案授权时间</span></label><input class="solution-input" type="date" data-solution-param="endDate" value="' + escapeHtml(values.endDate) + '" readonly data-solution-readonly></div>';
                if (isHci) {
                    var infoName = values.infoFile ? escapeHtml(values.infoFile) : '未选择文件';
                    var infoEmpty = values.infoFile ? '' : ' empty';
                    fields += '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>硬件信息文件</label><div class="solution-file-input"><label class="solution-file-btn"><span class="material-symbols-outlined">upload_file</span>上传硬件信息文件<input type="file" data-solution-param="infoFile"></label><span class="solution-file-name' + infoEmpty + '">' + infoName + '</span></div></div>';
                    fields += '<div class="solution-field"><label><span class="solution-required">*</span>集群标识</label><input class="solution-input" data-solution-param="clusterId" value="' + escapeHtml(values.clusterId) + '"></div>';
                }
                fields += '<div class="solution-field"><label><span class="solution-required">*</span>设备 ID</label><input class="solution-input" data-solution-param="deviceId" value="' + escapeHtml(values.deviceId) + '"></div>';
                fields += renderSolutionModuleCards(line, values);
            }
            var active = activeLines();
            var headCount = isOptionalSolutionLine(line) ? '' : '<span>' + (active.indexOf(line) + 1) + ' / ' + active.length + '</span>';
            id('solutionProductPanel').innerHTML = '<div class="solution-product-panel-head"><h3>' + line + ' 授权参数</h3>' + headCount + '</div><div class="solution-grid two solution-product-fields" data-product-line="' + line + '">' + fields + '</div>';
        }
        function renderSolutionModuleCards(line, values) {
            var cards = solutionModuleCards[line];
            if (!cards) {
                var names = (values.modules && values.modules.length ? values.modules : (productDefaults[line] || {}).modules || []);
                cards = names.map(function(m) {
                    return { name: m, params: [{ label: '规格参数', key: 'spec_' + m, type: 'text', value: values.spec || '' }] };
                });
            }
            return renderModuleCardsById(line, cards, values);
        }
        function renderModuleCardsById(line, cards, values) {
            var enabled = values.modules || [];
            var html = '';
            cards.forEach(function(card, index) {
                var cardId = 'solution-module-' + line + '-' + index;
                var isOn = enabled.indexOf(card.name) !== -1;
                var bodyHtml = '';
                var paramCount = 0;
                if (card.toggle) {
                    bodyHtml = '<div class="module-features"><span class="feat-pill on">✓ ' + escapeHtml(card.toggle) + '</span></div>';
                    paramCount = 1;
                } else if (card.switches) {
                    var selected = values[card.switches.key] || [];
                    var switchHtml = (card.switches.options || []).map(function(f) {
                        return '<label class="solution-switch"><input type="checkbox" value="' + escapeHtml(f) + '"' + (selected.indexOf(f) !== -1 ? ' checked' : '') + '><span>' + escapeHtml(f) + '</span></label>';
                    }).join('');
                    bodyHtml = '<div class="module-grid"><div class="grid-field"><div class="solution-switch-group" data-solution-param="' + escapeHtml(card.switches.key) + '">' + switchHtml + '</div></div></div>';
                    paramCount = (card.switches.options || []).length;
                } else {
                    var gridFields = (card.params || []).map(function(p) {
                        var field = p.type === 'select'
                            ? '<select class="layui-select gf-select" data-solution-param="' + escapeHtml(p.key) + '">' + (p.options || []).map(function(o) { return '<option' + (o === p.value ? ' selected' : '') + '>' + escapeHtml(o) + '</option>'; }).join('') + '</select>'
                            : '<input type="text" data-solution-param="' + escapeHtml(p.key) + '" value="' + escapeHtml(p.value) + '">';
                        return '<div class="grid-field"><span class="gf-label">' + escapeHtml(p.label) + '</span><div class="gf-val">' + field + '</div>' + (p.hint ? '<span class="gf-hint">' + escapeHtml(p.hint) + '</span>' : '') + '</div>';
                    }).join('');
                    bodyHtml = '<div class="module-grid">' + gridFields + '</div>';
                    paramCount = (card.params || []).length;
                }
                html += '<div class="module-item' + (isOn ? '' : ' disabled') + '" id="' + cardId + '">' +
                    '<div class="module-head">' +
                        '<div class="toggle-switch' + (isOn ? ' active' : '') + '" data-solution-module-toggle="' + escapeHtml(card.name) + '"></div>' +
                        '<span class="module-name">' + escapeHtml(card.name) + '</span>' +
                        '<span class="module-count">' + paramCount + '个参数</span>' +
                        '<span class="module-status ' + (isOn ? 'on' : 'off') + '">' + (isOn ? '已启用' : '未启用') + '</span>' +
                        '<span class="module-chevron collapsed">▼</span>' +
                    '</div>' +
                    '<div class="module-body hidden">' + bodyHtml + '</div>' +
                '</div>';
            });
            return '<div class="solution-field solution-field-full"><label><span class="solution-required">*</span>授权模块</label><div class="solution-module-card-list" data-solution-param="modules" data-solution-module-cards="true">' + html + '</div></div>';
        }
        function lookupBorrowOrder() {
            resetApplication();
            id('solutionBorrowInfo').hidden = true;
            var state = id('solutionBorrowState');
            if (!solutionBorrowCustomer) { state.hidden = false; state.className = 'solution-lookup-state error'; state.textContent = '请先选择客户后再查询并关联借测单。'; return; }
            var order = borrowOrders[id('solutionBorrowOrder').value];
            if (!order) { state.hidden = false; state.className = 'solution-lookup-state'; state.textContent = '请选择借测单后查询。'; return; }
            if (order.error) { state.hidden = false; state.className = 'solution-lookup-state error'; state.textContent = '查询失败：资产系统暂时不可用（Mock），当前内容不可提交。'; return; }
            if (order.approvalStatus !== '审批通过') { state.hidden = false; state.className = 'solution-lookup-state error'; state.textContent = '无法关联：该借测单尚未审批通过，当前状态为“' + order.approvalStatus + '”。'; return; }
            if (order.returned) { state.hidden = false; state.className = 'solution-lookup-state error'; state.textContent = '无法关联：该借测单已归还。'; return; }
            if (order.revoked) { state.hidden = false; state.className = 'solution-lookup-state error'; state.textContent = '无法关联：该借测单已撤销。'; return; }
            state.hidden = true;
            var config = findConfig(order.solutionCode) || { code: order.solutionCode, name: order.solution };
            applyScope(config, order);
            var info = id('solutionBorrowInfo');
            info.hidden = false;
            info.innerHTML = '<div class="solution-info-grid"><div class="solution-info-item"><small>借测单号</small>' + order.number + '</div><div class="solution-info-item"><small>申请人</small>' + order.applicant + '</div><div class="solution-info-item"><small>客户</small>' + order.customer + '</div><div class="solution-info-item"><small>借测期限</small>' + order.startDate + ' 至 ' + order.endDate + '</div><div class="solution-info-item"><small>资产审批</small>' + order.approvalInfo + '</div><div class="solution-info-item"><small>产品/服务</small>' + order.productLines.length + ' 个产品/服务</div></div>';
        }
        function selectLocalSolution() {
            resetApplication();
            var config = findConfig(id('solutionLocalConfig').value);
            if (!config || config.status !== 'enabled') return;
            applyScope(config, {
                productLines: config.productLines,
                customer: solutionLocalCustomer ? solutionLocalCustomer.name : '',
                cloud: solutionLocalCustomer && solutionLocalCustomer.cloud
            });
        }
        function validateApplication() {
            if (!application.solution) return '请先关联有效借测单或选择启用方案。';
            if (application.source === 'local') {
                application.applicant = getCurrentApplicant();
                application.customer = solutionLocalCustomer ? solutionLocalCustomer.name : '';
                application.cloud = solutionLocalCustomer && solutionLocalCustomer.cloud;
            }
            if (!application.applicant || !application.customer) return '请补全申请人和客户。';
            // 所属行业校验
            var industry = application.source === 'borrow' ? (id('solutionBorrowIndustry') ? id('solutionBorrowIndustry').value : '') : (id('solutionLocalIndustry') ? id('solutionLocalIndustry').value : '');
            if (!industry) return '请选择客户所属行业。';

            if (isDsocSolution()) {
                var biz = application.biz || {};
                if (!biz.mainScenario || !biz.componentNotes || !biz.resalePlan || !biz.researchDoc) return '请补全业务申请信息（分布式安全运营）。';
                if (!biz.testDrivers || !biz.testDrivers.length || !biz.expectedEffects || !biz.expectedEffects.length) return '请补全业务申请信息（分布式安全运营）。';
            }
            if (isAccelSolution()) {
                var accelBiz = application.accelBiz || {};
                if (!accelBiz.customerNeed || !accelBiz.projectScale || !accelBiz.competitor || !accelBiz.region) return '请补全业务申请信息（全球加速）。';
            }
            if (isGlobalNetworkSolution()) {
                var networkBiz = application.networkBiz || {};
                if (!networkBiz.customerNeed || !networkBiz.projectScale || !networkBiz.competitor) return '请补全业务申请信息（全球组网）。';
            }
            var active = activeLines();
            if (active.some(isXaasLine) && (!application.cloud || !application.cloud.tenantId)) return '【阻断】方案包含 XaaS 产品线，客户需已关联云图账号和云图ID（未开户客户不可申请）。';
            for (var i = 0; i < active.length; i++) {
                var line = active[i];
                var value = application.params[line];
                if (line === 'SASE-GA') {
                    if (isAccelSolution() || isGlobalNetworkSolution()) {
                        if (!value.endDate || !value.bandwidth) return 'SASE-GA 的授权参数未填写完整。';
                        continue;
                    }
                    if (!value.endDate || !value.bandwidth || !value.customerNeed || !value.projectScale || !value.competitor) return 'SASE-GA 的授权参数未填写完整。';
                    continue;
                }
                if (line === 'SASE-SWG') {
                    if (!value.version || !value.endDate || (isGlobalNetworkSolution() ? false : (!value.customerNeed || !value.projectScale || !value.competitor))) return 'SASE-SWG 的授权参数未填写完整。';
                    continue;
                }
                if (line === 'SASE-ZTNA') {
                    if (isAccelSolution()) {
                        if (!value.endDate || !value.userCount || parseInt(value.userCount, 10) < 1) return 'SASE-ZTNA 的授权参数未填写完整。';
                        continue;
                    }
                    if (!value.version || !value.endDate || !value.userCount || parseInt(value.userCount, 10) < 1 || !value.customerNeed || !value.projectScale || !value.competitor) return 'SASE-ZTNA 的授权参数未填写完整。';
                    continue;
                }
                if (line === 'XDR' && isDsocSolution()) {
                    if (!value.version || !value.modules || !value.modules.length) return 'XDR 的授权参数未填写完整。';
                    continue;
                }
                if (line === 'SaaS-XDR' || line === 'XDR') {
                    var xdrFields = ['version', 'endDate', 'logAmount', 'testScenario', 'testDriver', 'coreNeed', 'expectedResult', 'isPk', 'customerEnv', 'securityOpMode', 'securityStaff', 'thirdPartyDevices', 'budgetInfo', 'securityBudget', 'projectLandingDate', 'collectedFile'];
                    if (xdrFields.some(function(field) { return !value[field]; }) || !value.existingComponents || !value.existingComponents.length) return line + ' 的授权参数未填写完整。';
                    if (value.isPk !== '否' && !value.competitorName) return line + ' 请填写 PK 友商公司名。';
                    continue;
                }
                if (line === 'AF') {
                    if (!value.version || !value.deviceId || !value.modules || !value.modules.length) return 'AF 的授权参数未填写完整。';
                    if (!value.af_gw_users || !value.af_gw_lines || !value.af_branches || !value.af_sslvpn_users) return 'AF 网关/SSL VPN 序列号参数未填写完整。';
                    continue;
                }
                if (line === 'aTrust') {
                    if (!value.version || !value.deviceId) return 'aTrust 的授权参数未填写完整。';
                    continue;
                }
                if (line === 'STA') {
                    if (!value.version || !value.deviceId) return 'STA 的授权参数未填写完整。';
                    continue;
                }
                if (!value.version || !value.deviceId) return line + ' 的授权参数未填写完整。';
                if (line === 'AC') {
                    if (!value.gatewayLines || !value.gatewayBranch || !value.gatewayMobile || !value.internetSecurityAuth || !value.appUrlUpdate || !value.terminalCount || !value.terminalAuth || !value.softwareUpgrade || !value.leakAudit) return line + ' 的授权参数未填写完整。';
                    if (!value.multiFeatures || !value.multiFeatures.length) return line + ' 请至少选择一项多功能序列号。';
                } else {
                    if (!value.modules || !value.modules.length || !value.spec) return line + ' 的授权参数未填写完整。';
                }
                if (line === 'HCI' && (!value.infoFile || !value.clusterId)) return 'HCI 需上传硬件信息文件并填写集群标识。';
            }
            return '';
        }
        function renderWorkflow() {
            var box = id('solutionWorkflow');
            if (!application.solution) { box.innerHTML = '<div class="solution-workflow-copy">请选择申请入口并确认方案范围。</div>'; return; }
            if (application.status === 'draft') { box.innerHTML = '<div class="solution-workflow-copy">已锁定 ' + activeLines().length + ' 条产品线，填写产品参数后提交一张 W3 整单审批单。</div><div class="solution-form-error solution-workflow-error" id="solutionSubmitError" hidden></div><div class="solution-workflow-actions"><button type="button" class="solution-btn" id="solutionSubmitWhole"><span class="material-symbols-outlined">send</span>提交 W3 整单审批</button></div>'; return; }
            box.innerHTML = '';
        }
        function getSolutionLineSummary(line, item) {
            var business = isAccelSolution() ? application.accelBiz : (isGlobalNetworkSolution() ? application.networkBiz : null);
            if (line === 'SASE-GA') return '云图ID ' + (application.cloud ? application.cloud.tenantId : '-') + ' | 带宽 ' + item.bandwidth + 'M | ' + (business ? business.customerNeed : item.customerNeed);
            if (line === 'SASE-SWG') return '云图ID ' + (application.cloud ? application.cloud.tenantId : '-') + ' | ' + (business ? business.customerNeed : item.customerNeed);
            if (line === 'SASE-ZTNA') return '云图ID ' + (application.cloud ? application.cloud.tenantId : '-') + ' | 授权用户数 ' + (item.userCount || 50) + ' | ' + (business ? business.customerNeed : item.customerNeed);
            if (line === 'AF') return item.deviceId + ' | 网关' + (item.af_gw_users || '') + '用户/' + (item.af_gw_lines || '') + '线路 · SSL VPN ' + (item.af_sslvpn_users || '') + '用户 · 已启用 ' + (item.modules || []).length + ' 项授权功能';
            if (line === 'SaaS-XDR' || line === 'XDR') return '云图ID ' + (application.cloud ? application.cloud.tenantId : '-') + ' | 日志量 ' + item.logAmount + ' 万条 | ' + item.coreNeed;
            if (line === 'HCI') return item.deviceId + ' | ' + (item.modules || []).join('、') + ' | 集群 ' + item.clusterId + ' | ' + item.spec;
            if (line === 'AC') return item.deviceId + ' | 网关：线路' + item.gatewayLines + '/分支' + item.gatewayBranch + '/移动' + item.gatewayMobile + ' | 多功能：' + (item.multiFeatures || []).join('、') + ' | 终端' + item.terminalCount;
            return item.deviceId + ' | ' + (item.modules || []).join('、') + ' | ' + item.spec;
        }
        function submitWholeApplication() {
            var error = validateApplication();
            var errorBox = id('solutionSubmitError');
            if (error) {
                if (errorBox) { errorBox.textContent = error; errorBox.hidden = false; }
                return;
            }
            if (errorBox) errorBox.hidden = true;
            insertSolutionRecord();
            setStatus('success');
            renderWorkflow();
        }
        function insertSolutionRecord() {
            if (application.recordId) return;
            application.recordId = 'SOL-20260806-003';
            var rows = activeLines().map(function(line, index) {
                var value = application.params[line];
                var xaas = isXaasLine(line);
                return { line: line, version: value.version, deviceId: xaas ? '云图ID: ' + (application.cloud ? application.cloud.tenantId : '-') : value.deviceId, sn: xaas ? '—' : 'SN-' + line + '-' + String(index + 1).padStart(3, '0'), endDate: value.endDate, license: 'LIC-' + line + '-806' };
            });
            var deviceIds = rows.map(function(row) { return row.deviceId; }).join('&#10;');
            var sns = rows.map(function(row) { return row.sn; }).join('&#10;');
            var tbody = document.querySelector('#content-records .table-scroll-wrap > table > tbody');
            var sourceLabel = application.source === 'borrow' ? '关联借测单' : '本地申请';
            var record = '<tr class="hover:bg-[#eef3ff]/40 transition-colors solution-parent" data-solution-generated="true"><td class="sticky-left sticky-left-0 py-3 px-4 whitespace-nowrap"><div class="flex items-center gap-1"><button class="text-[#424656] hover:text-primary border-0 bg-transparent p-0 leading-none" onclick="toggleSolution(this)" aria-label="展开方案明细"><span class="material-symbols-outlined text-[16px] expand-icon">chevron_right</span></button><a class="text-primary hover:underline font-medium" href="javascript:;">' + application.recordId + '</a></div></td><td class="sticky-left sticky-left-1 py-3 px-4 whitespace-nowrap"><span class="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">解决方案</span></td><td class="py-3 px-4 whitespace-nowrap text-[#424656]">本平台</td><td class="py-3 px-4 whitespace-nowrap text-[#0b1c30]">' + escapeHtml(application.solution.name) + '</td><td class="py-3 px-4 whitespace-nowrap text-[#424656]">—</td><td class="py-3 px-4 whitespace-nowrap"><div class="cust-cell"><span class="cust-name" data-full="' + escapeHtml(application.customer) + '">' + escapeHtml(application.customer) + '</span></div></td><td class="py-3 px-4 whitespace-nowrap text-[#424656]"><span class="device-summary" data-full="' + deviceIds + '">' + rows.length + '个设备</span></td><td class="py-3 px-4 whitespace-nowrap text-[#424656]"><span class="device-summary" data-full="' + sns + '">' + rows.length + '个设备</span></td><td class="py-3 px-4 whitespace-nowrap text-[#424656]">—</td><td class="py-3 px-4 whitespace-nowrap text-[#424656]">' + sourceLabel + '</td><td class="py-3 px-4 whitespace-nowrap text-[#424656]">2026-08-06 ~ ' + rows[0].endDate + '</td><td class="py-3 px-4 whitespace-nowrap text-[#0b1c30]">' + escapeHtml(application.applicant) + '</td><td class="py-3 px-4 whitespace-nowrap text-[#424656]">2026-08-06 10:10</td><td class="sticky-right py-3 px-4 whitespace-nowrap"><div class="flex items-center gap-3"><span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>已授权</span><div class="flex items-center gap-0.5 ml-auto"></div></div></td></tr>';
            var detail = '<tr class="solution-detail-row" style="display:none;" data-solution-generated-detail="true"><td colspan="14" class="p-0 bg-[#f8f9ff]" style="border-top:2px solid #e5eeff;"><div style="padding:6px 12px 10px;"><div class="solution-expand-wrap"><div class="bg-white rounded border border-[#c2c6d8]/20 overflow-hidden" style="font-size:11.5px;"><table class="w-full"><thead><tr class="border-b border-[#c2c6d8]/30 bg-[#e8eeff]"><th class="py-2 px-3">产品线</th><th class="py-2 px-3">版本号</th><th class="py-2 px-3">设备ID/云图ID</th><th class="py-2 px-3">设备SN</th><th class="py-2 px-3">授权有效期</th><th class="py-2 px-3">授权码</th></tr></thead><tbody>' + rows.map(function(row) { return '<tr><td class="py-2 px-3">' + row.line + '</td><td class="py-2 px-3">' + escapeHtml(row.version) + '</td><td class="py-2 px-3">' + escapeHtml(row.deviceId) + '</td><td class="py-2 px-3">' + row.sn + '</td><td class="py-2 px-3">至 ' + row.endDate + '</td><td class="py-2 px-3">' + row.license + '</td></tr>'; }).join('') + '</tbody></table></div></div></div></td></tr>';
            tbody.insertAdjacentHTML('afterbegin', record + detail);
            if (typeof window.initRecordsPagination === 'function') window.initRecordsPagination();
        }

        // 成对组件互斥守底规则：至少选一个（如 STA/AF，AF/aES）
        var atLeastOnePairs = [
            ['STA', 'AF'],
            ['AF', 'STA'],
            ['AF', 'aES'],
            ['aES', 'AF']
        ];

        function bindEvents() {
            document.querySelectorAll('[data-solution-drawer-close]').forEach(function(el) { el.addEventListener('click', closeSolutionConfigDrawer); });
            id('solutionSourceSelect').addEventListener('change', function() {
                application.source = this.value;
                id('solutionBorrowSource').hidden = application.source !== 'borrow';
                id('solutionLocalSource').hidden = application.source !== 'local';
                id('solutionLocalConfig').value = '';
                clearSolutionBorrowCustomer(false);
                clearSolutionLocalCustomer(false);
                id('solutionBorrowState').hidden = true;
                id('solutionBorrowInfo').hidden = true;
                resetApplication();
            });
            id('solutionBorrowCustomerSearch').addEventListener('focus', function() { renderSolutionBorrowCustomers(this.value); });
            id('solutionBorrowCustomerSearch').addEventListener('input', function() { renderSolutionBorrowCustomers(this.value); });
            id('solutionBorrowCustomerDropdown').addEventListener('click', function(event) {
                var item = event.target.closest('[data-solution-borrow-customer]');
                if (!item) return;
                var customer = solutionBorrowCustomers.find(function(entry) { return entry.id === item.dataset.solutionBorrowCustomer; });
                if (customer) selectSolutionBorrowCustomer(customer);
            });
            id('solutionBorrowCustomerChange').addEventListener('click', function() {
                clearSolutionBorrowCustomer();
                id('solutionBorrowCustomerSearch').focus();
            });
            id('solutionLocalCustomerSearch').addEventListener('focus', function() { renderSolutionLocalCustomers(this.value); });
            id('solutionLocalCustomerSearch').addEventListener('input', function() { renderSolutionLocalCustomers(this.value); });
            id('solutionLocalCustomerDropdown').addEventListener('click', function(event) {
                var item = event.target.closest('[data-solution-local-customer]');
                if (!item) return;
                var customer = solutionBorrowCustomers.find(function(entry) { return entry.id === item.dataset.solutionLocalCustomer; });
                if (customer) selectSolutionLocalCustomer(customer);
            });
            id('solutionLocalCustomerChange').addEventListener('click', function() {
                clearSolutionLocalCustomer();
                id('solutionLocalCustomerSearch').focus();
            });
            document.addEventListener('click', function(event) {
                if (!event.target.closest('#solutionBorrowCustomerField')) id('solutionBorrowCustomerDropdown').classList.remove('show');
                if (!event.target.closest('#solutionLocalCustomerField')) id('solutionLocalCustomerDropdown').classList.remove('show');
            });
            id('solutionBorrowLookup').addEventListener('click', lookupBorrowOrder);
            id('solutionLocalConfig').addEventListener('change', selectLocalSolution);
            id('solutionProductNav').addEventListener('click', function(event) {
                var toggle = event.target.closest('[data-solution-line-switch]');
                if (toggle) {
                    var switchLine = toggle.dataset.solutionLineSwitch;
                    var willBeEnabled = !isLineEnabled(switchLine);
                    application.lineSwitches[switchLine] = willBeEnabled;

                    // 至少选一个交互守底逻辑：一个关闭，另一个必须开启
                    if (!willBeEnabled) {
                        atLeastOnePairs.forEach(function(pair) {
                            if (pair[0] === switchLine && application.lines.indexOf(pair[1]) !== -1) {
                                var other = pair[1];
                                if (!isLineEnabled(other)) {
                                    application.lineSwitches[other] = true;
                                }
                            }
                        });
                    }

                    if (!isLineEnabled(application.activeLine)) application.activeLine = activeLines()[0] || application.activeLine;
                    renderProductWorkspace();
                    return;
                }
                var button = event.target.closest('[data-solution-line]');
                if (!button) return;
                application.activeLine = button.dataset.solutionLine;
                renderProductWorkspace();
            });
            function collectSolutionParam(event) {
                var target = event.target;
                if (target.type === 'checkbox') {
                    var group = target.closest('[data-solution-param]');
                    if (group) {
                        var name = group.dataset.solutionParam;
                        application.params[application.activeLine][name] = Array.prototype.slice.call(group.querySelectorAll('input:checked')).map(function(c) { return c.value; });
                    }
                    return;
                }
                if (target.type === 'file') {
                    var field = target.closest('[data-solution-param]');
                    if (field) {
                        var fileName = target.files.length ? target.files[0].name : '';
                        application.params[application.activeLine][field.dataset.solutionParam] = fileName;
                        var wrap = field.closest('.solution-file-input');
                        var nameEl = wrap && wrap.querySelector('.solution-file-name');
                        if (nameEl) { nameEl.textContent = fileName || '未选择文件'; nameEl.classList.toggle('empty', !fileName); }
                    }
                    return;
                }
                var inputEl = target.closest('[data-solution-param]');
                if (inputEl) {
                    application.params[application.activeLine][inputEl.dataset.solutionParam] = inputEl.value;
                    if (inputEl.dataset.solutionParam === 'isPk') renderProductWorkspace();
                    if (isDsocSolution() && application.activeLine === 'XDR' && inputEl.dataset.solutionParam === 'version') {
                        application.params.XDR = createParams('XDR', '', application.authEndDate, inputEl.value);
                        renderProductWorkspace();
                    }
                }
            }
            id('solutionProductPanel').addEventListener('input', collectSolutionParam);
            id('solutionProductPanel').addEventListener('change', collectSolutionParam);
            function collectBizParam(event) {
                var target = event.target;
                var field = target.closest ? target.closest('[data-solution-biz-param]') : null;
                if (!field) return;
                var key = field.dataset.solutionBizParam;
                if (target.type === 'checkbox') {
                    application.biz[key] = Array.prototype.slice.call(field.querySelectorAll('input:checked')).map(function(c) { return c.value; });
                    return;
                }
                if (target.type === 'file') {
                    var docName = target.files.length ? target.files[0].name : '';
                    application.biz[key] = docName;
                    var docWrap = field.closest('.solution-file-input');
                    var docNameEl = docWrap && docWrap.querySelector('.solution-file-name');
                    if (docNameEl) { docNameEl.textContent = docName || '未选择文件'; docNameEl.classList.toggle('empty', !docName); }
                    return;
                }
                application.biz[key] = target.value;
            }
            id('solutionBizGrid').addEventListener('input', collectBizParam);
            id('solutionBizGrid').addEventListener('change', collectBizParam);
            function collectAccelBizParam(event) {
                var target = event.target;
                var field = target.closest ? target.closest('[data-solution-accel-param]') : null;
                if (!field) return;
                var biz = isGlobalNetworkSolution() ? application.networkBiz : application.accelBiz;
                biz[field.dataset.solutionAccelParam] = target.value;
            }
            id('solutionAccelBizGrid').addEventListener('input', collectAccelBizParam);
            id('solutionAccelBizGrid').addEventListener('change', collectAccelBizParam);
            id('solutionProductPanel').addEventListener('click', function(event) {
                var toggle = event.target.closest('[data-solution-module-toggle]');
                if (toggle) {
                    var moduleName = toggle.dataset.solutionModuleToggle;
                    var card = toggle.closest('.module-item');
                    var body = card ? card.querySelector('.module-body') : null;
                    var chevron = card ? card.querySelector('.module-chevron') : null;
                    var status = card ? card.querySelector('.module-status') : null;
                    var isOn = !toggle.classList.contains('active');
                    toggle.classList.toggle('active', isOn);
                    if (card) card.classList.toggle('disabled', !isOn);
                    if (body) body.classList.toggle('hidden', !isOn);
                    if (chevron) chevron.classList.toggle('collapsed', !isOn);
                    if (status) { status.className = 'module-status ' + (isOn ? 'on' : 'off'); status.textContent = isOn ? '已启用' : '未启用'; }
                    var params = application.params[application.activeLine];
                    if (params && Array.isArray(params.modules)) {
                        var idx = params.modules.indexOf(moduleName);
                        if (isOn && idx === -1) params.modules.push(moduleName);
                        if (!isOn && idx !== -1) params.modules.splice(idx, 1);
                    }
                    return;
                }
                var head = event.target.closest('.module-head');
                if (head && !head.querySelector('[data-solution-module-toggle]')) return;
                if (head) {
                    var bodyEl = head.parentElement.querySelector('.module-body');
                    if (bodyEl) {
                        bodyEl.classList.toggle('hidden');
                        head.querySelector('.module-chevron') && head.querySelector('.module-chevron').classList.toggle('collapsed');
                    }
                }
            });
            id('solutionWorkflow').addEventListener('click', function(event) {
                var button = event.target.closest('button'); if (!button) return;
                if (button.id === 'solutionSubmitWhole') submitWholeApplication();
            });
            id('solutionConfigNew').addEventListener('click', function() { openConfigModal(); });
            document.querySelectorAll('[data-solution-config-close]').forEach(function(button) { button.addEventListener('click', closeConfigModal); });
            id('solutionConfigSave').addEventListener('click', saveConfig);
            id('solutionConfigQuery').addEventListener('click', renderConfigs);
            id('solutionConfigReset').addEventListener('click', function() { id('solutionConfigSearch').value = ''; id('solutionConfigStatus').value = 'all'; renderConfigs(); });
            id('solutionConfigRows').addEventListener('click', function(event) { var action = event.target.closest('[data-solution-config-action]'); if (!action) return; var code = action.closest('[data-solution-config-code]').dataset.solutionConfigCode; if (action.dataset.solutionConfigAction === 'edit') openConfigModal(code); else toggleConfig(code); });
            id('solutionAssetRead').addEventListener('click', function() { var payload = enabledConfigs().map(function(item) { return { solutionCode: item.code, solutionName: item.name, status: 'enabled', productLines: item.productLines, authDays: Number(item.authDays) || 0 }; }); id('solutionAssetPreview').textContent = JSON.stringify(payload, null, 2); id('solutionAssetPreview').hidden = false; });

            // 业务信息模板切换与自由配置字段事件绑定
            if (id('solutionConfigBizTemplate')) {
                id('solutionConfigBizTemplate').addEventListener('change', function() {
                    var tpl = this.value;
                    var fields = defaultBizTemplateFields[tpl] || [];
                    renderModalBizFields(JSON.parse(JSON.stringify(fields)));
                });
            }
            if (id('solutionConfigAddFieldBtn')) {
                id('solutionConfigAddFieldBtn').addEventListener('click', function() {
                    var current = readModalBizFields();
                    current.push({ name: '', type: 'text', options: [], required: true });
                    renderModalBizFields(current);
                    var container = id('solutionConfigBizFieldsList');
                    var rows = container.querySelectorAll('.solution-biz-field-row');
                    if (rows.length) {
                        var last = rows[rows.length - 1];
                        var nameInp = last.querySelector('.solution-biz-field-name');
                        if (nameInp) nameInp.focus();
                    }
                });
            }
            if (id('solutionConfigBizFieldsList')) {
                id('solutionConfigBizFieldsList').addEventListener('change', function(event) {
                    var target = event.target;
                    if (target.classList.contains('solution-biz-field-type')) {
                        var row = target.closest('.solution-biz-field-row');
                        var optInp = row ? row.querySelector('.solution-biz-field-options') : null;
                        if (optInp) {
                            var isChoice = target.value === 'select' || target.value === 'checkbox';
                            optInp.style.display = isChoice ? 'block' : 'none';
                        }
                    }
                });
                id('solutionConfigBizFieldsList').addEventListener('click', function(event) {
                    var delBtn = event.target.closest('.solution-biz-field-del');
                    if (delBtn) {
                        var row = delBtn.closest('.solution-biz-field-row');
                        if (row) row.remove();
                    }
                });
            }
        }
        function toggleSettingsDropdown() {
            var menu = document.getElementById('settingsDropdownMenu');
            if (menu) menu.classList.toggle('show');
        }
        document.addEventListener('click', function(event) {
            var wrap = document.getElementById('settingsDropdown');
            if (wrap && !wrap.contains(event.target)) {
                var menu = document.getElementById('settingsDropdownMenu');
                if (menu) menu.classList.remove('show');
            }
        });
        window.toggleSettingsDropdown = toggleSettingsDropdown;
        window.openSolutionConfigDrawer = openSolutionConfigDrawer;
        window.closeSolutionConfigDrawer = closeSolutionConfigDrawer;
        function initSolutionTab() { if (!id('content-solution')) return; renderConfigs(); renderSolutionBorrowOrders(); bindEvents(); }
        initSolutionTab();
    }());'''

    updated_content = content[:js_start] + new_js + content[js_end:]
    HTML_PATH.write_text(updated_content, encoding="utf-8")
    print("Successfully patched 测试设备授权平台V2.html!")

if __name__ == "__main__":
    patch()
