'use strict';

const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const workspaceRoot = path.join(__dirname, '..', '..');
const htmlPath = path.join(workspaceRoot, '测试设备授权平台V2.html');
const rulesPath = path.join(workspaceRoot, 'authorization-application-rules.js');

function loadRules() {
  if (!fs.existsSync(rulesPath)) return {};
  delete require.cache[require.resolve(rulesPath)];
  return require(rulesPath);
}

function loadV2Dom(options = {}) {
  const errors = [];
  const alerts = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => errors.push(error.message));

  const dom = new JSDOM(fs.readFileSync(htmlPath, 'utf8'), {
    runScripts: options.runScripts === false ? undefined : 'dangerously',
    url: 'http://localhost/',
    virtualConsole,
    beforeParse(window) {
      window.tailwind = { config: {} };
      window.AuthorizationApplicationRules = loadRules();
      window.alert = (message) => alerts.push(String(message));
      if (options.beforeParse) options.beforeParse(window);
    }
  });

  return { dom, document: dom.window.document, window: dom.window, errors, alerts };
}

function fireChange(element, window) {
  element.dispatchEvent(new window.Event('change', { bubbles: true }));
}

module.exports = { loadV2Dom, fireChange };
