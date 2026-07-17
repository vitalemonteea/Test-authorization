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

    function getProductStatus(id) {
        return PRODUCT_STATUS[String(id)] || 'active';
    }

    return {
        RULE_VERSION: RULE_VERSION,
        getProductStatus: getProductStatus
    };
}));
