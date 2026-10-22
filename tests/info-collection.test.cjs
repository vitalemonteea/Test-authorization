'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');
const modelPath = path.join(root, 'info-collection-model.js');
const model = fs.existsSync(modelPath) ? require(modelPath) : {};
const context = { kind: 'hardware', key: 'hardware:45:C100001', product: 'HCI', productId: '45', customer: '测试客户', customerId: 'C100001', applicant: '申请人' };
function memory(data) {
  return { getItem: key => data.get(key) || null, setItem: (key, value) => data.set(key, value) };
}
function store(data) {
  data = data || new Map();
  return model.createStore(memory(data));
}
function file(name, content, size) {
  return { name, size: size === undefined ? (content ? content.length : 20) : size, content };
}
function loadCollectionUi() {
  const result = loadV2Dom();
  for (const name of ['info-collection-model.js', 'info-collection-ui.js']) {
    const target = path.join(root, name);
    if (fs.existsSync(target)) result.window.eval(fs.readFileSync(target, 'utf8'));
  }
  return result;
}
function loadUploadRuntime(window) {
  window.requestAnimationFrame = callback => window.setTimeout(callback, 0);
  window.cancelAnimationFrame = handle => window.clearTimeout(handle);
  for (const name of ['vendor/vue/vue.global.prod.js', 'vendor/element-plus/index.full.min.js', 'info-upload.js']) {
    window.eval(fs.readFileSync(path.join(root, name), 'utf8'));
  }
}
function seedUploadPage(task, data) {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'info-upload.html'), 'utf8'), { url: 'http://localhost/info-upload.html', runScripts: 'outside-only' });
  dom.window.InfoCollection = model;
  const raw = data.get(model.STORAGE_KEY);
  if (raw) dom.window.localStorage.setItem(model.STORAGE_KEY, raw);
  dom.window.location.hash = task.token;
  loadUploadRuntime(dom.window);
  return { dom, document: dom.window.document, window: dom.window, store: model.createStore(dom.window.localStorage) };
}

test('收到文件关闭上传入口，并保留首次提交的文件清单', () => {
  assert.equal(typeof model.createStore, 'function', '应提供收集任务模型');
  const s = store();
  const task = s.create(context, { email: 'original@example.com' });
  s.submit(task.token, [file('customer.info', 'productLine=HCI\ndeviceSn=SN-CUSTOMER-1')]);
  assert.equal(s.get(task.token).status, 'received');
  assert.equal(s.get(task.token).files.length, 1);
  assert.equal(s.get(task.token).files[0].summary.sn, 'SN-CUSTOMER-1');
  assert.throws(() => s.submit(task.token, [file('changed.info', 'productLine=HCI')]), /已提交/);
  assert.equal(s.get(task.token).files[0].name, 'customer.info');
});

test('支持一次提交多个 info 文件，并逐文件解析设备摘要', () => {
  const s = store();
  const task = s.create(context, {});
  s.submit(task.token, [
    file('hci-a.info', 'productLine=HCI\ndeviceSn=SN-A\nclusterId=CLUSTER-A'),
    file('hci-b.info', 'productLine=HCI\ndeviceSn=SN-B\nclusterId=CLUSTER-B')
  ]);
  const saved = s.get(task.token);
  assert.equal(saved.files.length, 2);
  assert.deepEqual(saved.files.map(f => f.summary.sn), ['SN-A', 'SN-B']);
  assert.deepEqual(saved.files.map(f => f.summary.clusterId), ['CLUSTER-A', 'CLUSTER-B']);
});

test('错误产品、空文件、非 info 文件都不会完成资料收集', () => {
  const s = store();
  const task = s.create(context, {});
  for (const [files, message] of [
    [[file('a.txt', 'abc')], /info/],
    [[file('empty.info', '', 0)], /空/],
    [[file('scp.info', 'productLine=SCP')], /产品/],
    [[file('big.info', 'a', 3 * 1024 * 1024)], /2 MB/]
  ]) assert.throws(() => s.submit(task.token, files), message);
  assert.equal(s.get(task.token).status, 'waiting');
});

test('文件数量不设上限，与 W3 多文件上传能力保持一致', () => {
  const s = store();
  const task = s.create(context, {});
  const files = Array.from({ length: 20 }, (_, i) => file('device-' + i + '.info', 'productLine=HCI\ndeviceSn=SN-' + i));
  s.submit(task.token, files);
  assert.equal(s.get(task.token).files.length, 20);
});

