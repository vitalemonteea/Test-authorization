(function(root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.InfoCollection = factory();
}(typeof window !== 'undefined' ? window : globalThis, function() {
    'use strict';
    var STORAGE_KEY = 'test-authorization-info-collections-v1';
    var MAX_SIZE = 2 * 1024 * 1024;
    var UPLOAD_WINDOW_DAYS = 7;
    var DOWNLOAD_WINDOW_DAYS = 30;
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function parseFile(file, content, product) {
        if (!file || !/\.info$/i.test(file.name)) throw new Error('仅支持 .info 格式文件。');
        if (!file.size || !content || !content.trim()) throw new Error('文件为空，请重新导出设备信息文件。');
        if (file.size > MAX_SIZE || content.length > MAX_SIZE) throw new Error('文件不能超过 2 MB。');
        var fields = {};
        content.split(/\r?\n/).forEach(function(line) {
            var match = line.match(/^\s*([a-zA-Z][\w]*)\s*=\s*(.*?)\s*$/);
            if (match) fields[match[1]] = match[2];
        });
        if (fields.productLine && fields.productLine.toUpperCase() !== product.toUpperCase()) {
            throw new Error('文件中的产品为 ' + fields.productLine + '，与本次收集的 ' + product + ' 不一致。');
        }
        return { product: product, sn: fields.deviceSn || '', clusterId: fields.clusterId || '', deviceId: fields.deviceId || '' };
    }
    function createStore(storage) {
        function read() {
            var raw = storage.getItem(STORAGE_KEY);
            if (!raw) return [];
            var data = JSON.parse(raw);
            if (!Array.isArray(data)) throw new Error('收集记录无法读取，请联系申请人重新生成链接。');
            return data;
        }
        function write(data) { storage.setItem(STORAGE_KEY, JSON.stringify(data)); }
        function state(task) {
            if (task.status === 'waiting' && task.expiresAt <= Date.now()) task.status = 'expired';
            if (task.status === 'authorized' && task.authorization) {
                task.downloadExpired = task.authorization.downloadExpiresAt <= Date.now();
            }
            return task;
        }
        function change(token, update) {
            var data = read();
            var task = data.find(function(item) { return item.token === token; });
            if (!task) throw new Error('上传链接不存在，请联系申请人获取新链接。');
            update(state(task));
            write(data);
            return clone(task);
        }
        return {
            list: function() { return read().map(state).sort(function(a, b) { return b.createdAt - a.createdAt; }); },
            get: function(token) { var task = read().find(function(item) { return item.token === token; }); return task ? state(task) : null; },
            create: function(context, snapshot, now) {
                if (!context.customerId || !context.product || !context.key) throw new Error('请先选择客户和产品后再生成上传链接。');
                now = now === undefined ? Date.now() : now;
                var token = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() :
                    'collect-' + now.toString(36) + '-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
                var task = { token: token, context: clone(context), snapshot: clone(snapshot), status: 'waiting', createdAt: now,
                    expiresAt: now + UPLOAD_WINDOW_DAYS * 86400000, reminders: [],
                    email: '', emailStatus: 'pending', triggerMode: 'confirm', autoSubmit: null };
                var data = read(); data.push(task); write(data); return clone(task);
            },
            configure: function(token, options) {
                return change(token, function(task) {
                    if (options.email !== undefined) task.email = String(options.email || '').trim();
                    if (options.triggerMode !== undefined) {
                        if (['auto', 'confirm'].indexOf(options.triggerMode) === -1) throw new Error('未知的发起方式。');
                        task.triggerMode = options.triggerMode;
                    }
                });
            },
            setEmailStatus: function(token, status) { return change(token, function(task) { task.emailStatus = status; }); },
            markAutoSubmit: function(token, status, message) { return change(token, function(task) {
                task.autoSubmit = { status: status, message: message || '', at: Date.now() };
            }); },
            submit: function(token, files) {
                return change(token, function(task) {
                    if (task.status === 'received' || task.status === 'completed' || task.status === 'authorized') throw new Error('文件已提交，上传入口已关闭。');
                    if (task.status === 'expired') throw new Error('链接已过期，请联系申请人重新生成。');
                    if (task.status === 'cancelled') throw new Error('收集已取消，请联系申请人。');
                    if (!Array.isArray(files) || !files.length) throw new Error('请至少选择一个 .info 文件。');
                    task.files = files.map(function(file) {
                        var summary = parseFile(file, file.content, task.context.product);
                        return { name: file.name, size: file.size, content: file.content, summary: summary };
                    });
                    task.status = 'received'; task.receivedAt = Date.now();
                });
            },
            cancel: function(token) { return change(token, function(task) {
                if (task.status === 'completed' || task.status === 'authorized') throw new Error('申请已提交，无法取消收集。');
                if (task.status !== 'cancelled') task.status = 'cancelled';
            }); },
            updateDraft: function(token, snapshot) { return change(token, function(task) { task.snapshot = clone(snapshot); }); },
            complete: function(token, applicationNo) { return change(token, function(task) {
                if (task.status !== 'received') throw new Error('客户尚未提交设备信息文件。');
                task.status = 'completed';
                task.application = { no: applicationNo || '', submittedAt: Date.now() };
            }); },
            authorize: function(token, authorization, now) { return change(token, function(task) {
                if (task.status !== 'completed') throw new Error('申请尚未提交，无法生成授权。');
                now = now === undefined ? Date.now() : now;
                task.status = 'authorized';
                task.authorization = {
                    licenseCode: authorization.licenseCode || '',
                    fileName: authorization.fileName || '',
                    validity: authorization.validity || '',
                    generatedAt: now,
                    downloadExpiresAt: now + DOWNLOAD_WINDOW_DAYS * 86400000
                };
            }); },
            remind: function(token, now) { return change(token, function(task) {
                if (task.status !== 'received' && task.status !== 'completed') throw new Error('当前进度无需催办。');
                now = now === undefined ? Date.now() : now;
                var reminders = task.reminders || [];
                var last = reminders[reminders.length - 1];
                if (last && last.stage === task.status) throw new Error('已提醒过申请人，请耐心等待进度更新。');
                reminders.push({ at: now, stage: task.status });
                task.reminders = reminders;
            }); },
            ackReminders: function(token, now) { return change(token, function(task) {
                task.reminderAckAt = now === undefined ? Date.now() : now;
            }); }
        };
    }
    return { createStore: createStore, parseFile: parseFile, MAX_SIZE: MAX_SIZE,
        UPLOAD_WINDOW_DAYS: UPLOAD_WINDOW_DAYS, DOWNLOAD_WINDOW_DAYS: DOWNLOAD_WINDOW_DAYS, STORAGE_KEY: STORAGE_KEY };
}));
