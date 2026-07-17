'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { loadV2Dom, fireChange } = require('./helpers/load-v2-dom.cjs');

function withV2Dom(options, assertions) {
  const loaded = loadV2Dom(options);
  try {
    return assertions(loaded);
  } finally {
    loaded.dom.window.close();
  }
}

test('exports loadV2Dom and fireChange', () => {
  assert.equal(typeof loadV2Dom, 'function');
  assert.equal(typeof fireChange, 'function');
});

test('runScripts false leaves inline production globals undefined', () => {
  withV2Dom({ runScripts: false }, ({ window }) => {
    assert.equal(window.addChip, undefined);
  });
});

test('runs the optional beforeParse callback', () => {
  withV2Dom({
    runScripts: false,
    beforeParse(window) {
      window.beforeParseSentinel = 'set';
    }
  }, ({ window }) => {
    assert.equal(window.beforeParseSentinel, 'set');
  });
});

test('captures window.alert messages', () => {
  withV2Dom({ runScripts: false }, ({ window, alerts }) => {
    window.alert('sentinel-alert');
    assert.deepEqual(alerts, ['sentinel-alert']);
  });
});

test('captures window.console.error messages', () => {
  withV2Dom({ runScripts: false }, ({ window, errors }) => {
    window.console.error('sentinel-error');
    assert.deepEqual(errors, ['sentinel-error']);
  });
});

test('fireChange dispatches a bubbling change event', () => {
  withV2Dom({ runScripts: false }, ({ document, window }) => {
    const parent = document.createElement('div');
    const input = document.createElement('input');
    parent.append(input);

    let receivedEvent;
    parent.addEventListener('change', (event) => {
      receivedEvent = event;
    });

    fireChange(input, window);

    assert.ok(receivedEvent);
    assert.equal(receivedEvent.target, input);
    assert.equal(receivedEvent.bubbles, true);
  });
});