test('到期、取消和不存在的链接均拒绝文件提交', () => {
  const s = store();
  const expired = s.create(context, {}, Date.now() - 8 * 86400000);
  assert.equal(s.get(expired.token).status, 'expired');
  assert.throws(() => s.submit(expired.token, [file('a.info', 'productLine=HCI')]), /过期/);
  const cancelled = s.create(context, {});
  s.cancel(cancelled.token);
  assert.throws(() => s.submit(cancelled.token, [file('a.info', 'productLine=HCI')]), /取消/);
  assert.throws(() => s.submit('unknown', [file('a.info', 'productLine=HCI')]), /不存在/);
});

test('申请提交后可依次进入 delivered 与 authorized，且授权下载窗口独立计算', () => {
  const now = Date.now();
  const s = store();
  const task = s.create(context, {}, now);
  s.submit(task.token, [file('a.info', 'productLine=HCI')]);
  assert.throws(() => s.authorize(task.token, { licenseCode: 'LIC-X' }, now), /尚未提交/);
  s.complete(task.token, 'AUTH-12345678');
  assert.equal(s.get(task.token).status, 'completed');
  assert.equal(s.get(task.token).application.no, 'AUTH-12345678');
  s.authorize(task.token, { licenseCode: 'LIC-X', fileName: '授权信息-AUTH-12345678', validity: '至 2026-12-31' }, now);
  const authorized = s.get(task.token);
  assert.equal(authorized.status, 'authorized');
  assert.equal(authorized.authorization.licenseCode, 'LIC-X');
  assert.equal(authorized.authorization.downloadExpiresAt, now + model.DOWNLOAD_WINDOW_DAYS * 86400000);
  assert.equal(authorized.downloadExpired, false);
  const later = model.createStore({
    getItem: () => JSON.stringify([Object.assign({}, authorized, { authorization: Object.assign({}, authorized.authorization, { downloadExpiresAt: now - 1 }) })]),
    setItem: () => {}
  });
  assert.equal(later.get(task.token).downloadExpired, true);
});

test('客户催办按阶段去重，申请人确认后不再重复提示', () => {
  const now = Date.now();
  const s = store();
  const task = s.create(context, {}, now);
  assert.throws(() => s.remind(task.token), /无需催办/);
  s.submit(task.token, [file('a.info', 'productLine=HCI')]);
  s.remind(task.token, now + 1000);
  assert.throws(() => s.remind(task.token, now + 2000), /已提醒/);
  s.complete(task.token, 'AUTH-1', now + 3000);
  s.remind(task.token, now + 4000);
  assert.equal(s.get(task.token).reminders.length, 2);
  s.ackReminders(task.token, now + 5000);
  assert.equal(s.get(task.token).reminderAckAt, now + 5000);
});

test('尚未选择客户时不发送链接；发送时填写客户邮箱并默认由申请人确认发起', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    assert.equal(typeof window.InfoCollectionUI.invite, 'function', '应提供发送上传链接的入口');
    window.InfoCollectionUI.invite('hardware');
    assert.equal(window.InfoCollectionUI.store.list().length, 0);
    assert.match(document.getElementById('infoCollectionFeedback').textContent, /客户/);
    const search = document.getElementById('customerSearchInput');
    search.value = 'C100001';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('#customerDropdown [data-id="C100001"]').click();
    window.InfoCollectionUI.invite('hardware');
    assert.ok(document.getElementById('infoCustomerEmail'), '发送弹窗应要求填写客户邮箱');
    assert.equal(document.querySelector('input[name="infoTriggerMode"][value="confirm"]').checked, true);
    assert.equal(document.querySelector('input[name="infoTriggerMode"][value="auto"]').disabled, true);
    document.getElementById('infoCustomerEmail').value = 'not-an-email';
    document.getElementById('infoSendLink').click();
    assert.equal(window.InfoCollectionUI.store.list().length, 0);
    assert.match(document.getElementById('infoEmailError').textContent, /邮箱/);
    document.getElementById('infoCustomerEmail').value = 'customer@example.com';
    document.getElementById('infoSendLink').click();
    const task = window.InfoCollectionUI.store.list()[0];
    assert.equal(task.email, 'customer@example.com');
    assert.equal(task.emailStatus, 'sent');
    assert.equal(task.triggerMode, 'confirm');
    assert.match(document.getElementById('infoCollectionFeedback').textContent, /发送至 customer@example.com/);
    assert.match(document.getElementById('infoDialogBody').textContent, /等待外部上传/);
  } finally { dom.window.close(); }
});

