(function() {
    'use strict';
    function readToken() { try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return ''; } }
    var store, task, token = readToken();
    var pendingFiles = [], version = 0, submitting = false;
    function id(key) { return document.getElementById(key); }
    function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function date(value) { return new Date(value).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }); }
    function fullDate(value) { return new Date(value).toLocaleString('zh-CN', { year:'numeric', month:'2-digit', day:'2-digit', hour12:false }); }
    function size(bytes) { return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB'; }
    function error(message) { id('uploadError').hidden = false; id('uploadError').textContent = message; }
    var fileIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8l-4-5Z"/><path d="M14 3v5h4"/></svg>';
    var okIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
    function contextHtml() {
        return '<strong>' + escape(task.context.customer) + '</strong><dl><div><dt>收集产品</dt><dd>' + escape(task.context.product) + '</dd></div><div><dt>邀请人</dt><dd>' + escape(task.context.applicant) + '</dd></div>' + (task.context.solutionName ? '<div><dt>所属方案</dt><dd>' + escape(task.context.solutionName) + '</dd></div>' : '') + '</dl>';
    }
    function show(view) {
        id('uploadForm').hidden = view !== 'form';
        id('uploadJourney').hidden = view !== 'journey';
        id('uploadResult').hidden = view !== 'result';
        id('uploadSteps').hidden = view !== 'form';
    }
    function terminal(title, message, extraHtml, ok) {
        pendingFiles = []; version++;
        show('result');
        id('uploadResult').innerHTML = '<div class="journey-head"><div class="upload-file-icon" style="width:56px;height:56px;margin:0 auto 16px;border-radius:50%;background:' + (ok ? '#eaf8f0' : '#f1f3f7') + ';color:' + (ok ? '#217447' : '#68768a') + ';display:flex;align-items:center;justify-content:center;">' + (ok ? okIcon : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 7v6m0 3v1"/></svg>') + '</div><h2>' + escape(title) + '</h2><p>' + escape(message) + '</p></div>' + (extraHtml || '');
    }
    function filesHtml(files) {
        if (!files || !files.length) return '';
        return '<div class="journey-files"><strong>已提交的设备信息文件（' + files.length + '）</strong>' + files.map(function(file) {
            var bits = [];
            if (file.summary && file.summary.sn) bits.push('SN ' + file.summary.sn);
            if (file.summary && file.summary.clusterId) bits.push('集群 ' + file.summary.clusterId);
            return '<div>' + fileIcon + '<span>' + escape(file.name) + ' <small style="color:#68768a">' + size(file.size) + (bits.length ? ' · ' + escape(bits.join(' · ')) : '') + '</small></span></div>';
        }).join('') + '</div>';
    }
    function timelineHtml(stage) {
        // stage: received | completed | authorized
        var submittedAt = task.receivedAt;
        var applicationNo = task.application && task.application.no;
        var generatedAt = task.authorization && task.authorization.generatedAt;
        function node(key, title, sub) {
            var cls = stage === key ? 'current' : (stage === 'authorized' || (stage === 'completed' && key === 'received')) ? 'done' : 'todo';
            if (key === 'received') cls = 'done';
            if (key === 'completed' && stage === 'authorized') cls = 'done';
            return '<li class="' + cls + '"><strong>' + title + '</strong><small>' + sub + '</small></li>';
        }
        return '<ol class="journey-timeline">' +
            node('received', '设备信息已提交', submittedAt ? date(submittedAt) : '') +
            node('completed', '授权申请审批', stage === 'received' ? '等待申请人提交申请' : (applicationNo ? '审批中 · 申请编号 ' + applicationNo : '审批中')) +
            node('authorized', '授权生成与下载', stage === 'authorized' ? (generatedAt ? date(generatedAt) : '已生成') : '授权生成后可在此下载授权文件') +
            '</ol>';
    }
    function remindedAt(stage) {
        var reminders = task.reminders || [];
        for (var i = reminders.length - 1; i >= 0; i--) if (reminders[i].stage === stage) return reminders[i].at;
        return 0;
    }
    function remindButtonHtml() {
        var at = remindedAt(task.status);
        return '<button type="button" id="remindApplicant" class="ic-button remind"' + (at ? ' disabled' : '') + '>' + (at ? '已提醒申请人（' + date(at) + '）' : '催一下进度') + '</button>';
    }
    function journey() {
        var html = '';
        if (task.status === 'received') {
            var receivedText = task.triggerMode === 'auto' ?
                '文件校验已通过，系统将直接发起授权申请，你可以随时回到本页查看进度。' :
                '申请人将基于本次设备信息确认并发起授权申请，你可以随时回到本页查看进度。';
            var receivedNote = task.triggerMode === 'auto' ?
                '申请发起后本页将显示审批进度；长时间无进展时可点击上方按钮提醒申请人。' :
                '申请人确认后本页将显示审批进度；长时间无进展时可点击上方按钮提醒申请人。';
            html = '<div class="journey-head"><h2>设备信息已提交</h2><p>' + receivedText + '</p></div>' +
                timelineHtml('received') + filesHtml(task.files) +
                '<div class="journey-actions">' + remindButtonHtml() + '</div>' +
                '<p class="journey-note">' + receivedNote + '</p>';
        } else if (task.status === 'completed') {
            html = '<div class="journey-head"><h2>授权申请审批中</h2><p>申请人已提交授权申请，审批通过后将生成授权文件。</p></div>' +
                timelineHtml('completed') + filesHtml(task.files) +
                '<div class="journey-actions">' + remindButtonHtml() + '</div>' +
                '<p class="journey-note">审批通过后，本页可直接下载授权文件，授权文件同步发送至申请时登记的邮箱。</p>';
        } else if (task.status === 'authorized') {
            var auth = task.authorization || {};
            if (task.downloadExpired) {
                html = '<div class="journey-head"><h2>授权已生成</h2><p>本链接的下载入口已失效。</p></div>' + timelineHtml('authorized') +
                    '<p class="journey-note">授权文件已发送至申请时登记的邮箱；如需再次获取，请联系申请人。</p>';
            } else {
                html = '<div class="journey-head"><h2>授权已生成</h2><p>请下载授权文件并导入设备完成激活。</p></div>' + timelineHtml('authorized') +
                    '<div class="license-card"><strong>授权信息</strong><dl>' +
                    (auth.licenseCode ? '<div><dt>授权码</dt><dd>' + escape(auth.licenseCode) + '</dd></div>' : '') +
                    (auth.validity ? '<div><dt>实际授权有效期</dt><dd>' + escape(auth.validity) + '</dd></div>' : '') +
                    (auth.fileName ? '<div><dt>授权文件</dt><dd>' + escape(auth.fileName) + '</dd></div>' : '') +
                    '<div><dt>生成时间</dt><dd>' + date(auth.generatedAt) + '</dd></div></dl></div>' +
                    '<div class="journey-actions"><button type="button" id="downloadLicense" class="ic-button">下载授权文件</button></div>' +
                    '<p class="journey-note">授权文件已同步发送至申请时登记的邮箱；本页下载入口保留至 ' + fullDate(auth.downloadExpiresAt) + '。</p>';
            }
        }
        id('uploadJourney').innerHTML = html;
        show('journey');
    }
    function refresh() {
        try {
            task = store.get(token);
            if (!task) { terminal('上传链接不可用', '当前链接无效，或对应的收集已不存在。', '<p class="journey-note">请联系邀请人获取新的上传链接。</p>'); return; }
            id('uploadContext').hidden = false;
            id('uploadContext').innerHTML = contextHtml();
            if (task.status === 'waiting') {
                id('uploadExpiry').textContent = '上传链接有效期至 ' + date(task.expiresAt) + ' · 深信服测试授权平台';
                show('form'); renderFileList(); return;
            }
            if (task.status === 'received' || task.status === 'completed' || task.status === 'authorized') {
                id('uploadExpiry').textContent = task.status === 'authorized' && !task.downloadExpired ?
                    '下载入口有效期至 ' + date(task.authorization.downloadExpiresAt) + ' · 深信服测试授权平台' :
                    '深信服 · 测试授权设备信息收集';
                journey(); return;
            }
            if (task.status === 'expired') { terminal('上传链接已过期', '为确保设备信息关联准确，本次上传入口已关闭。', '<p class="journey-note">请联系邀请人获取新的上传链接。</p>'); return; }
            if (task.status === 'cancelled') { terminal('此次收集已取消', '申请人已关闭本次设备信息收集。', '<p class="journey-note">请联系邀请人获取新的上传链接。</p>'); return; }
        } catch (err) { terminal('暂时无法读取上传信息', '请确认浏览器允许保存页面数据，然后重试。'); }
    }
    function fileKey(file) { return file.name + ':' + file.size; }
    function renderFileList() {
        var list = id('uploadFileList');
        list.innerHTML = pendingFiles.map(function(entry) {
            var summary = '';
            if (entry.status === 'ready') {
                var bits = ['产品 ' + entry.summary.product];
                if (entry.summary.sn) bits.push('SN ' + entry.summary.sn);
                if (entry.summary.clusterId) bits.push('集群 ' + entry.summary.clusterId);
                summary = '<div class="upload-file-summary">' + bits.map(function(b) { var i = b.indexOf(' '); return '<span>' + escape(b.slice(0, i)) + ' <b>' + escape(b.slice(i + 1)) + '</b></span>'; }).join('') + '</div>';
            } else if (entry.status === 'error') {
                summary = '<div class="upload-file-error">' + escape(entry.error) + '</div>';
            } else {
                summary = '<div class="upload-file-summary"><span>正在检查文件…</span></div>';
            }
            return '<div class="upload-file-row' + (entry.status === 'error' ? ' is-invalid' : '') + '" data-file-key="' + escape(entry.key) + '">' +
                '<span class="upload-file-icon">' + (entry.status === 'ready' ? okIcon : fileIcon) + '</span>' +
                '<div class="upload-file-main"><div class="upload-file-name">' + escape(entry.name) + '<small>' + size(entry.size) + '</small></div>' + summary + '</div>' +
                '<button type="button" class="upload-file-remove" data-remove-file="' + escape(entry.key) + '" title="移除文件">&times;</button></div>';
        }).join('');
        var ready = pendingFiles.length > 0 && pendingFiles.every(function(entry) { return entry.status === 'ready'; });
        id('confirmInfoUpload').disabled = !ready || submitting;
        var countLabel = pendingFiles.length > 1 ? '确认提交 ' + pendingFiles.length + ' 个设备信息文件' : '确认提交设备信息';
        var modeLabel = task && task.triggerMode === 'auto' ? '校验通过后将直接发起申请' : '提交后由申请人确认发起';
        id('confirmInfoUpload').textContent = countLabel + ' · ' + modeLabel;
        id('uploadSteps').querySelectorAll('span').forEach(function(el, index) { el.classList.toggle('active', pendingFiles.length ? index < 2 : index === 0); });
    }
    async function addFiles(fileList) {
        var current = ++version;
        id('uploadError').hidden = true;
        var files = Array.prototype.slice.call(fileList || []);
        if (!files.length) return;
        for (var i = 0; i < files.length; i++) {
            var file = files[i];
            var key = fileKey(file);
            pendingFiles = pendingFiles.filter(function(entry) { return entry.key !== key; });
            var entry = { key: key, name: file.name, size: file.size, status: 'loading', file: file };
            pendingFiles.push(entry);
            renderFileList();
            try {
                if (!/\.info$/i.test(file.name)) throw new Error('仅支持 .info 文件');
                if (!file.size) throw new Error('文件为空，请重新导出');
                if (file.size > window.InfoCollection.MAX_SIZE) throw new Error('文件不能超过 2 MB');
                var content = await new Promise(function(resolve, reject) {
                    var reader = new FileReader(); reader.onload = function() { resolve(reader.result); }; reader.onerror = function() { reject(new Error('文件读取失败')); }; reader.readAsText(file);
                });
                if (current !== version) return;
                var summary = window.InfoCollection.parseFile(file, content, task.context.product);
                entry.content = content; entry.summary = summary; entry.status = 'ready';
            } catch (err) {
                if (current !== version) return;
                entry.status = 'error'; entry.error = err.message;
            }
            renderFileList();
        }
        id('uploadDropTitle').textContent = pendingFiles.length ? '继续添加文件' : '选择 info 文件（可多选）';
    }
    id('customerInfoFile').addEventListener('change', function() { addFiles(this.files); this.value = ''; });
    id('uploadDrop').addEventListener('dragover', function(event) { event.preventDefault(); this.classList.add('is-dragging'); });
    id('uploadDrop').addEventListener('dragleave', function() { this.classList.remove('is-dragging'); });
    id('uploadDrop').addEventListener('drop', function(event) { event.preventDefault(); this.classList.remove('is-dragging'); addFiles(event.dataTransfer.files); });
    id('uploadFileList').addEventListener('click', function(event) {
        var btn = event.target.closest('[data-remove-file]');
        if (!btn) return;
        pendingFiles = pendingFiles.filter(function(entry) { return entry.key !== btn.dataset.removeFile; });
        id('uploadDropTitle').textContent = pendingFiles.length ? '继续添加文件' : '选择 info 文件（可多选）';
        renderFileList();
    });
    id('confirmInfoUpload').addEventListener('click', function() {
        if (submitting || !pendingFiles.length || !pendingFiles.every(function(entry) { return entry.status === 'ready'; })) return;
        submitting = true; this.disabled = true;
        try {
            store.submit(token, pendingFiles.map(function(entry) { return { name: entry.name, size: entry.size, content: entry.content }; }));
            pendingFiles = []; submitting = false; refresh();
        } catch (err) {
            submitting = false; refresh();
            if (!id('uploadForm').hidden) { this.disabled = false; error(err.message); }
        }
    });
    id('uploadJourney').addEventListener('click', function(event) {
        var remind = event.target.closest('#remindApplicant');
        if (remind && !remind.disabled) {
            try {
                store.remind(token); refresh();
            } catch (err) { remind.textContent = err.message; remind.disabled = true; }
            return;
        }
        var download = event.target.closest('#downloadLicense');
        if (download && task && task.authorization) {
            var auth = task.authorization;
            var content = [
                '深信服测试授权文件（演示）', '====================', '',
                '客户：' + task.context.customer,
                '产品：' + task.context.product,
                task.context.solutionName ? '所属方案：' + task.context.solutionName : '',
                '申请编号：' + (task.application && task.application.no || ''), '',
                '授权码：' + auth.licenseCode,
                '实际授权有效期：' + (auth.validity || '以审批结果为准'),
                '生成时间：' + new Date(auth.generatedAt).toLocaleString('zh-CN'), '',
                '本文件为测试授权 Demo 演示文件，非生产授权。'
            ].filter(function(line) { return line !== null; }).join('\n');
            var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = auth.fileName || '授权文件';
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(function() { URL.revokeObjectURL(a.href); }, 1000);
        }
    });
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    window.addEventListener('hashchange', function() {
        token = readToken(); pendingFiles = []; version++; submitting = false;
        id('customerInfoFile').value = '';
        id('uploadError').hidden = true;
        id('uploadContext').hidden = true;
        id('confirmInfoUpload').disabled = true;
        id('uploadDropTitle').textContent = '选择 info 文件（可多选）';
        refresh();
    });
    try { store = window.InfoCollection.createStore(localStorage); refresh(); }
    catch (_) { terminal('暂时无法打开上传页面', '请稍后重试，或联系邀请人。'); }
}());
