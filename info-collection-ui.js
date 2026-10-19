(function() {
    'use strict';
    if (!window.InfoCollection || window.InfoCollectionUI) return;
    var store = window.InfoCollection.createStore(window.localStorage);
    var activeDialogToken = '', activeKind = 'hardware', previousFocus, restoring = false;
    var seenReminders = {}, autoRunning = false;
    var root = document.createElement('div');
    root.id = 'infoCollectionOverlay'; root.className = 'ic-overlay'; root.hidden = true;
    root.innerHTML = '<section class="ic-dialog" role="dialog" aria-modal="true" aria-labelledby="infoDialogTitle" tabindex="-1"><header class="ic-dialog-head"><div><p class="ic-eyebrow" id="infoDialogEyebrow">客户协作</p><h2 id="infoDialogTitle"></h2></div><button type="button" class="ic-close" data-info-close aria-label="关闭">×</button></header><div id="infoDialogBody"></div></section>';
    document.body.appendChild(root);
    var feedback = document.createElement('div'); feedback.id = 'infoCollectionFeedback'; feedback.className = 'ic-toast'; feedback.hidden = true; feedback.setAttribute('role', 'status'); document.body.appendChild(feedback);
    function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function adapter(kind) { return kind === 'solution' ? window.SolutionInfoCollection : window.InfoCollectionApplication; }
    function notify(message) {
        feedback.textContent = message; feedback.hidden = false;
        clearTimeout(notify.timer); notify.timer = setTimeout(function() { feedback.hidden = true; }, 4500);
    }
    function date(value) { return new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }); }
    function link(task) { return new URL('info-upload.html#' + encodeURIComponent(task.token), location.href).href; }
    function filesOf(task) { return task.files || []; }
    function filesLabel(task) {
        var files = filesOf(task);
        if (!files.length) return '';
        return files.length === 1 ? files[0].name : files[0].name + ' 等 ' + files.length + ' 个文件';
    }
    function lastReminder(task) {
        var reminders = task.reminders || [];
        return reminders.length ? reminders[reminders.length - 1] : null;
    }
    function hasUnackedReminder(task) {
        var last = lastReminder(task);
        return !!last && last.at > (task.reminderAckAt || 0);
    }
    function currentTask(kind) {
        var bridge = adapter(kind); if (!bridge) return null;
        var ctx = bridge.getContext();
        return store.list().find(function(task) { return task.context.key === ctx.key && ['waiting', 'received', 'expired', 'cancelled'].indexOf(task.status) !== -1; });
    }
    function open(title, content, drawer) {
        if (root.hidden) previousFocus = document.activeElement;
        root.querySelector('.ic-dialog').classList.toggle('ic-drawer', !!drawer);
        document.getElementById('infoDialogTitle').textContent = title;
        document.getElementById('infoDialogEyebrow').textContent = drawer ? '申请工作台' : '客户协作';
        document.getElementById('infoDialogBody').innerHTML = content;
        root.hidden = false;
        var focus = root.querySelector('[autofocus]') || root.querySelector('[data-info-close]');
        focus.focus();
    }
    function close() { root.hidden = true; if (previousFocus && previousFocus.isConnected) previousFocus.focus(); }
    function summary(task) {
        return '<div class="ic-context"><span class="ic-context-icon material-symbols-outlined" aria-hidden="true">domain</span><div><strong>' + escape(task.context.customer) + '</strong><p>' + escape(task.context.solutionName ? task.context.solutionName + ' · ' + task.context.product : task.context.product + ' 测试授权') + '</p></div><span class="ic-pill">仅收集设备信息</span></div>';
    }
    function canAutoSubmit(kind) {
        var bridge = adapter(kind);
        return !!(bridge && typeof bridge.canAutoSubmit === 'function' && bridge.canAutoSubmit());
    }
    function defaultEmail(kind) {
        var bridge = adapter(kind);
        if (bridge && typeof bridge.getRecipientEmail === 'function') return bridge.getRecipientEmail() || '';
        return '';
    }
    function validEmail(value) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim()); }
    function invite(kind) {
        activeKind = kind;
        var bridge = adapter(kind), ctx = bridge && bridge.getContext();
        if (!ctx || !ctx.customerId || !ctx.product || (kind === 'solution' && !ctx.solutionCode)) { notify('请先选择客户和产品（解决方案需先确定方案范围）。'); return; }
        var existing = currentTask(kind);
        if (existing && ['waiting', 'received'].includes(existing.status)) { showLink(existing); return; }
        activeDialogToken = '';
        var autoAllowed = canAutoSubmit(kind);
        open('发送设备信息上传链接', summary({ context: ctx }) +
            '<p class="ic-dialog-intro">平台将把上传链接发送到客户邮箱。客户上传并通过校验后，按你选择的发起方式进入申请。</p>' +
            '<label class="ic-field-label" for="infoCustomerEmail">客户邮箱</label>' +
            '<input class="ic-input" id="infoCustomerEmail" type="email" inputmode="email" placeholder="请输入客户邮箱" value="' + escape(defaultEmail(kind)) + '">' +
            '<p class="ic-field-error" id="infoEmailError" hidden role="alert"></p>' +
            '<label class="ic-checkbox' + (autoAllowed ? '' : ' is-disabled') + '"><input type="checkbox" id="infoAutoSubmit"' + (autoAllowed ? '' : ' disabled') + '> 客户上传校验通过后直接发起申请（无需我再确认）</label>' +
            '<p class="ic-hint">' + (autoAllowed ? '不勾选时，客户上传后由你查看设备信息并确认发起。' : '当前申请还有未完成的必填项，只能选择“客户上传后由我确认发起”。') + '</p>' +
            '<div class="ic-note"><span class="material-symbols-outlined" aria-hidden="true">info</span><p>上传链接有效期 7 天；平台仅通过邮件发送，不做企微消息联动。客户可一次上传多个 ' + escape(ctx.product) + ' 的 .info 文件；授权生成后客户可通过同一链接查看进度并下载授权文件。</p></div>' +
            '<footer class="ic-dialog-actions"><button type="button" class="ic-button ic-button-quiet" data-info-close>暂不发送</button><button type="button" class="ic-button" id="infoSendLink" autofocus><span class="material-symbols-outlined" aria-hidden="true">mail</span>发送邮件</button></footer>');
    }
    function sendLink() {
        var email = String((document.getElementById('infoCustomerEmail') || {}).value || '').trim();
        var errorEl = document.getElementById('infoEmailError');
        if (!validEmail(email)) {
            if (errorEl) { errorEl.hidden = false; errorEl.textContent = '请输入正确的客户邮箱地址。'; }
            return;
        }
        var auto = !!(document.getElementById('infoAutoSubmit') || {}).checked;
        if (auto && !canAutoSubmit(activeKind)) {
            if (errorEl) { errorEl.hidden = false; errorEl.textContent = '当前申请还有未完成的必填项，暂不能选择直接发起。'; }
            return;
        }
        var bridge = adapter(activeKind);
        var task = store.create(bridge.getContext(), bridge.capture());
        store.configure(task.token, { email: email, triggerMode: auto ? 'auto' : 'confirm' });
        store.setEmailStatus(task.token, 'sent');
        showLink(store.get(task.token));
        render();
        notify('上传链接已发送至 ' + email + '（演示环境为模拟发送）');
    }
    function triggerLabel(task) { return task.triggerMode === 'auto' ? '校验通过后直接发起申请' : '客户上传后由我确认发起'; }
    function emailLine(task) {
        if (!task.email) return '';
        var states = { pending: '邮件待发送', sent: '已发送至 ' + escape(task.email), failed: '发送失败（' + escape(task.email) + '）' };
        var state = states[task.emailStatus] || states.pending;
        return '<div class="ic-link-status"><span class="ic-status-dot' + (task.emailStatus === 'sent' ? ' is-received' : '') + '"></span>' + state + '<span>' + triggerLabel(task) + '</span></div>';
    }
    function showLink(task) {
        activeDialogToken = task.token; activeKind = task.context.kind;
        if (hasUnackedReminder(task)) { try { store.ackReminders(task.token); } catch (_) {} }
        var statusLine, title, actions;
        if (task.status === 'received') {
            title = task.triggerMode === 'auto' ? '客户已上传 · 自动发起申请' : '客户已上传 · 待确认发起';
            statusLine = '已收到 ' + escape(filesLabel(task)) + '<span>' + date(task.receivedAt) + '</span>';
            var autoState = task.autoSubmit || {};
            if (task.triggerMode === 'auto') {
                if (autoState.status === 'running') statusLine = '正在自动发起申请<span>' + date(task.receivedAt) + '</span>';
                else if (autoState.status === 'failed') statusLine = '自动发起失败：' + escape(autoState.message || '请手动确认') + '<span>' + date(autoState.at) + '</span>';
            }
            actions = task.triggerMode === 'auto' ?
                (autoState.status === 'failed' ? '<button type="button" class="ic-button" data-info-confirm="' + escape(task.token) + '">查看并手动发起</button>' : '<button type="button" class="ic-button" data-info-resume="' + escape(task.token) + '">查看关联文件</button>') :
                '<button type="button" class="ic-button" data-info-confirm="' + escape(task.token) + '">确认并发起申请</button>';
        } else if (task.status === 'completed') {
            title = '申请审批中';
            statusLine = '客户已上传，申请已提交审批<span>' + (task.application && task.application.no ? '申请编号 ' + escape(task.application.no) : '') + '</span>';
            actions = '';
        } else if (task.status === 'authorized') {
            title = '授权已生成';
            statusLine = '客户可通过同一链接下载授权文件<span>' + (task.authorization ? date(task.authorization.generatedAt) : '') + '</span>';
            actions = '';
        } else {
            title = '上传链接已发送';
            statusLine = task.emailStatus === 'failed' ? '邮件发送失败，请线下获取文件<span>有效期至 ' + date(task.expiresAt) + '</span>' : '等待客户上传<span>有效期至 ' + date(task.expiresAt) + '</span>';
            actions = '';
        }
        var dotCls = (task.status === 'received' || task.status === 'authorized') ? ' is-received' : '';
        var remindLine = '';
        var last = lastReminder(task);
        if (last) remindLine = '<div class="ic-link-status"><span class="ic-status-dot"></span>客户催办了进度<span>' + date(last.at) + '</span></div>';
        open(title, summary(task) +
            '<div class="ic-link-status"><span class="ic-status-dot' + dotCls + '"></span>' + statusLine + '</div>' + emailLine(task) + remindLine +
            '<div class="ic-link-tools"><a href="' + escape(link(task)) + '" target="_blank" rel="noopener">预览客户页面（演示用） <span aria-hidden="true">↗</span></a>' + (task.status === 'waiting' || task.status === 'received' ? '<button type="button" class="ic-text-button ic-muted" data-info-cancel="' + escape(task.token) + '">取消收集</button>' : '') + '</div>' +
            '<footer class="ic-dialog-actions"><button type="button" class="ic-button ic-button-quiet" data-info-close>关闭</button>' + actions + '</footer>');
    }
    function taskLabel(task) {
        if (task.status === 'waiting') return task.emailStatus === 'failed' ? '邮件发送失败' : '等待客户上传';
        if (task.status === 'received') {
            if (task.triggerMode === 'auto') {
                var state = task.autoSubmit || {};
                if (state.status === 'running') return '自动发起中';
                if (state.status === 'failed') return '自动发起失败';
                return '客户已上传 · 待自动发起';
            }
            return '客户已上传 · 待确认发起';
        }
        if (task.status === 'completed') return '申请审批中';
        if (task.status === 'authorized') return '授权已生成 · 待客户下载';
        if (task.status === 'expired') return '链接已过期';
        return '收集已取消';
    }
    function taskStateClass(task) {
        if (task.status === 'received' && task.autoSubmit && task.autoSubmit.status === 'failed') return 'expired';
        return task.status;
    }
    function showList(kind) {
        activeKind = kind; activeDialogToken = '';
        var tasks = store.list().filter(function(task) { return task.context.kind === kind && !(task.status === 'authorized' && task.downloadExpired); });
        tasks.forEach(function(task) { if (hasUnackedReminder(task)) { try { store.ackReminders(task.token); } catch (_) {} } });
        open('我的待办', '<p class="ic-dialog-intro">这里集中展示设备信息收集与申请进度；授权生成后客户通过同一链接下载授权文件。</p><div class="ic-task-list">' +
            (tasks.length ? tasks.map(function(task) {
                var active = task.status === 'waiting' || task.status === 'received';
                var remindBadge = lastReminder(task) ? '<p style="color:#b26a00;font-size:11px;margin:4px 0 0;">客户催办 · ' + date(lastReminder(task).at) + '</p>' : '';
                var modeBadge = task.status === 'waiting' && task.email ? '<p style="color:#68768a;font-size:11px;margin:4px 0 0;">' + (task.emailStatus === 'sent' ? '已邮件发送至 ' + escape(task.email) : '邮件发送失败') + ' · ' + triggerLabel(task) + '</p>' : '';
                var action;
                if (task.status === 'received' && task.triggerMode === 'confirm') action = '<button type="button" class="ic-button ic-button-secondary" data-info-confirm="' + escape(task.token) + '">确认并发起申请</button>';
                else if (task.status === 'received' && task.triggerMode === 'auto') action = (task.autoSubmit && task.autoSubmit.status === 'failed') ? '<button type="button" class="ic-button ic-button-secondary" data-info-confirm="' + escape(task.token) + '">查看并手动发起</button>' : '<button type="button" class="ic-text-button" data-info-detail="' + escape(task.token) + '">查看进度</button>';
                else if (task.status === 'waiting') action = '<button type="button" class="ic-text-button" data-info-detail="' + escape(task.token) + '">查看链接</button><button type="button" class="ic-text-button" data-info-resume="' + escape(task.token) + '">继续填写</button>';
                else if (task.status === 'completed' || task.status === 'authorized') action = '<button type="button" class="ic-text-button" data-info-detail="' + escape(task.token) + '">查看链接</button>';
                else action = '<button type="button" class="ic-text-button" data-info-renew="' + escape(task.token) + '">重新发起收集</button>';
                return '<article class="ic-task"><div class="ic-task-top"><strong>' + escape(task.context.customer) + '</strong><span class="ic-task-state ' + taskStateClass(task) + '">' + taskLabel(task) + '</span></div><p>' + escape(task.context.solutionName ? task.context.solutionName + ' · ' + task.context.product : task.context.product + ' 测试授权') + '</p>' +
                    (filesOf(task).length ? '<div class="ic-task-file"><span class="material-symbols-outlined" aria-hidden="true">description</span>' + escape(filesLabel(task)) + '</div>' : '') + modeBadge + remindBadge +
                    '<div class="ic-task-bottom"><small>' + (task.receivedAt ? '收到于 ' + date(task.receivedAt) : '创建于 ' + date(task.createdAt)) + '</small>' + action + '</div></article>';
            }).join('') : '<div class="ic-empty"><span class="material-symbols-outlined" aria-hidden="true">inbox</span><strong>暂时没有待办</strong><p>在硬件信息文件处点击“发送上传链接”，即可开始收集。</p></div>') + '</div>', true);
    }
    function renderBell() {
        var badge = document.getElementById('headerTodoBadge');
        var list = document.getElementById('headerTodoList');
        if (!badge && !list) return;
        var tasks = store.list().filter(function(task) { return ['waiting', 'received', 'completed'].indexOf(task.status) !== -1; });
        var actionable = tasks.filter(function(task) { return task.status === 'waiting' || task.status === 'received'; });
        if (badge) { badge.hidden = !actionable.length; badge.textContent = String(actionable.length); }
        if (!list) return;
        list.innerHTML = tasks.length ? tasks.map(function(task) {
            var action = '';
            if (task.status === 'received' && task.triggerMode === 'confirm') action = '<button type="button" class="primary" data-info-confirm="' + escape(task.token) + '">确认并发起</button>';
            else action = '<button type="button" data-info-detail="' + escape(task.token) + '">查看</button>';
            return '<div class="header-todo-item"><strong>' + escape(task.context.customer) + ' · ' + escape(task.context.product) + '</strong>' +
                '<p>' + taskLabel(task) + (task.email ? ' · ' + escape(task.email) : '') + '</p>' +
                '<div class="header-todo-actions">' + action + '</div></div>';
        }).join('') : '<div class="header-todo-empty">暂无待办</div>';
    }
    function render() {
        var tasks = store.list();
        document.querySelectorAll('[data-info-count]').forEach(function(el) {
            el.textContent = tasks.filter(function(task) { return task.context.kind === el.dataset.infoCount && ['waiting', 'received'].includes(task.status); }).length;
        });
        document.querySelectorAll('[data-info-status]').forEach(function(el) {
            var task = currentTask(el.dataset.infoStatus); el.hidden = !task;
            if (!task) return;
            var received = task.status === 'received';
            var failedAuto = received && task.triggerMode === 'auto' && task.autoSubmit && task.autoSubmit.status === 'failed';
            el.classList.toggle('is-received', received);
            var copy = received ? (task.triggerMode === 'auto' ? '客户已上传设备信息' : '客户已上传设备信息，待确认发起') : task.status === 'waiting' ? '等待客户上传设备信息' : task.status === 'expired' ? '上传链接已过期' : '资料收集已取消';
            if (failedAuto) copy = '自动发起失败，请手动确认';
            el.innerHTML = '<span class="material-symbols-outlined" aria-hidden="true">' + (received ? 'task_alt' : 'schedule') + '</span><div><strong>' + copy + '</strong><small>' + (received ? escape(filesLabel(task)) + ' · ' + date(task.receivedAt) : task.status === 'waiting' ? '有效期至 ' + date(task.expiresAt) + '，可先填写其他资料' : '需要文件时可重新发送上传链接') + '</small></div>' +
                (received && task.triggerMode === 'confirm' ? '<button type="button" class="ic-text-button" data-info-confirm="' + escape(task.token) + '">确认并发起申请</button>' : received ? '<button type="button" class="ic-text-button" data-info-detail="' + escape(task.token) + '">查看进度</button>' : task.status === 'waiting' ? '<button type="button" class="ic-text-button" data-info-detail="' + escape(task.token) + '">查看链接</button>' : '<button type="button" class="ic-text-button" data-info-invite="' + escape(task.context.kind) + '">重新发送</button>');
        });
        renderBell();
    }
    function resume(token, options) {
        var task = store.get(token); if (!task) throw new Error('收集记录不存在。');
        var bridge = adapter(task.context.kind);
        restoring = true;
        try {
            var needsRestore = bridge.getContext().key !== task.context.key;
            if (needsRestore) bridge.restore(task.snapshot);
            if (task.status === 'received') bridge.receive(filesOf(task), task.token, needsRestore ? task.snapshot : null);
        } finally { restoring = false; }
        close(); render();
        if (!options || !options.silent) notify(task.status === 'received' ? '客户文件已关联，请补全资料后提交授权申请。' : '已恢复申请资料，可继续填写。');
    }
    function submitTask(task, auto) {
        var bridge = adapter(task.context.kind);
        if (!bridge) throw new Error('当前页面不支持自动发起。');
        resume(task.token, { silent: true });
        bridge.submit();
        var latest = store.get(task.token);
        if (latest && ['completed', 'authorized'].indexOf(latest.status) !== -1) {
            if (auto) store.markAutoSubmit(task.token, 'done');
            notify(auto ? '客户已上传，申请已自动发起。' : '客户文件已关联，申请已提交。');
        } else if (auto) {
            store.markAutoSubmit(task.token, 'failed', '自动发起未完成，请手动确认');
            notify('自动发起未完成，请在「我的待办」中手动确认。');
        }
        render();
    }
    function confirmAndSubmit(token) {
        var task = store.get(token);
        if (!task) throw new Error('收集记录不存在。');
        submitTask(task, false);
    }
    function cancelContext(kind, key) {
        var changed = false;
        store.list().forEach(function(task) {
            if (task.context.kind !== kind || task.context.key !== key) return;
            if (['waiting', 'received'].indexOf(task.status) === -1) return;
            try { store.cancel(task.token); changed = true; } catch (_) {}
        });
        if (changed) {
            render();
            notify('已切换为手工上传，原客户上传链接已关闭。');
        }
    }
    function maybeAutoSubmit() {
        if (autoRunning) return;
        autoRunning = true;
        try {
            store.list().forEach(function(task) {
                if (task.triggerMode !== 'auto' || task.status !== 'received' || task.autoSubmit) return;
                try {
                    store.markAutoSubmit(task.token, 'running');
                    submitTask(store.get(task.token), true);
                } catch (error) {
                    try { store.markAutoSubmit(task.token, 'failed', error.message); } catch (_) {}
                    notify('自动发起失败：' + error.message);
                }
            });
        } finally { autoRunning = false; }
    }
    document.addEventListener('click', function(event) {
        var el = event.target.closest('button, a'); if (!el) return;
        try {
            if (el.hasAttribute('data-info-invite')) invite(el.dataset.infoInvite);
            else if (el.hasAttribute('data-info-list')) showList(el.dataset.infoList);
            else if (el.hasAttribute('data-info-close')) close();
            else if (el.id === 'infoSendLink') sendLink();
            else if (el.hasAttribute('data-info-detail')) showLink(store.get(el.dataset.infoDetail));
            else if (el.hasAttribute('data-info-resume')) resume(el.dataset.infoResume);
            else if (el.hasAttribute('data-info-confirm')) confirmAndSubmit(el.dataset.infoConfirm);
            else if (el.hasAttribute('data-info-cancel')) { store.cancel(el.dataset.infoCancel); close(); render(); notify('收集已取消，原上传链接已关闭。'); }
            else if (el.hasAttribute('data-info-renew')) { resume(el.dataset.infoRenew); invite(activeKind); }
        } catch (error) { notify(error.message); }
    });
    root.addEventListener('click', function(event) { if (event.target === root) close(); });
    root.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') close();
        if (event.key !== 'Tab') return;
        var focusables = Array.prototype.slice.call(root.querySelectorAll('button, a[href], input, textarea')).filter(function(el) { return !el.disabled && !el.hidden; });
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    function saveDraft() {
        if (restoring) return;
        try {
            ['hardware', 'solution'].forEach(function(kind) {
                var task = currentTask(kind); if (task && ['waiting', 'received'].includes(task.status)) store.updateDraft(task.token, adapter(kind).capture());
            }); render();
        } catch (error) { notify('资料暂存失败：' + error.message); }
    }
    document.addEventListener('input', function(event) { if (event.target.closest('#formsn, #content-solution')) saveDraft(); });
    document.addEventListener('change', function(event) { if (event.target.closest('#formsn, #content-solution')) saveDraft(); });
    document.addEventListener('click', function(event) { if (event.target.closest('#formsn, #content-solution, #navBar')) saveDraft(); });
    // Existing module switches stop bubbling; save after their own toggle handler.
    document.querySelectorAll('#content .toggle-switch').forEach(function(toggle) { toggle.addEventListener('click', saveDraft); });
    document.addEventListener('info-application-submitted', function(event) {
        var detail = event.detail || {};
        if (!detail.token) return;
        try {
            store.complete(detail.token, detail.applicationNo || '');
            if (detail.authorization) store.authorize(detail.token, detail.authorization);
            render();
        } catch (error) { notify(error.message); }
    });
    function refresh() {
        try {
            render();
            store.list().forEach(function(task) {
                var last = lastReminder(task);
                if (last && hasUnackedReminder(task)) {
                    var key = task.token + ':' + last.at;
                    if (!seenReminders[key]) {
                        seenReminders[key] = true;
                        notify('客户催办了「' + task.context.customer + '」的' + (last.stage === 'received' ? '申请提交' : '审批') + '进度。');
                    }
                }
            });
            if (!root.hidden && activeDialogToken) { var task = store.get(activeDialogToken); if (task && ['waiting', 'received', 'completed', 'authorized'].includes(task.status)) showLink(task); }
            else if (!root.hidden && root.querySelector('.ic-drawer')) showList(activeKind);
            maybeAutoSubmit();
        } catch (error) { notify(error.message); }
    }
    window.addEventListener('storage', refresh); window.addEventListener('focus', refresh);
    var panel = document.getElementById('solutionProductPanel');
    if (panel) new MutationObserver(function() { try { render(); } catch (error) { notify(error.message); } }).observe(panel, { childList: true });
    window.InfoCollectionUI = { store: store, resume: resume, render: render, renderBell: renderBell, cancelContext: cancelContext };
    refresh();
}());