test('申请信息齐全时可选择客户上传后直接发起申请', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    document.getElementById('cloudVersion').value = '6.8.1_1';
    document.getElementById('authScene').value = 'first';
    document.getElementById('planDevType').value = '1';
    document.getElementById('unifiedDate').value = '2026-12-31';
    document.getElementById('requestAction').value = 'open';
    assert.equal(window.InfoCollectionApplication.canAutoSubmit(), true, '信息齐全时应允许直接发起');
    window.InfoCollectionUI.invite('hardware');
    assert.equal(document.querySelector('input[name="infoTriggerMode"][value="auto"]').disabled, false);
    document.querySelector('input[name="infoTriggerMode"][value="auto"]').checked = true;
    document.getElementById('infoCustomerEmail').value = 'customer@example.com';
    document.getElementById('infoSendLink').click();
    assert.equal(window.InfoCollectionUI.store.list()[0].triggerMode, 'auto');
  } finally { dom.window.close(); }
});

test('接收客户多个文件后恢复原申请对象并逐文件加载设备事实', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    assert.ok(window.InfoCollectionApplication, '应提供原申请流程适配器');
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    window.InfoCollectionUI.store.submit(task.token, [
      file('customer-a.info', 'productLine=HCI\ndeviceSn=SN-FROM-CUSTOMER-A'),
      file('customer-b.info', 'productLine=HCI\ndeviceSn=SN-FROM-CUSTOMER-B')
    ]);
    document.getElementById('plname').value = '19';
    fireChange(document.getElementById('plname'), window);
    window.InfoCollectionUI.resume(task.token);
    assert.equal(document.getElementById('plname').value, '45');
    assert.equal(window.applicationState.customerId, 'C100001');
    assert.equal(window.getTrustedDeviceFacts().length, 2);
    assert.equal(document.getElementById('hwFileInput').files.length, 0);
    const received = window.InfoCollectionApplication.getFiles();
    assert.equal(received.length, 2);
    assert.equal(received[1].name, 'customer-b.info');
    assert.equal(document.getElementById('hwFileList').children.length, 2);
    document.getElementById('hwFileClear').click();
    assert.equal(window.InfoCollectionApplication.getFiles().length, 0);
    assert.equal(window.getTrustedDeviceFacts().length, 0);
  } finally { dom.window.close(); }
});

test('填写资料后立即切换产品，再找回任务仍保留最新输入', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    document.getElementById('userEmail').value = 'latest@example.com';
    document.getElementById('userEmail').dispatchEvent(new window.Event('input', { bubbles: true }));
    document.getElementById('plname').value = '19';
    fireChange(document.getElementById('plname'), window);
    window.InfoCollectionUI.resume(task.token);
    assert.equal(document.getElementById('userEmail').value, 'latest@example.com');
  } finally { dom.window.close(); }
});

test('解决方案续填恢复业务参数，并保持借测单设备 ID 锁定', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    const search = document.getElementById('solutionBorrowCustomerSearch');
    search.value = 'C100101';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-solution-borrow-customer="C100101"]').click();
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-001';
    document.getElementById('solutionBorrowLookup').click();
    const snapshot = window.SolutionInfoCollection.capture();
    const borrowedDevice = snapshot.application.params.HCI.deviceId;
    const task = window.InfoCollectionUI.store.create(window.SolutionInfoCollection.getContext(), snapshot);
    window.InfoCollectionUI.store.submit(task.token, [
      file('borrowed-a.info', 'productLine=HCI\nclusterId=CLUSTER-CUSTOMER-A\ndeviceId=DIFFERENT-DEVICE'),
      file('borrowed-b.info', 'productLine=HCI\nclusterId=CLUSTER-CUSTOMER-B')
    ]);
    document.getElementById('solutionSourceSelect').value = 'local';
    fireChange(document.getElementById('solutionSourceSelect'), window);
    window.InfoCollectionUI.resume(task.token);
    const current = window.SolutionInfoCollection.capture();
    assert.equal(current.context.borrowNumber, 'BOR-202608-001');
    assert.equal(current.application.params.HCI.deviceId, borrowedDevice);
    assert.equal(current.application.params.HCI.clusterId, 'CLUSTER-CUSTOMER-A');
    assert.equal(current.application.params.HCI.infoFiles.length, 2);
    assert.match(current.application.params.HCI.infoFile, /等 2 个文件/);
    assert.equal(document.querySelector('#solutionProductPanel [data-solution-param="deviceId"]').readOnly, true);
  } finally { dom.window.close(); }
});

