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
    var REASON_TEXTS = {
        DEFAULT_AUTO_PASS: '当前申请符合自动审批条件',
        CUMULATIVE_DURATION_LIMIT: '累计测试时长超过当前客户类型的自助申请上限',
        ATRUST_SALES_ADD_MODULE: 'aTrust 销售设备增开模块需要人工审批',
        MANUAL_DEVICE_VERIFICATION: '设备未查询到可信记录，需要人工核验',
        SPECIAL_FLOW_REQUIRED: '设备命中特殊审批流程',
        SELF_SERVICE_BLOCKED: '该设备不允许自助申请',
        PRODUCT_LIMIT_APPROVAL: '申请容量超过产品自助申请上限',
        APPLICATION_LIMIT_APPROVAL: '设备历史申请次数达到人工审批阈值',
        PRODUCT_RETIRED_WARNING: '所选产品已退市，请确认继续申请的必要性'
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

    function calculateApprovalDecision(context) {
        context = context || {};
        var facts = context.deviceFacts || [];
        var decisionType = 'default';
        var routeKey = 'AUTO_PASS';
        var reasonCodes = ['DEFAULT_AUTO_PASS'];
        var fact;

        fact = facts.find(function(item) { return item.selfServiceAllowed === false; });
        if (fact) {
            decisionType = 'not_allowed';
            routeKey = 'NOT_ALLOWED';
            reasonCodes = ['SELF_SERVICE_BLOCKED'];
        } else {
            fact = facts.find(function(item) { return !!item.specialFlowKey; });
            if (fact) {
                decisionType = 'special_flow';
                routeKey = fact.specialFlowKey;
                reasonCodes = ['SPECIAL_FLOW_REQUIRED'];
            } else if (facts.some(function(item) {
                return item.lookupStatus === 'not_found' || item.manualReviewRequired === true;
            })) {
                decisionType = 'manual';
                routeKey = 'MANUAL_DEVICE_VERIFICATION';
                reasonCodes = ['MANUAL_DEVICE_VERIFICATION'];
            } else if (context.requestAction === 'add_module' && facts.some(function(item) {
                return String(item.productLineId) === '20' && item.deviceSource === 'sales';
            })) {
                decisionType = 'manual';
                routeKey = 'REGION_AND_HQ_MARKETING';
                reasonCodes = ['ATRUST_SALES_ADD_MODULE'];
            } else if ((String(context.productLineId) === '45' || String(context.productLineId) === '19') &&
                Number(context.targetCapacity || 0) > 20) {
                decisionType = 'manual';
                routeKey = 'PRODUCT_LIMIT_APPROVAL';
                reasonCodes = ['PRODUCT_LIMIT_APPROVAL'];
            } else {
                var applicationLimit = String(context.productLineId) === '141' ? 1 : 2;
                var reachesApplicationLimit = context.requestAction === 'open' && facts.some(function(item) {
                    return Number(item.applicationCount || 0) >= applicationLimit;
                });
                if (reachesApplicationLimit) {
                    decisionType = 'manual';
                    routeKey = 'APPLICATION_LIMIT_APPROVAL';
                    reasonCodes = ['APPLICATION_LIMIT_APPROVAL'];
                } else {
                    var durationLimit = context.customerType === 'KA' ? 6 : 3;
                    var requestedMonths = Number(context.requestedMonths || 0);
                    var exceedsDurationLimit = facts.some(function(item) {
                        return Number(item.testedMonths || 0) + requestedMonths > durationLimit;
                    });
                    if (exceedsDurationLimit) {
                        decisionType = 'manual';
                        routeKey = context.customerType === 'KA' ? 'KA_AND_HQ_MARKETING' : 'REGION_AND_HQ_MARKETING';
                        reasonCodes = ['CUMULATIVE_DURATION_LIMIT'];
                    }
                }
            }
        }

        if (context.productStatus === 'retired') reasonCodes.push('PRODUCT_RETIRED_WARNING');
        return {
            decisionType: decisionType,
            routeKey: routeKey,
            reasonCodes: reasonCodes,
            reasonTexts: reasonCodes.map(function(code) { return REASON_TEXTS[code]; }),
            ruleVersion: RULE_VERSION,
            calculatedAt: new Date().toISOString()
        };
    }

    function normalizedMaterialKeys(fact) {
        return (fact.materialKeys || []).slice().sort().join('|');
    }

    function findCompatibilityIssues(deviceApplications) {
        var applications = deviceApplications || [];
        if (applications.length < 2) return [];
        var reference = applications[0];
        var referenceFact = reference.deviceFacts || reference.fact || {};
        var referenceDecision = reference.approvalDecision || {};
        var issues = [];

        function addIssue(code, fact) {
            issues.push({
                code: code,
                deviceId: fact.deviceId || '',
                referenceDeviceId: referenceFact.deviceId || '',
                hard: true
            });
        }

        applications.slice(1).forEach(function(application) {
            var fact = application.deviceFacts || application.fact || {};
            var decision = application.approvalDecision || {};
            if (String(fact.productLineId) !== String(referenceFact.productLineId)) addIssue('PRODUCT_LINE_MISMATCH', fact);
            if (application.requestAction !== reference.requestAction) addIssue('REQUEST_ACTION_MISMATCH', fact);
            if (fact.deviceSource !== referenceFact.deviceSource) addIssue('DEVICE_SOURCE_MISMATCH', fact);
            if ((fact.borrowOrderId || '') !== (referenceFact.borrowOrderId || '')) addIssue('BORROW_ORDER_MISMATCH', fact);
            if (normalizedMaterialKeys(fact) !== normalizedMaterialKeys(referenceFact)) addIssue('MATERIAL_KEYS_MISMATCH', fact);
            if (decision.decisionType !== referenceDecision.decisionType) addIssue('DECISION_TYPE_MISMATCH', fact);
            if (decision.routeKey !== referenceDecision.routeKey) addIssue('APPROVAL_ROUTE_MISMATCH', fact);
        });
        return issues;
    }

    function cloneJson(value) {
        return value == null ? value : JSON.parse(JSON.stringify(value));
    }

    function buildSubmissionSnapshot(input) {
        input = input || {};
        return {
            productLineId: String(input.productLineId || ''),
            productStatus: input.productStatus || 'active',
            requestAction: input.requestAction || '',
            authScene: mapLegacyAuthScene(input.requestAction),
            deviceFacts: cloneJson(input.deviceFacts || []),
            approvalDecision: cloneJson(input.approvalDecision || null),
            ruleVersion: RULE_VERSION
        };
    }

    function findStaleDeviceFacts(snapshotFacts, latestFacts) {
        var latestById = {};
        (latestFacts || []).forEach(function(fact) { latestById[fact.deviceId] = fact; });
        return (snapshotFacts || []).filter(function(fact) {
            var latest = latestById[fact.deviceId];
            return !latest || latest.factVersion !== fact.factVersion;
        }).map(function(fact) { return fact.deviceId; });
    }

    return {
        RULE_VERSION: RULE_VERSION,
        REQUEST_ACTION_LABELS: REQUEST_ACTION_LABELS,
        REASON_TEXTS: REASON_TEXTS,
        getProductStatus: getProductStatus,
        getEligibleRequestActions: getEligibleRequestActions,
        mapLegacyAuthScene: mapLegacyAuthScene,
        normalizeLookupResult: normalizeLookupResult,
        getLookupBlockingReason: getLookupBlockingReason,
        calculateApprovalDecision: calculateApprovalDecision,
        findCompatibilityIssues: findCompatibilityIssues,
        buildSubmissionSnapshot: buildSubmissionSnapshot,
        findStaleDeviceFacts: findStaleDeviceFacts
    };
}));
