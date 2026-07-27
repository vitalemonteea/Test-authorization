'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom } = require('./helpers/load-v2-dom.cjs');

function latestHistory(records) {
  return records.find((record) => record.authorizationStatus === 'active') ||
    records.slice().sort((left, right) => String(right.endDate || '').localeCompare(String(left.endDate || '')))[0];
}

test('产品授权设备事实与授权历史 Mock 保持一致', () => {
  const { dom, window, errors } = loadV2Dom();
  try {
    const facts = window.AuthorizationMockData?.deviceFactsById;
    const history = window.AuthorizationMockData?.authorizationHistoryRecords;
    assert.ok(facts && typeof facts === 'object');
    assert.ok(Array.isArray(history));

    Object.values(facts).forEach((fact) => {
      const records = history.filter((record) =>
        record.customerId === fact.customerId &&
        String(record.productLineId) === String(fact.productLineId) &&
        record.deviceId === fact.deviceId
      );
      const expectedStatus = records.some((record) => record.authorizationStatus === 'active') ?
        'active' : (records.length ? 'expired' : 'none');
      const expectedDays = records.reduce((total, record) => total + Number(record.durationDays || 0), 0);

      assert.equal(fact.authorizationStatus, expectedStatus, `${fact.deviceId} 授权状态应与历史一致`);
      assert.equal(fact.applicationCount, records.length, `${fact.deviceId} 历史申请次数应与历史一致`);
      assert.equal(Number(fact.testedMonths || 0) * 30, expectedDays, `${fact.deviceId} 累计测试时长应与历史一致`);

      const latest = latestHistory(records);
      if (!latest) return;
      assert.deepEqual(fact.currentModules, latest.modules || [], `${fact.deviceId} 当前模块应与最新历史一致`);
      assert.equal(fact.currentCapacity, Number(latest.capacity || 0), `${fact.deviceId} 当前容量应与最新历史一致`);
      if (fact.currentAuthEndDate) {
        assert.equal(fact.currentAuthEndDate, latest.endDate, `${fact.deviceId} 最新有效期应与历史一致`);
      }
    });

    ['SALES-ATRUST-FIRST', 'SALES-ATRUST-REOPEN', 'SALES-ATRUST-001'].forEach((deviceId) => {
      assert.equal(facts[deviceId].customerId, 'C100001');
      assert.equal(facts[deviceId].customerBindingRequired, true);
    });
    assert.deepEqual(errors, []);
  } finally {
    dom.window.close();
  }
});