test('解决方案设备信息非必填：提交缺少设备信息时弹出操作引导，可直接发链接', async () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    const search = document.getElementById('solutionBorrowCustomerSearch');
    search.value = 'C100101';
    search.dispatchEvent(new window.Event('input', { bubbles: true }));
    document.querySelector('[data-solution-borrow-customer="C100101"]').click();
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-001';
    document.getElementById('solutionBorrowLookup').click();

    const block = document.querySelector('#solutionProductPanel [data-solution-device-block]');
    assert.ok(block, 'HCI 参数区应提供设备信息字段');
    assert.equal(block.querySelectorAll('input[name="solutionDeviceMode"]').length, 0, '不应提供自己上传/客户上传的模式单选');
    assert.equal(block.querySelector('[data-info-invite]'), null, '字段内不再提前提供发送链接入口');
    assert.equal(block.querySelector('.solution-required'), null, '设备信息不再标记必填');

    // 清掉借测单带入的模拟文件，模拟“尚未拿到设备信息”
    const input = block.querySelector('input[data-solution-param="infoFile"]');
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));

    document.getElementById('solutionSubmitWhole').click();
    const guide = document.getElementById('deviceInfoGuideOverlay');
    assert.ok(guide && !guide.hidden, '提交时缺少设备信息应弹出操作引导');
    assert.match(guide.textContent, /发送链接让外部上传/);
    assert.match(guide.textContent, /我自己上传/);
    guide.querySelector('[data-device-guide-invite]').click();
    assert.equal(guide.hidden, true, '选择发送链接后引导应关闭');

    assert.ok(document.getElementById('infoCustomerEmail'), '引导后应打开发送链接弹窗');
    assert.equal(document.querySelector('input[name="infoTriggerMode"][value="confirm"]').checked, true);
    document.getElementById('infoCustomerEmail').value = 'customer@example.com';
    document.getElementById('infoSendLink').click();
    assert.match(document.getElementById('infoDialogBody').textContent, /等待外部上传/);

    let copied = '';
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: (text) => { copied = text; return Promise.resolve(); } }
    });
    document.querySelector('#infoDialogBody [data-info-copy]').click();
    await Promise.resolve();
    assert.match(copied, /【设备信息收集】/);
    assert.match(copied, /info-upload\.html#/);
    assert.match(copied, /支持多选/);
    assert.match(copied, /有效期至/);

    document.querySelector('[data-info-continue]').click();
    assert.equal(document.getElementById('infoCollectionOverlay').hidden, true);
    assert.match(block.textContent, /上传链接已发送/);
    assert.equal(block.querySelector('[data-solution-device-self]').hidden, true, '等待外部上传期间应收起上传面板');

    const switchSelf = block.querySelector('[data-solution-device-switch="self"]');
    assert.ok(switchSelf, '等待中应可改由自己上传');
    switchSelf.click();
    assert.equal(block.querySelector('[data-solution-device-self]').hidden, false, '取消收集后应回到上传面板');
  } finally { dom.window.close(); }
});

