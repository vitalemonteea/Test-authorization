# Basic Info Card Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the V2 basic information card and render readable per-device fact panels without changing application fields or business behavior.

**Architecture:** Keep the existing single-file prototype and its form state logic. Add semantic layout wrappers and scoped CSS under `#section-basic`, then replace the device summary's concatenated text with DOM-built header and fact-grid elements using the existing normalized device facts.

**Tech Stack:** Static HTML/CSS/JavaScript, Node.js built-in test runner, jsdom, in-app browser verification.

---

### Task 1: Define the new layout and device fact contracts

**Files:**
- Modify: `tests/basic-form-layout.test.cjs`
- Modify: `tests/device-action-flow.test.cjs`

- [ ] **Step 1: Update the structural layout tests**

Replace the old assertions that require authorization scene and application type to be full width. Assert the new wrappers and unchanged full-width fields:

```js
test('申请类型应使用独立半栏行', () => {
  const item = doc.getElementById('planDevTypeFormItem');
  assert.ok(item.closest('.basic-half-row'));
  assert.equal(item.classList.contains('basic-full'), false);
});

test('授权场景、区域和办事处应在同一归属三列行', () => {
  const row = doc.getElementById('authSceneFormItem').closest('.basic-affiliation-row');
  assert.ok(row);
  assert.ok(row.querySelector('#area'));
  assert.ok(row.querySelector('#office'));
});

test('设备ID、接收邮箱和设备SN保持全宽', () => {
  assert.ok(doc.getElementById('deviceIdFormItem').classList.contains('basic-full'));
  assert.ok(doc.getElementById('userEmail').closest('.layui-form-item').classList.contains('basic-full'));
  assert.ok(doc.getElementById('devSnFormItem').classList.contains('basic-full'));
});
```

Add structural assertions for `.basic-title-accent`, `.device-facts-panel`, `.device-facts-header`, `.device-facts-grid`, and seven `.device-fact-item` nodes after rendering.

- [ ] **Step 2: Add runtime device fact panel tests**

Update the existing device summary test to prove the new semantic structure and exact labels:

```js
const panel = summary.querySelector('.device-facts-panel');
assert.ok(panel);
assert.match(panel.querySelector('.device-facts-id').textContent, /DEV-NGAF-001/);
assert.equal(panel.querySelectorAll('.device-fact-item').length, 7);
assert.deepEqual(
  Array.from(panel.querySelectorAll('.device-fact-label')).map((node) => node.textContent),
  ['实际产品', '来源', '授权状态', '当前模块', '当前容量', '累计测试', '历史申请']
);
```

Add a test that inserts two compatible devices and asserts two independent `.device-facts-panel` elements, then removes them and asserts the summary is empty.

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
node --test tests/basic-form-layout.test.cjs tests/device-action-flow.test.cjs
```

Expected: FAIL because `.basic-half-row`, `.basic-affiliation-row`, `.basic-title-accent`, and `.device-facts-panel` do not exist yet.

- [ ] **Step 4: Commit the failing tests**

```powershell
git add tests/basic-form-layout.test.cjs tests/device-action-flow.test.cjs
git commit -m "test: 定义基本信息卡片新版布局"
```

### Task 2: Implement the redesigned card

**Files:**
- Modify: `测试设备授权平台V2.html`

- [ ] **Step 1: Add scoped desktop and mobile layout styles**

Add scoped rules for the confirmed hierarchy:

```css
#section-basic .basic-half-row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
#section-basic .basic-affiliation-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
#section-basic .basic-affiliation-row .layui-form-label { width: auto; padding: 0 0 7px; float: none; }
#section-basic .basic-affiliation-row .layui-input-block { margin-left: 0; }
.device-facts-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(104px, 1fr)); gap: 8px; }
```

At the existing mobile breakpoint, collapse `.basic-half-row` and `.basic-affiliation-row` to one column and set `.device-facts-grid` to two equal columns. Style the title accent, shallow blue device panel, status badge, fact labels/values, and in-flow borrow title using the existing V2 blue and neutral colors.

- [ ] **Step 2: Reorganize the form markup without changing controls**

Add `.basic-title-accent` below the current title. Wrap `#planDevTypeFormItem` in `.basic-half-row` and remove its `basic-full` class. Move the existing authorization scene form item into a `.basic-affiliation-row` with the existing area and office form items. Leave scene-dependent conditional fields in their current full-width position between device recognition and affiliation/contact details.

Keep all IDs, `name` attributes, options, hidden inputs, and event bindings unchanged. Change the borrow title only from border-overlap positioning to normal in-flow markup.

- [ ] **Step 3: Render semantic per-device fact panels**

Replace the concatenated `row.textContent` implementation with DOM elements created from existing facts:

```js
var factItems = [
  ['实际产品', fact.productName || '待人工确认'],
  ['来源', sourceLabel],
  ['授权状态', authorizationLabel],
  ['当前模块', modules],
  ['当前容量', String(fact.currentCapacity || 0)],
  ['累计测试', (fact.testedMonths || 0) + '个月'],
  ['历史申请', (fact.applicationCount || 0) + '次']
];
```

For each fact, create one `.device-facts-panel` containing a `.device-facts-header` with `.device-facts-id` and a status badge, followed by `.device-facts-grid` with seven `.device-fact-item` children. Continue clearing `deviceFactsSummary.textContent` before rendering so product changes and device removal cannot leave stale content.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```powershell
node --test tests/basic-form-layout.test.cjs tests/device-action-flow.test.cjs
```

Expected: all focused tests pass.

- [ ] **Step 5: Run the full regression suite**

Run:

```powershell
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Step 6: Commit the implementation**

```powershell
git add 测试设备授权平台V2.html
git commit -m "feat: 优化基本信息卡片层级"
```

### Task 3: Verify the rendered result

**Files:**
- Verify only: `测试设备授权平台V2.html`

- [ ] **Step 1: Reload and verify desktop layout**

Open `http://127.0.0.1:8123/测试设备授权平台V2.html`, switch from HCI to aTrust, enter `SALES-ATRUST-001`, and verify product/version columns, half-width application type, seven device facts, three-column affiliation row, full-width contact fields, and no overlaps.

- [ ] **Step 2: Verify the borrow panel**

Switch to a non-HCI product, choose the hardware borrowing application type, and verify the in-flow borrow title, 2×2 desktop grid, and unchanged field visibility.

- [ ] **Step 3: Verify the mobile layout**

Apply a mobile viewport, reload, and verify single-column fields, two-column fact items, readable long values, and no horizontal overflow. Reset the viewport override after verification.

- [ ] **Step 4: Check console and Git state**

Read browser error logs, run `git diff --check`, `git status --short`, and `git log -4 --oneline`. Expected: no console errors, no whitespace errors, clean working tree, and separate plan/test/implementation commits on `codex/v2-followup-updates`.
