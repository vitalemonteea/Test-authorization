(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.AuthorizationApplicationRules = factory();
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var RULE_VERSION = '2026-07-16.1';
    var PRODUCT_STATUS = {
        '6': 'retired'
    };
    var REQUEST_ACTION_LABELS = {
        open: '开通测试授权',
        adjust: '调整授权资源',
        extend: '延长授权',
        add_module: '增开模块',
        increase_capacity: '扩大授权容量'
    };
    var LEGACY_AUTH_SCENES = {
        open: '1',
        adjust: '2',
        add_module: '3',
        increase_capacity: '5',
        extend: '6'
    };

    function getProductStatus(id) {
        return PRODUCT_STATUS[String(id)] || 'active';
    }

    function getEligibleRequestActions(deviceFacts) {
        var status = deviceFacts && deviceFacts.authorizationStatus;
        if (status === 'none' || status === 'expired') return ['open'];
        if (status === 'active') return ['extend', 'add_module', 'increase_capacity'];
        return [];
    }

    function mapLegacyAuthScene(requestAction) {
        return LEGACY_AUTH_SCENES[requestAction] || '';
    }

    function normalizeLookupResult(rawResult, identifiers) {
        identifiers = identifiers || {};
        if (rawResult && (rawResult.status === 'error' || rawResult.lookupStatus === 'error')) {
            return {
                lookupStatus: 'error',
                deviceId: identifiers.deviceId || rawResult.deviceId || '',
                errorCode: rawResult.errorCode || 'UNKNOWN',
                manualReviewRequired: false
            };
        }
        if (!rawResult || rawResult.status === 'not_found' || rawResult.lookupStatus === 'not_found') {
            return {
                lookupStatus: 'not_found',
                deviceId: identifiers.deviceId || '',
                sn: identifiers.sn || '',
                productLineId: identifiers.productLineId || '',
                productName: identifiers.productName || '',
                deviceSource: 'unknown',
                borrowOrderId: '',
                authorizationStatus: 'none',
                currentModules: [],
                currentCapacity: 0,
                testedMonths: 0,
                applicationCount: 0,
                materialKeys: [],
                factVersion: '',
                manualReviewRequired: true
            };
        }
        var normalized = {};
        Object.keys(rawResult).forEach(function(key) { normalized[key] = rawResult[key]; });
        normalized.lookupStatus = 'success';
        normalized.manualReviewRequired = false;
        return normalized;
    }

    function getLookupBlockingReason(deviceFacts, selectedProductLineId) {
        var facts = deviceFacts || [];
        var lookupError = facts.find(function(fact) { return fact.lookupStatus === 'error'; });
        if (lookupError) {
            return { code: 'LOOKUP_ERROR', deviceId: lookupError.deviceId, errorCode: lookupError.errorCode || '' };
        }
        var mismatch = facts.find(function(fact) {
            return fact.lookupStatus === 'success' && String(fact.productLineId) !== String(selectedProductLineId);
        });
        if (mismatch) {
            return {
                code: 'PRODUCT_MISMATCH',
                deviceId: mismatch.deviceId,
                productLineId: mismatch.productLineId,
                productName: mismatch.productName
            };
        }
        return null;
    }

    return {
        RULE_VERSION: RULE_VERSION,
        REQUEST_ACTION_LABELS: REQUEST_ACTION_LABELS,
        getProductStatus: getProductStatus,
        getEligibleRequestActions: getEligibleRequestActions,
        mapLegacyAuthScene: mapLegacyAuthScene,
        normalizeLookupResult: normalizeLookupResult,
        getLookupBlockingReason: getLookupBlockingReason
    };
}));
