'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const rules = require(path.join(__dirname, '..', 'authorization-application-rules.js'));

test('产品规则显式区分历史范围、标识类型和时长阈值', () => {
  const generic = rules.getProductRule('22');
  assert.equal(generic.historyScope, 'customer_product_identifier');
  assert.equal(generic.identifierKind, 'device');
  assert.equal(generic.normalMaxDays, 90);
  assert.equal(generic.normalCumulativeLimitDays, 180);

  const hci = rules.getProductRule('45');
  assert.equal(hci.historyScope, 'customer_product_identifier');
  assert.equal(hci.identifierKind, 'cluster');
  assert.equal(hci.capacityLimit, 20);

  const xdr = rules.getProductRule('141');
  assert.equal(xdr.historyScope, 'identifier_only');
  assert.equal(xdr.applicationLimit, 1);
  assert.equal(rules.getDurationLimitDays('KA', '141'), 90);
});

test('HCI 按客户、产品线和集群标识聚合授权历史', () => {
  const raw = {
    lookupStatus: 'success',
    deviceId: 'HCI-INFO-DEMO',
    clusterId: 'CLUSTER-HCI-001',
    productLineId: '45',
    productName: 'HCI'
  };
  const history = [
    {
      customerId: 'C100001', productLineId: '45', clusterId: 'CLUSTER-HCI-001',
      authorizationStatus: 'expired', durationDays: 90, endDate: '2026-01-31',
      modules: ['虚拟化'], capacity: 10
    },
    {
      customerId: 'C100001', productLineId: '45', clusterId: 'CLUSTER-HCI-001',
      authorizationStatus: 'active', durationDays: 60, endDate: '2026-09-30',
      modules: ['虚拟化', '存储'], capacity: 16
    },
    {
      customerId: 'C100002', productLineId: '45', clusterId: 'CLUSTER-HCI-001',
      authorizationStatus: 'expired', durationDays: 90, endDate: '2025-12-31'
    }
  ];

  const resolved = rules.resolveDeviceFacts(raw, history, { customerId: 'C100001', productLineId: '45' });
  assert.equal(resolved.authorizationStatus, 'active');
  assert.equal(resolved.applicationCount, 2);
  assert.equal(resolved.testedDays, 150);
  assert.deepEqual(resolved.currentModules, ['虚拟化', '存储']);
  assert.equal(resolved.currentCapacity, 16);
  assert.match(resolved.recognitionBasis, /客户 \+ 产品线 \+ 集群标识.*2 条/);
  assert.equal(rules.deriveBaseScene(resolved), 'adjust');
});

test('历史范围不匹配时为首次申请，历史授权结束时为重新开通', () => {
  const raw = {
    lookupStatus: 'success', deviceId: 'SOFT-001', productLineId: '22', productName: 'NGAF'
  };
  const history = [{
    customerId: 'C100001', productLineId: '22', deviceId: 'SOFT-001',
    authorizationStatus: 'expired', durationDays: 120, endDate: '2026-02-28'
  }];

  const first = rules.resolveDeviceFacts(raw, history, { customerId: 'C100002', productLineId: '22' });
  assert.equal(first.authorizationStatus, 'none');
  assert.equal(rules.deriveBaseScene(first), 'first_open');

  const reopen = rules.resolveDeviceFacts(raw, history, { customerId: 'C100001', productLineId: '22' });
  assert.equal(reopen.authorizationStatus, 'expired');
  assert.equal(rules.deriveBaseScene(reopen), 'reopen');
});

test('已登记设备归属其他客户时返回明确阻断原因', () => {
  const fact = {
    lookupStatus: 'success',
    deviceId: 'SALES-ATRUST-001',
    customerId: 'C100001',
    productLineId: '20',
    productName: 'aTrust',
    deviceSource: 'sales',
    customerBindingRequired: true
  };

  assert.equal(rules.getLookupBlockingReason([fact], '20', 'C100001'), null);
  assert.deepEqual(rules.getLookupBlockingReason([fact], '20', 'C100004'), {
    code: 'CUSTOMER_MISMATCH',
    deviceId: 'SALES-ATRUST-001',
    ownerCustomerId: 'C100001',
    selectedCustomerId: 'C100004'
  });
});

test('授权过期与累计超期是两个可同时成立的状态', () => {
  const expired = {
    productLineId: '22', authorizationStatus: 'expired', testedDays: 150
  };
  assert.equal(rules.deriveBaseScene(expired), 'reopen');
  assert.equal(rules.getOverdueTier(expired, {
    customerType: 'normal', productLineId: '22', requestedDays: 60
  }), 'overdue');
});

test('单次申请上限与累计超期阈值分别计算', () => {
  assert.equal(rules.getDurationLimitDays('normal', '22'), 90);
  assert.equal(rules.getCumulativeLimitDays('normal', '22'), 180);
  assert.equal(rules.getOverdueTier({ productLineId: '22', testedDays: 60 }, {
    customerType: 'normal', requestedDays: 60
  }), 'normal');
});
