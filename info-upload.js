(function() {
    'use strict';
    var Vue = window.Vue;
    if (!Vue || !window.ElementPlus || !window.InfoCollection) {
        var root = document.getElementById('customerUploadApp');
        root.removeAttribute('v-cloak');
        root.textContent = '页面资源未能加载，请刷新页面重试，或联系邀请人。';
        root.className = 'no-script';
        return;
    }
    var iconPaths = {
        shield: ['M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z', 'm8 12 3 3 5-6'],
        upload: ['M12 16V3m-5 5 5-5 5 5', 'M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5'],
        file: ['M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5Z', 'M14 3v5h5M8 12h8m-8 4h6'],
        help: ['M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4m.1 3h.01', 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z'],
        message: ['M21 11a8 8 0 0 1-8 8H7l-4 3V5a2 2 0 0 1 2-2h8a8 8 0 0 1 8 8Z', 'M7 8h9m-9 5h6'],
        arrow: ['M5 12h14m-5-5 5 5-5 5'],
        close: ['m6 6 12 12M6 18 18 6'],
        check: ['m5 12 4 4L19 6'],
        download: ['M12 3v13m-5-5 5 5 5-5', 'M4 17v4h16v-4']
    };
    var UploadIcon = {
        props: { name: String },
        setup: function(props) {
            return function() {
                return Vue.h('svg', { class:'upload-icon', viewBox:'0 0 24 24', fill:'none', stroke:'currentColor', 'stroke-width':1.6, 'stroke-linecap':'round', 'stroke-linejoin':'round', 'aria-hidden':'true' },
                    (iconPaths[props.name] || iconPaths.file).map(function(d) { return Vue.h('path', { d:d }); }));
            };
        }
    };
    function readToken() { try { return decodeURIComponent(location.hash.slice(1)); } catch (_) { return ''; } }
    function formatDate(value, year) {
        return new Date(value).toLocaleString('zh-CN', { year:year ? 'numeric' : undefined, month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false });
    }
    function formatSize(bytes) { return bytes < 1024 ? bytes + ' B' : (bytes / 1024).toFixed(1) + ' KB'; }
    var app = Vue.createApp({
        setup: function() {
            var task = Vue.ref(null), pendingFiles = Vue.ref([]), submitting = Vue.ref(false);
            var errorMessage = Vue.ref(''), helpOpen = Vue.ref([]), uploadControl = Vue.ref(null);
            var view = Vue.ref('result'), terminalTitle = Vue.ref(''), terminalMessage = Vue.ref('');
            var store, token = readToken(), version = 0;
            var ready = Vue.computed(function() { return pendingFiles.value.length > 0 && pendingFiles.value.every(function(entry) { return entry.status === 'ready'; }); });
            function terminal(title, message) {
                view.value = 'result'; terminalTitle.value = title; terminalMessage.value = message;
                pendingFiles.value = []; version++;
            }
            function refresh() {
                try {
                    task.value = store.get(token);
                    if (!task.value) { terminal('上传链接不可用', '当前链接无效，或对应的收集已不存在。'); return; }
                    var status = task.value.status;
                    if (status === 'waiting') { view.value = 'form'; return; }
                    if (['received', 'completed', 'authorized'].indexOf(status) !== -1) {
                        view.value = 'journey';
                        if (pendingFiles.value.length) { pendingFiles.value = []; version++; }
                        return;
                    }
                    if (status === 'expired') { terminal('上传链接已过期', '本次上传入口已关闭，请重新获取有效的邀请链接。'); return; }
                    if (status === 'cancelled') { terminal('此次收集已取消', '邀请人已关闭本次设备信息收集。'); return; }
                    terminal('上传链接不可用', '本次收集暂时无法处理，请联系邀请人。');
                } catch (_) { task.value = null; terminal('暂时无法读取上传信息', '请确认浏览器允许保存页面数据，然后重试。'); }
            }
            async function selectFile(uploadFile) {
                if (!task.value || view.value !== 'form' || submitting.value) return;
                var file = uploadFile.raw;
                if (!file) return;
                var generation = version, product = task.value.context.product;
                errorMessage.value = '';
                var key = file.name + ':' + file.size;
                pendingFiles.value = pendingFiles.value.filter(function(entry) { return entry.key !== key; });
                var entry = Vue.reactive({ key:key, name:file.name, size:file.size, status:'loading', error:'', summary:null, content:'', uploadFile:uploadFile });
                pendingFiles.value.push(entry);
                try {
                    if (!/\.info$/i.test(file.name)) throw new Error('仅支持 .info 文件，请重新选择。');
                    if (!file.size) throw new Error('文件为空，请重新导出。');
                    if (file.size > window.InfoCollection.MAX_SIZE) throw new Error('文件不能超过 2 MB。');
                    var content = await new Promise(function(resolve, reject) {
                        var reader = new FileReader();
                        reader.onload = function() { resolve(reader.result); };
                        reader.onerror = function() { reject(new Error('文件读取失败，请重新选择。')); };
                        reader.readAsText(file);
                    });
                    if (generation !== version) return;
                    entry.summary = window.InfoCollection.parseFile(file, content, product);
                    entry.content = content; entry.status = 'ready';
                } catch (err) {
                    if (generation !== version) return;
                    entry.status = 'error'; entry.error = err.message;
                }
            }
            function removeFile(key) {
                var entry = pendingFiles.value.find(function(item) { return item.key === key; });
                pendingFiles.value = pendingFiles.value.filter(function(entry) { return entry.key !== key; });
                if (entry && uploadControl.value) uploadControl.value.handleRemove(entry.uploadFile);
            }
            function submitFiles() {
                if (submitting.value || !ready.value || view.value !== 'form') return;
                submitting.value = true; errorMessage.value = '';
                try {
                    store.submit(token, pendingFiles.value.map(function(entry) { return { name:entry.name, size:entry.size, content:entry.content }; }));
                    refresh();
                    Vue.nextTick(function() { document.getElementById('uploadJourney').focus({ preventScroll:true }); });
                } catch (err) { refresh(); errorMessage.value = err.message; }
                finally { submitting.value = false; }
            }
            var remindedAt = Vue.computed(function() {
                if (!task.value) return 0;
                var reminders = task.value.reminders || [];
                for (var i = reminders.length - 1; i >= 0; i--) if (reminders[i].stage === task.value.status) return reminders[i].at;
                return 0;
            });
            function remind() {
                if (remindedAt.value) return;
                try { store.remind(token); refresh(); }
                catch (err) { errorMessage.value = err.message; }
            }
            var journeyTitle = Vue.computed(function() {
                return !task.value ? '' : { received:'设备信息已提交', completed:'授权申请审批中', authorized:'授权已生成' }[task.value.status] || '';
            });
            var journeyDescription = Vue.computed(function() {
                if (!task.value) return '';
                if (task.value.status === 'received') return task.value.triggerMode === 'auto' ? '文件校验已通过，系统将直接发起授权申请。' : '邀请人将核对设备信息，继续为你办理授权申请。';
                if (task.value.status === 'completed') return '申请人已提交授权申请，审批通过后将生成授权文件。';
                return task.value.downloadExpired ? '本链接的下载入口已失效。' : '请下载授权文件，并导入设备完成激活。';
            });
            var journeySteps = Vue.computed(function() {
                if (!task.value) return [];
                var t = task.value, stage = t.status;
                return [
                    { title:'设备信息已提交', type:'success', hollow:false, note: t.receivedAt ? formatDate(t.receivedAt) : '' },
                    { title:'授权申请审批', type:stage === 'received' ? 'info' : stage === 'authorized' ? 'success' : 'primary', hollow:stage === 'received',
                        note:stage === 'received' ? (t.triggerMode === 'auto' ? '等待系统发起授权申请' : '等待申请人提交申请') : (stage === 'authorized' ? '审批已通过' : '审批中') + (t.application && t.application.no ? ' · 申请编号 ' + t.application.no : '') },
                    { title:'授权生成与下载', type:stage === 'authorized' ? 'success' : 'info', hollow:stage !== 'authorized',
                        note:stage === 'authorized' ? formatDate(t.authorization.generatedAt) : '授权生成后可在此下载授权文件' }
                ];
            });
            var journeyNote = Vue.computed(function() {
                if (!task.value) return '';
                if (task.value.status === 'received') return '你可以先关闭页面，稍后通过此链接查看进度。长时间无进展时，可提醒申请人。';
                if (task.value.status === 'completed') return '审批通过后可在此下载授权文件，文件也将发送至申请时登记的邮箱。';
                return task.value.downloadExpired ? '授权文件已发送至申请时登记的邮箱；如需再次获取，请联系邀请人。' : '授权文件已同步发送至申请时登记的邮箱。下载入口保留至 ' + formatDate(task.value.authorization.downloadExpiresAt, true) + '。';
            });
            var expiryText = Vue.computed(function() {
                if (!task.value) return '设备信息收集与授权进度查询';
                if (task.value.status === 'waiting') return '上传链接有效期至 ' + formatDate(task.value.expiresAt, true);
                if (task.value.status === 'authorized' && !task.value.downloadExpired) return '下载入口有效期至 ' + formatDate(task.value.authorization.downloadExpiresAt, true);
                return '保留此链接，随时查看授权进度';
            });
            function downloadLicense() {
                if (!task.value || task.value.status !== 'authorized') return;
                refresh();
                if (!task.value || task.value.status !== 'authorized' || task.value.downloadExpired) return;
                var t = task.value, auth = t.authorization;
                var content = ['深信服测试授权文件（演示）', '====================', '', '客户：' + t.context.customer, '产品：' + t.context.product,
                    t.context.solutionName ? '所属方案：' + t.context.solutionName : '', '申请编号：' + (t.application && t.application.no || ''), '',
                    '授权码：' + auth.licenseCode, '实际授权有效期：' + (auth.validity || '以审批结果为准'), '生成时间：' + formatDate(auth.generatedAt, true), '',
                    '本文件为测试授权 Demo 演示文件，非生产授权。'].join('\n');
                var url = URL.createObjectURL(new Blob([content], { type:'text/plain;charset=utf-8' }));
                var link = document.createElement('a'); link.href = url; link.download = auth.fileName || '授权文件';
                document.body.appendChild(link); link.click(); link.remove();
                setTimeout(function() { URL.revokeObjectURL(url); }, 1000);
            }
            function switchInvitation() {
                token = readToken(); version++; pendingFiles.value = []; submitting.value = false; errorMessage.value = ''; helpOpen.value = [];
                if (uploadControl.value) uploadControl.value.clearFiles();
                refresh();
            }
            function focusMain() {
                var main = document.getElementById('uploadMain'); main.focus(); main.scrollIntoView({ block:'start' });
            }
            Vue.onMounted(function() {
                var input = document.querySelector('.device-upload input[type=file]');
                if (input) { input.id = 'customerInfoFile'; input.setAttribute('aria-label', '选择设备 info 文件，可多选'); }
                window.addEventListener('storage', refresh); window.addEventListener('focus', refresh); window.addEventListener('hashchange', switchInvitation);
            });
            Vue.onBeforeUnmount(function() {
                window.removeEventListener('storage', refresh); window.removeEventListener('focus', refresh); window.removeEventListener('hashchange', switchInvitation);
            });
            try { store = window.InfoCollection.createStore(localStorage); refresh(); }
            catch (_) { terminal('暂时无法打开上传页面', '请稍后重试，或联系邀请人。'); }
            return { task:task, pendingFiles:pendingFiles, submitting:submitting, errorMessage:errorMessage, helpOpen:helpOpen, uploadControl:uploadControl,
                view:view, terminalTitle:terminalTitle, terminalMessage:terminalMessage, ready:ready, selectFile:selectFile, removeFile:removeFile, submitFiles:submitFiles,
                remindedAt:remindedAt, remind:remind, journeyTitle:journeyTitle, journeyDescription:journeyDescription, journeySteps:journeySteps, journeyNote:journeyNote,
                expiryText:expiryText, downloadLicense:downloadLicense, formatDate:formatDate, formatSize:formatSize, focusMain:focusMain };
        }
    });
    app.component('upload-icon', UploadIcon);
    app.use(window.ElementPlus);
    app.mount('#customerUploadApp');
}());