test('重复继续同一任务保留已启用模块；刷新后恢复 name 字段和模块开关', () => {
  const first = loadCollectionUi();
  let persisted, token;
  try {
    first.window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    const task = first.window.InfoCollectionUI.store.create(first.window.InfoCollectionApplication.getContext(), first.window.InfoCollectionApplication.capture());
    token = task.token;
    first.window.InfoCollectionUI.store.submit(token, [file('customer.info', 'productLine=HCI')]);
    first.window.InfoCollectionUI.resume(token);
    first.document.querySelector('#module-aSV .toggle-switch').click();
    const cpu = first.document.querySelector('[name="aSVhost_cpu"]');
    cpu.value = '12'; cpu.dispatchEvent(new first.window.Event('input', { bubbles: true }));
    first.window.InfoCollectionUI.resume(token);
    assert.equal(first.document.querySelector('#module-aSV .toggle-switch').classList.contains('active'), true);
    persisted = first.window.localStorage.getItem(model.STORAGE_KEY);
  } finally { first.dom.window.close(); }
  const second = loadCollectionUi();
  try {
    second.window.localStorage.setItem(model.STORAGE_KEY, persisted);
    second.window.InfoCollectionUI.resume(token);
    assert.equal(second.document.querySelector('[name="aSVhost_cpu"]').value, '12');
    assert.equal(second.document.querySelector('#module-aSV .toggle-switch').classList.contains('active'), true);
  } finally { second.dom.window.close(); }
});

test('解决方案替换客户文件后不会继续使用旧文件自动填入的集群事实', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    const search = document.getElementById('solutionBorrowCustomerSearch');
    search.value = 'C100101'; search.dispatchEvent(new window.Event('input', { bubbles:true }));
    document.querySelector('[data-solution-borrow-customer="C100101"]').click();
    document.getElementById('solutionBorrowOrder').value = 'BOR-202608-001'; document.getElementById('solutionBorrowLookup').click();
    window.SolutionInfoCollection.receive([{ name:'customer.info', size:50, summary:{clusterId:'OLD-CLUSTER'} }], 'old-token');
    const input = document.querySelector('#solutionProductPanel input[data-solution-param="infoFile"]');
    Object.defineProperty(input, 'files', { value:[new window.File(['productLine=HCI'], 'replacement.info')] });
    fireChange(input, window);
    assert.equal(window.SolutionInfoCollection.capture().application.params.HCI.clusterId, '');
    assert.equal(window.SolutionInfoCollection.capture().application.params.HCI.collectionToken, undefined);
    assert.equal(window.SolutionInfoCollection.capture().application.params.HCI.infoFiles.length, 1);
  } finally { dom.window.close(); }
});

test('客户在同一上传页切换邀请链接时展示新任务，不沿用上一份收集', async () => {
  const dom = new JSDOM(fs.readFileSync(path.join(root, 'info-upload.html'), 'utf8'), { url:'http://localhost/info-upload.html', runScripts:'outside-only' });
  try {
    dom.window.InfoCollection = model;
    const s = model.createStore(dom.window.localStorage);
    const first = s.create(context, {});
    const second = s.create({ ...context, key:'hardware:45:C100002', customerId:'C100002', customer:'第二位客户' }, {});
    dom.window.location.hash = first.token;
    loadUploadRuntime(dom.window);
    assert.match(dom.window.document.getElementById('uploadContext').textContent, /测试客户/);
    dom.window.location.hash = second.token;
    dom.window.dispatchEvent(new dom.window.HashChangeEvent('hashchange'));
    await dom.window.Vue.nextTick();
    assert.match(dom.window.document.getElementById('uploadContext').textContent, /第二位客户/);
    assert.equal(dom.window.document.getElementById('uploadForm').hidden, false);
    assert.equal(dom.window.document.getElementById('customerInfoFile').multiple, true);
  } finally { dom.window.close(); }
});

test('中间页按 received / completed / authorized 展示进度、催办与下载', () => {
  const data = new Map();
  const s = store(data);
  const task = s.create(context, {});
  s.submit(task.token, [file('a.info', 'productLine=HCI'), file('b.info', 'productLine=HCI')]);
  const received = seedUploadPage(task, data);
  try {
    const { document } = received;
    assert.equal(document.getElementById('uploadForm').hidden, true);
    assert.match(document.getElementById('uploadJourney').textContent, /设备信息已提交/);
    assert.match(document.getElementById('uploadJourney').textContent, /已提交的设备信息文件（2）/);
    document.getElementById('remindApplicant').click();
    assert.equal(received.store.get(task.token).reminders.length, 1);
  } finally { received.dom.window.close(); }

  s.complete(task.token, 'AUTH-88888888');
  const completed = seedUploadPage(task, data);
  try {
    assert.match(completed.document.getElementById('uploadJourney').textContent, /授权申请审批中/);
    assert.match(completed.document.getElementById('uploadJourney').textContent, /AUTH-88888888/);
  } finally { completed.dom.window.close(); }

  s.authorize(task.token, { licenseCode: 'LIC-88888888', fileName: '授权信息-AUTH-88888888', validity: '至 2026-12-31' });
  const authorized = seedUploadPage(task, data);
  try {
    const text = authorized.document.getElementById('uploadJourney').textContent;
    assert.match(text, /授权已生成/);
    assert.match(text, /LIC-88888888/);
    assert.match(text, /2026-12-31/);
    assert.ok(authorized.document.getElementById('downloadLicense'), '应提供授权文件下载入口');
    assert.match(authorized.document.getElementById('uploadExpiry').textContent, /下载入口有效期至/);
  } finally { authorized.dom.window.close(); }
});

