(function (root, factory) {
    var rules = factory();
    if (root) root.AuthorizationApplicationRules = rules;
    if (typeof module === 'object' && module.exports) {
        module.exports = rules;
    }
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    var RULE_VERSION = '2026-07-22.2';
    var PRODUCT_STATUS = {
        '6': 'retired'
    };
    var DEFAULT_PRODUCT_RULE = {
        historyScope: 'customer_product_identifier',
        identifierKind: 'device',
        normalMaxDays: 90,
        kaMaxDays: 180,
        normalCumulativeLimitDays: 180,
        kaCumulativeLimitDays: 180,
        applicationLimit: 2,
        allowedRequestContents: ['extend', 'add_module', 'increase_capacity']
    };
    var PRODUCT_CONFIG = {
        '45': {
            hardwareInfoRequired: true,
            forcedPlanDevType: '1',
            capacityLimit: 20,
            historyScope: 'customer_product_identifier',
            identifierKind: 'cluster'
        },
        '19': {
            hardwareInfoRequired: true,
            forcedPlanDevType: '1',
            capacityLimit: 20,
            historyScope: 'customer_product_identifier',
            identifierKind: 'cluster'
        },
        '20': { capacityLimit: 500 },
        '141': {
            historyScope: 'identifier_only',
            normalMaxDays: 90,
            kaMaxDays: 90,
            normalCumulativeLimitDays: 90,
            kaCumulativeLimitDays: 90,
            applicationLimit: 1
        }
    };
    var HISTORY_SCOPE_LABELS = {
        customer_product: '客户 + 产品线',
        customer_product_identifier: '客户 + 产品线 + 设备标识',
        identifier_only: '设备标识',
        none: '不累计历史'
    };
    var BASE_SCENE_LABELS = {
        first_open: '首次开通测试授权',
        reopen: '重新开通测试授权',
        adjust: '调整当前测试授权'
    };
    var REQUEST_CONTENT_LABELS = {
        open: '开通测试授权',
        reopen: '重新开通授权',
        extend: '延长授权时间',
        add_module: '增开模块',
        increase_capacity: '扩大容量/规格'
    };
    var REQUEST_ACTION_LABELS = {
        open: '开通测试授权',
        adjust: '调整授权资源',
        extend: '延长授权',
        add_module: '增开模块',
        increase_capacity: '扩大授权容量'
    };
    var AUTH_SCENE_LABELS = {
        '1': '开通测试授权（无授权/授权过期申请）',
        '2': '授权资源调整（授权有效期内调整）',
        '3': '销售设备增开新模块测试授权',
        '5': '销售授权扩容测试授权',
        '6': '销售设备申请延长授权'
    };
    var AUTH_SCENE_ACTIONS = {
        '1': 'open',
        '2': 'adjust',
        '3': 'add_module',
        '5': 'increase_capacity',
        '6': 'extend'
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
        REQUEST_DURATION_LIMIT: '本次申请时长超过当前产品与客户类型的单次申请上限',
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

    function getProductRule(productLineId) {
        var config = PRODUCT_CONFIG[String(productLineId)] || {};
        var rule = {};
        Object.keys(DEFAULT_PRODUCT_RULE).forEach(function(key) {
            rule[key] = Array.isArray(DEFAULT_PRODUCT_RULE[key]) ?
                DEFAULT_PRODUCT_RULE[key].slice() : DEFAULT_PRODUCT_RULE[key];
        });
        Object.keys(config).forEach(function(key) {
            rule[key] = Array.isArray(config[key]) ? config[key].slice() : config[key];
        });
        rule.productLineId = String(productLineId || '');
        return rule;
    }

    function getHistoryScope(productLineId) {
        return getProductRule(productLineId).historyScope;
    }

    function deriveBaseScene(deviceFacts, historyScope) {
        if (!deviceFacts) return '';
        if ((historyScope || getHistoryScope(deviceFacts.productLineId)) === 'none') return 'first_open';
        if (deviceFacts.authorizationStatus === 'none') return 'first_open';
        if (deviceFacts.authorizationStatus === 'expired') return 'reopen';
        if (deviceFacts.authorizationStatus === 'active') return 'adjust';
        return '';
    }

    function getEligibleRequestContents(deviceFacts, historyScope) {
        var baseScene = deriveBaseScene(deviceFacts, historyScope);
        if (baseScene === 'first_open') return ['open'];
        if (baseScene === 'reopen') return ['reopen'];
        if (baseScene === 'adjust') return getProductRule(deviceFacts.productLineId).allowedRequestContents;
        return [];
    }

    function getPrimaryRequestAction(baseScene) {
        if (baseScene === 'first_open') return 'open';
        if (baseScene === 'reopen') return 'reopen';
        if (baseScene === 'adjust') return 'adjust';
        return '';
    }

    function getDurationLimitDays(customerType, productLineId) {
        var rule = getProductRule(productLineId);
        return customerType === 'KA' ? rule.kaMaxDays : rule.normalMaxDays;
    }

    function getDurationLimitMonths(customerType, productLineId) {
        return getDurationLimitDays(customerType, productLineId) / 30;
    }

    function getCumulativeLimitDays(customerType, productLineId) {
        var rule = getProductRule(productLineId);
        return customerType === 'KA' ? rule.kaCumulativeLimitDays : rule.normalCumulativeLimitDays;
    }

    function getOverdueTier(deviceFacts, context) {
        context = context || {};
        var facts = deviceFacts || {};
        var testedDays = facts.testedDays == null ? Number(facts.testedMonths || 0) * 30 : Number(facts.testedDays || 0);
        var requestedDays = context.requestedDays == null ? Number(context.requestedMonths || 0) * 30 : Number(context.requestedDays || 0);
        var productLineId = context.productLineId || facts.productLineId;
        return testedDays + requestedDays > getCumulativeLimitDays(context.customerType, productLineId) ? 'overdue' : 'normal';
    }

    function getHistoryIdentifier(value, identifierKind) {
        if (!value) return '';
        if (identifierKind === 'cluster') return value.clusterId || value.identifier || value.deviceId || value.sn || '';
        return value.identifier || value.deviceId || value.sn || '';
    }

    function historyRecordMatches(record, context, productRule) {
        context = context || {};
        productRule = productRule || getProductRule(context.productLineId);
        var scope = productRule.historyScope;
        if (scope === 'none') return false;
        var customerId = context.customerId || '';
        var productLineId = String(context.productLineId || '');
        var identifier = getHistoryIdentifier(context, productRule.identifierKind);
        if (scope === 'customer_product') {
            return !!customerId && record.customerId === customerId && String(record.productLineId) === productLineId;
        }
        if (scope === 'identifier_only') {
            return !!identifier && getHistoryIdentifier(record, productRule.identifierKind) === identifier;
        }
        return !!customerId && !!identifier && record.customerId === customerId &&
            String(record.productLineId) === productLineId &&
            getHistoryIdentifier(record, productRule.identifierKind) === identifier;
    }

    function resolveDeviceFacts(rawFact, historyRecords, context) {
        rawFact = rawFact || {};
        context = context || {};
        var resolved = {};
        Object.keys(rawFact).forEach(function(key) { resolved[key] = cloneJson(rawFact[key]); });
        var productLineId = context.productLineId || rawFact.productLineId;
        var rule = getProductRule(productLineId);
        var identifier = getHistoryIdentifier(rawFact, rule.identifierKind);
        var matchContext = {
            customerId: context.customerId || rawFact.customerId || '',
            productLineId: productLineId,
            deviceId: rawFact.deviceId,
            sn: rawFact.sn,
            clusterId: rawFact.clusterId,
            identifier: identifier
        };
        var matched = rule.historyScope === 'none' ? [] : (historyRecords || []).filter(function(record) {
            return historyRecordMatches(record, matchContext, rule);
        });
        var active = matched.filter(function(record) { return record.authorizationStatus === 'active'; })[0];
        var latest = active || matched.slice().sort(function(a, b) {
            return String(b.endDate || '').localeCompare(String(a.endDate || ''));
        })[0];

        if (Array.isArray(historyRecords)) {
            resolved.authorizationStatus = active ? 'active' : (matched.length ? 'expired' : 'none');
            resolved.testedDays = matched.reduce(function(total, record) {
                return total + Number(record.durationDays || 0);
            }, 0);
            resolved.testedMonths = resolved.testedDays / 30;
            resolved.applicationCount = matched.length;
            if (latest) {
                resolved.currentModules = cloneJson(latest.modules || []);
                resolved.currentCapacity = Number(latest.capacity || 0);
                resolved.currentAuthEndDate = latest.endDate || '';
            }
        }
        resolved.historyScope = rule.historyScope;
        resolved.identifierKind = rule.identifierKind;
        resolved.historyMatchedCount = matched.length;
        resolved.recognitionBasis = rule.historyScope === 'none' ?
            '该产品不累计历史，按首次申请识别' :
            '按' + (HISTORY_SCOPE_LABELS[rule.historyScope] || rule.historyScope) + '查询，匹配 ' + matched.length + ' 条授权记录';
        return resolved;
    }

    function getEligibleRequestActions(deviceFacts) {
        var status = deviceFacts && deviceFacts.authorizationStatus;
        if (status === 'none' || status === 'expired') return ['open'];
        if (status === 'active') return ['extend', 'add_module', 'increase_capacity'];
        return [];
    }

    function getEligibleAuthScenes(deviceFacts) {
        var status = deviceFacts && deviceFacts.authorizationStatus;
        if (status === 'none' || status === 'expired') return ['1'];
        if (status === 'active' && deviceFacts.deviceSource === 'sales') return ['3', '5', '6'];
        if (status === 'active') return ['2'];
        return [];
    }

    function mapAuthSceneToRequestAction(authScene) {
        return AUTH_SCENE_ACTIONS[String(authScene || '')] || '';
    }

    function mapLegacyAuthScene(requestAction, deviceFact) {
        if (requestAction === 'open') return '1';
        if (requestAction === 'adjust') return '2';
        if (!deviceFact || deviceFact.deviceSource !== 'sales') {
            return requestAction === 'extend' || requestAction === 'add_module' || requestAction === 'increase_capacity' ? '2' : '';
        }
        return LEGACY_AUTH_SCENES[requestAction] || '';
    }

    function isHardwareInfoRequired(productLineId, planDevType) {
        var config = PRODUCT_CONFIG[String(productLineId)];
        return !!config && config.hardwareInfoRequired === true && String(planDevType) === config.forcedPlanDevType;
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
            if (identifiers.strictAssetLookup !== true) {
                return {
                    lookupStatus: 'success',
                    deviceId: identifiers.deviceId || '',
                    sn: identifiers.sn || '',
                    productLineId: identifiers.productLineId || '',
                    productName: identifiers.productName || '',
                    deviceSource: 'customer_owned',
                    borrowOrderId: '',
                    authorizationStatus: 'none',
                    currentModules: [],
                    currentCapacity: 0,
                    testedMonths: 0,
                    applicationCount: 0,
                    materialKeys: [],
                    factVersion: 'history-none-' + (identifiers.deviceId || identifiers.sn || 'unknown'),
                    manualReviewRequired: false
                };
            }
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
                manualReviewRequired: false,
                assetValidationRequired: true,
                selfServiceAllowed: false
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
        var unknownBorrowedDevice = facts.find(function(fact) {
            return fact.lookupStatus === 'not_found' && fact.assetValidationRequired === true;
        });
        if (unknownBorrowedDevice) {
            return { code: 'UNKNOWN_BORROWED_DEVICE', deviceId: unknownBorrowedDevice.deviceId };
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
            } else if ((context.requestAction === 'add_module' || (context.requestContents || []).indexOf('add_module') !== -1) && facts.some(function(item) {
                return String(item.productLineId) === '20' && item.deviceSource === 'sales';
            })) {
                decisionType = 'manual';
                routeKey = 'REGION_AND_HQ_MARKETING';
                reasonCodes = ['ATRUST_SALES_ADD_MODULE'];
            } else if (getProductRule(context.productLineId).capacityLimit &&
                Number(context.targetCapacity || 0) > getProductRule(context.productLineId).capacityLimit) {
                decisionType = 'manual';
                routeKey = 'PRODUCT_LIMIT_APPROVAL';
                reasonCodes = ['PRODUCT_LIMIT_APPROVAL'];
            } else {
                var productRule = getProductRule(context.productLineId);
                var applicationLimit = productRule.applicationLimit;
                var reachesApplicationLimit = (context.requestAction === 'open' || context.requestAction === 'reopen') && facts.some(function(item) {
                    return Number(item.applicationCount || 0) >= applicationLimit;
                });
                if (reachesApplicationLimit) {
                    decisionType = 'manual';
                    routeKey = 'APPLICATION_LIMIT_APPROVAL';
                    reasonCodes = ['APPLICATION_LIMIT_APPROVAL'];
                } else {
                    var requestedMonths = Number(context.requestedMonths || 0);
                    var exceedsRequestDuration = requestedMonths >
                        getDurationLimitMonths(context.customerType, context.productLineId);
                    var exceedsCumulativeDuration = facts.some(function(item) {
                        return getOverdueTier(item, {
                            customerType: context.customerType,
                            productLineId: context.productLineId,
                            requestedMonths: requestedMonths
                        }) === 'overdue';
                    });
                    if (exceedsRequestDuration || exceedsCumulativeDuration) {
                        decisionType = 'manual';
                        routeKey = context.customerType === 'KA' ? 'KA_AND_HQ_MARKETING' : 'REGION_AND_HQ_MARKETING';
                        reasonCodes = [exceedsRequestDuration ? 'REQUEST_DURATION_LIMIT' : 'CUMULATIVE_DURATION_LIMIT'];
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

    function normalizedRequestContents(application) {
        return (application.requestContents || []).slice().sort().join('|');
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
            if ((application.baseScene || deriveBaseScene(fact)) !==
                (reference.baseScene || deriveBaseScene(referenceFact))) addIssue('BASE_SCENE_MISMATCH', fact);
            if (application.requestAction !== reference.requestAction) addIssue('REQUEST_ACTION_MISMATCH', fact);
            if (normalizedRequestContents(application) !== normalizedRequestContents(reference)) addIssue('REQUEST_CONTENTS_MISMATCH', fact);
            if ((application.overdueTier || 'normal') !== (reference.overdueTier || 'normal')) addIssue('OVERDUE_TIER_MISMATCH', fact);
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
            baseScene: input.baseScene || deriveBaseScene((input.deviceFacts || [])[0]),
            requestAction: input.requestAction || '',
            requestContents: cloneJson(input.requestContents || []),
            authScene: String(input.authScene || mapLegacyAuthScene(input.requestAction, (input.deviceFacts || [])[0])),
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
        BASE_SCENE_LABELS: BASE_SCENE_LABELS,
        REQUEST_CONTENT_LABELS: REQUEST_CONTENT_LABELS,
        REQUEST_ACTION_LABELS: REQUEST_ACTION_LABELS,
        AUTH_SCENE_LABELS: AUTH_SCENE_LABELS,
        REASON_TEXTS: REASON_TEXTS,
        PRODUCT_CONFIG: PRODUCT_CONFIG,
        DEFAULT_PRODUCT_RULE: DEFAULT_PRODUCT_RULE,
        HISTORY_SCOPE_LABELS: HISTORY_SCOPE_LABELS,
        getProductStatus: getProductStatus,
        getProductRule: getProductRule,
        getHistoryScope: getHistoryScope,
        deriveBaseScene: deriveBaseScene,
        getEligibleRequestContents: getEligibleRequestContents,
        getPrimaryRequestAction: getPrimaryRequestAction,
        getDurationLimitMonths: getDurationLimitMonths,
        getDurationLimitDays: getDurationLimitDays,
        getCumulativeLimitDays: getCumulativeLimitDays,
        getOverdueTier: getOverdueTier,
        historyRecordMatches: historyRecordMatches,
        resolveDeviceFacts: resolveDeviceFacts,
        getEligibleRequestActions: getEligibleRequestActions,
        getEligibleAuthScenes: getEligibleAuthScenes,
        mapAuthSceneToRequestAction: mapAuthSceneToRequestAction,
        mapLegacyAuthScene: mapLegacyAuthScene,
        isHardwareInfoRequired: isHardwareInfoRequired,
        normalizeLookupResult: normalizeLookupResult,
        getLookupBlockingReason: getLookupBlockingReason,
        calculateApprovalDecision: calculateApprovalDecision,
        findCompatibilityIssues: findCompatibilityIssues,
        buildSubmissionSnapshot: buildSubmissionSnapshot,
        findStaleDeviceFacts: findStaleDeviceFacts
    };
}));
