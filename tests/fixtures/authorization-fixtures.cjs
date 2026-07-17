'use strict';

const noAuthBorrowed = {
  lookupStatus: 'success',
  deviceId: 'DEV-NGAF-001',
  sn: 'SN-2024002-A',
  productLineId: '22',
  productName: 'NGAF',
  deviceSource: 'borrowed',
  borrowOrderId: 'BT20240615002',
  authorizationStatus: 'none',
  currentModules: [],
  currentCapacity: 0,
  testedMonths: 0,
  applicationCount: 0,
  materialKeys: ['borrow-order'],
  factVersion: 'facts-ngaf-001-v1'
};

const activeSales = {
  lookupStatus: 'success',
  deviceId: 'SALES-ATRUST-001',
  sn: 'SN-SALES-ATRUST-001',
  productLineId: '20',
  productName: 'aTrust',
  deviceSource: 'sales',
  borrowOrderId: '',
  authorizationStatus: 'active',
  currentModules: ['基础接入'],
  currentCapacity: 300,
  testedMonths: 3,
  applicationCount: 1,
  materialKeys: ['sales-device-proof'],
  factVersion: 'facts-atrust-001-v1'
};

module.exports = { noAuthBorrowed, activeSales };