test('客户中间页支持一次选择并提交多个 info 文件', async () => {
  const data = new Map();
  const s = store(data);
  const task = s.create(context, {});
  const page = seedUploadPage(task, data);
  try {
    const { document, window } = page;
    await new Promise(resolve => setTimeout(resolve, 20));
    const input = document.getElementById('customerInfoFile');
    const first = new window.File(['productLine=HCI\ndeviceSn=SN-A'], 'hci-a.info', { type: 'text/plain' });
    const second = new window.File(['productLine=HCI\ndeviceSn=SN-B'], 'hci-b.info', { type: 'text/plain' });
    Object.defineProperty(input, 'files', { configurable: true, value: [first, second] });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    for (let i = 0; i < 50 && document.getElementById('confirmInfoUpload').disabled; i++) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    assert.equal(document.querySelectorAll('#uploadFileList .upload-file-row').length, 2);
    assert.match(document.querySelector('.file-list-head').textContent, /已选择 2 个文件/);
    document.getElementById('confirmInfoUpload').click();
    await window.Vue.nextTick();
    const saved = page.store.get(task.token);
    assert.equal(saved.status, 'received');
    assert.equal(saved.files.length, 2);
    assert.deepEqual(saved.files.map(f => f.summary.sn), ['SN-A', 'SN-B']);
    assert.match(document.getElementById('uploadJourney').textContent, /设备信息已提交/);
  } finally { page.dom.window.close(); }
});

test('触发方式 A：客户上传后自动发起申请并进入授权状态', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    document.getElementById('cloudVersion').value = '6.8.1_1';
    document.getElementById('authScene').value = 'first';
    document.getElementById('planDevType').value = '1';
    document.getElementById('unifiedDate').value = '2026-12-31';
    document.getElementById('requestAction').value = 'open';
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    window.InfoCollectionUI.store.configure(task.token, { email: 'customer@example.com', triggerMode: 'auto' });
    window.InfoCollectionUI.store.submit(task.token, [file('customer.info', 'productLine=HCI\ndeviceSn=SN-AUTO')]);
    window.dispatchEvent(new window.Event('focus'));
    const saved = window.InfoCollectionUI.store.get(task.token);
    assert.equal(saved.status, 'authorized', '触发方式 A 应在客户上传后自动提交');
    assert.equal(saved.autoSubmit.status, 'done');
    assert.ok(saved.application && saved.application.no, '应写入申请编号');
  } finally { dom.window.close(); }
});

test('触发方式 B：客户上传后停在待确认，确认后发起申请', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    document.getElementById('cloudVersion').value = '6.8.1_1';
    document.getElementById('authScene').value = 'first';
    document.getElementById('planDevType').value = '1';
    document.getElementById('unifiedDate').value = '2026-12-31';
    document.getElementById('requestAction').value = 'open';
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    window.InfoCollectionUI.store.configure(task.token, { email: 'customer@example.com', triggerMode: 'confirm' });
    window.InfoCollectionUI.store.submit(task.token, [file('customer.info', 'productLine=HCI\ndeviceSn=SN-CONFIRM')]);
    window.dispatchEvent(new window.Event('focus'));
    assert.equal(window.InfoCollectionUI.store.get(task.token).status, 'received', '触发方式 B 不应自动提交');
    const status = document.querySelector('[data-info-status="hardware"]');
    assert.match(status.textContent, /待确认发起/);
    status.querySelector('[data-info-confirm]').click();
    const saved = window.InfoCollectionUI.store.get(task.token);
    assert.equal(saved.status, 'authorized');
    assert.ok(saved.application && saved.application.no);
  } finally { dom.window.close(); }
});

test('HCI 文件模式同时展示设备ID：上传 info 自动回填，也支持手工输入', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    const item = document.getElementById('deviceIdFormItem');
    assert.equal(item.hidden, false, 'HCI 应展示设备ID字段');
    assert.notEqual(item.style.display, 'none');
    assert.equal(document.getElementById('chipInput').disabled, false, '设备ID输入框应可编辑');
    const input = document.getElementById('hwFileInput');
    Object.defineProperty(input, 'files', { configurable: true, value: [new window.File(['productLine=HCI'], 'HCI-DEMO.info')] });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.ok(document.querySelectorAll('#chipContainer .chip-item').length >= 1, '上传 info 后应回填设备ID');
    assert.ok(document.getElementById('devIdNew').value.includes('HCI-INFO'), '设备ID隐藏字段应同步');
    window.addChip('MANUAL-001');
    const facts = window.getTrustedDeviceFacts();
    assert.ok(facts.some(fact => fact.deviceId === 'MANUAL-001'), '手工输入设备ID应生成设备事实');
  } finally { dom.window.close(); }
});

test('授权模块默认全部展示并展开', () => {
  const { dom, document } = loadV2Dom();
  try {
    assert.equal(document.querySelector('#content .module-toolbar').hidden, false, '模块工具栏应默认展示');
    const card = document.getElementById('module-aSV');
    assert.equal(card.hidden, false, '模块卡片应默认展示');
    assert.equal(card.querySelector('.module-body').classList.contains('hidden'), false, '模块内容应默认展开');
    assert.equal(card.querySelector('.module-chevron').classList.contains('collapsed'), false);
  } finally { dom.window.close(); }
});

test('申请人手工上传文件后关闭同一申请对象的客户上传链接', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    const input = document.getElementById('hwFileInput');
    Object.defineProperty(input, 'files', { configurable: true, value: [new window.File(['productLine=HCI'], 'manual.info')] });
    input.dispatchEvent(new window.Event('change', { bubbles: true }));
    assert.equal(window.InfoCollectionUI.store.get(task.token).status, 'cancelled');
    assert.equal(window.InfoCollectionApplication.getFiles().length, 1);
    assert.match(document.getElementById('infoCollectionFeedback').textContent, /手工上传/);
  } finally { dom.window.close(); }
});

test('通知中心「我的待办」展示待确认任务并可一键确认', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    window.InfoCollectionUI.store.configure(task.token, { email: 'customer@example.com', triggerMode: 'confirm' });
    window.InfoCollectionUI.store.submit(task.token, [file('customer.info', 'productLine=HCI')]);
    window.InfoCollectionUI.renderBell();
    assert.equal(document.getElementById('headerTodoBadge').hidden, false);
    assert.equal(document.getElementById('headerTodoBadge').textContent, '1');
    assert.match(document.getElementById('headerTodoList').textContent, /待确认发起/);
    assert.ok(document.querySelector('#headerTodoList [data-info-confirm]'));
  } finally { dom.window.close(); }
});

test('申请提交事件写入申请编号与授权信息，平台任务列表进入交付状态', () => {
  const { dom, document, window } = loadCollectionUi();
  try {
    window.InfoCollectionApplication.restore({ productId: '45', customerId: 'C100001', customer: '测试客户', customerType: 'normal', fields: [] });
    const task = window.InfoCollectionUI.store.create(window.InfoCollectionApplication.getContext(), window.InfoCollectionApplication.capture());
    window.InfoCollectionUI.store.submit(task.token, [file('customer.info', 'productLine=HCI')]);
    document.dispatchEvent(new window.CustomEvent('info-application-submitted', { detail: {
      token: task.token,
      applicationNo: 'AUTH-12345678',
      authorization: { licenseCode: 'LIC-12345678', fileName: '授权信息-AUTH-12345678', validity: '至 2026-12-31' }
    } }));
    const saved = window.InfoCollectionUI.store.get(task.token);
    assert.equal(saved.status, 'authorized');
    assert.equal(saved.application.no, 'AUTH-12345678');
    assert.equal(saved.authorization.licenseCode, 'LIC-12345678');
  } finally { dom.window.close(); }
});
