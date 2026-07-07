# 测试设备授权平台 V2 — 设计系统规范

> 本次更新：2026-07-06 — 新增 Tailwind CSS + MD3 完整色彩体系（来自授权记录页原型）
> 原 V2 HTML（申请授权页）保留作为历史参考

---

## 一、技术栈

| 维度 | 内容 |
|------|------|
| CSS 框架 | **Tailwind CSS**（CDN: `cdn.tailwindcss.com`，插件: `forms, container-queries`） |
| 设计语言 | Material Design 3（MD3） |
| 字体 | **Inter**（Google Fonts） |
| 图标 | **Material Symbols Outlined**（Google Fonts） |
| 配置方式 | `tailwind.config` 内联 `<script>`，定义完整 MD3 色彩令牌 |

---

## 二、色彩系统（MD3 完整令牌）

> 以下色彩令牌定义在 `tailwind.config.theme.extend.colors` 中，Tailwind 类名直接使用。

### 2.1 主色与表层色

| Tailwind 类名 | 色值 | 用途 |
|---------------|------|------|
| `text-primary` / `bg-primary` | `#0050cb` | 主色：链接、按钮、激活态 |
| `bg-primary-container` | `#0066ff` | 主色容器：头像背景 |
| `text-on-primary` | `#ffffff` | 主色上的文字 |
| `text-on-primary-fixed` | `#001849` | 主色固定变体上的文字 |
| `text-primary-fixed` | `#dae1ff` | 主色固定变体 |
| `bg-surface` | `#f8f9ff` | 页面背景 |
| `bg-surface-container-lowest` | `#ffffff` | 卡片/表/面板背景 |
| `bg-surface-container-low` | `#eff4ff` | 次要背景：悬停、统计条 |
| `bg-surface-container` | `#e5eeff` | 更深一层容器 |
| `bg-surface-container-high` | `#dce9ff` | 高对比容器 |
| `bg-surface-container-highest` | `#d3e4fe` | 最高对比容器 |

### 2.2 文字色

| Tailwind 类名 | 色值 | 用途 |
|---------------|------|------|
| `text-on-surface` | `#0b1c30` | 正文主色 |
| `text-on-surface-variant` | `#424656` | 辅助文字、占位符、次要信息 |
| `text-on-secondary` | `#ffffff` | 次要色上的文字 |
| `text-on-secondary-fixed-variant` | `#444749` | 次要色固定变体 |

### 2.3 语义色

| Tailwind 类名 | 色值 | 用途 |
|---------------|------|------|
| `text-error` / `bg-error` | `#ba1a1a` | 错误/必填 |
| `bg-error-container` | `#ffdad6` | 错误容器背景 |
| `text-on-error` | `#ffffff` | 错误色上的文字 |
| `text-on-error-container` | `#93000a` | 错误容器上的文字 |

### 2.4 边框与轮廓

| Tailwind 类名 | 色值 | 用途 |
|---------------|------|------|
| `border-outline-variant` | `#c2c6d8` | 分割线、边框 |
| `border-outline` | `#727687` | 强调边框 |

### 2.5 常用组合模式

| 元素 | Tailwind 类 |
|------|-------------|
| 页面标题 | `text-headline-lg text-headline-lg text-on-surface` |
| 页面描述 | `text-body-md text-body-md text-on-surface-variant` |
| 卡片容器 | `bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30` |
| 输入框 | `border border-outline-variant/50 rounded-lg bg-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20` |
| 主按钮 | `bg-primary text-on-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm` |
| 次要按钮 | `bg-surface text-primary border border-primary/30 rounded-lg hover:bg-surface-container-low transition-colors shadow-sm` |
| 表格表头 | `text-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider` |
| 表格行 | `hover:bg-surface-container-lowest/50 transition-colors divide-y divide-outline-variant/20` |
| Pagination 当前页 | `bg-primary text-on-primary shadow-sm` |
| Pagination 普通页 | `border border-outline-variant/50 text-on-surface hover:bg-surface-container transition-colors` |

---

## 三、排版

### 3.1 字体

```css
font-family: 'Inter', sans-serif;
```

### 3.2 字号体系（Tailwind 类）

| Tailwind 类 | 字号/行高 | 字重 | 用途 |
|-------------|-----------|------|------|
| `text-headline-lg text-headline-lg` | 30px/38px | 600 | 页面大标题 |
| `text-headline-md text-headline-md` | 24px/32px | 600 | 页面标题 |
| `text-headline-sm text-headline-sm` | 20px/28px | 600 | 区块标题 |
| `text-body-lg text-body-lg` | 16px/24px | 400 | 正文大 |
| `text-body-md text-body-md` | 14px/20px | 400 | 正文/表格内容 |
| `text-body-sm text-body-sm` | 12px/16px | 400 | 辅助文字 |
| `text-label-md text-label-md` | 14px/20px | 500 | 标签/按钮文字 |
| `text-label-sm text-label-sm` | 12px/16px | 500 | 小标签/表头 |
| `text-nav-main text-nav-main` | 14px/20px | 500 | 导航文字 |
| `text-logo-text text-logo-text` | 18px/24px | 700 | Logo 文字 |

> **注意**：Tailwind 类名重复写两次，因为 `fontSize` 配置中自定义了完整的 `[size, {lineHeight, letterSpacing, fontWeight}]` 对象。使用时需同时应用 `text-<size>` 和 `text-<size>`（例：`text-headline-md text-headline-md` 等同于 `text-[24px] leading-[32px] font-semibold`）。

### 3.3 图标

```html
<!-- 引入 -->
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet">

<!-- 使用 -->
<span class="material-symbols-outlined">search</span>
<span class="material-symbols-outlined fill">history</span>  <!-- FILL=1 -->
```

- 默认字号：`text-[18px]`（20px 用于某些场景）
- 默认颜色：`text-on-surface-variant`（hover 后 `text-primary`）
- `fill` 类激活填充态（`FILL: 1`）

---

## 四、布局系统

### 4.1 页面结构

```
┌─────────────────────────────────────────────────────┐
│  Header (64px)                                      │
├────────┬────────────────────────────────────────────┤
│        │                                            │
│ Sidebar│  Main Content                              │
│ (240px) │  max-width: 1600px, margin: auto           │
│        │  padding: margin-desktop(40px)              │
│        │  gap: 6 (24px)                             │
│        │                                            │
├────────┴────────────────────────────────────────────┤
│  Footer (auto)                                      │
└─────────────────────────────────────────────────────┘
```

### 4.2 间距体系

| Tailwind 值 | px | 用途 |
|------------|-----|------|
| `gap-1` | 4px | 紧凑间距 |
| `gap-2` | 8px | 按钮间距、徽章间距 |
| `gap-3` | 12px | 筛选项间距 |
| `gap-4` | 16px | 内容区块间距 |
| `gap-6` | 24px | 大区块间距 |
| `p-5` | 20px | 卡片内边距 |
| `px-6` / `py-4` | 24px / 16px | 表格单元格 |
| `px-gutter` | 24px | Header 水平 padding |
| `p-margin-desktop` | 40px | 内容区大屏 padding |
| `p-margin-mobile` | 16px | 内容区小屏 padding |

### 4.3 响应式断点

| 断点 | 调整 |
|------|------|
| `md:` (768px) | 显示侧边栏、导航文字 |
| `lg:` (1024px) | 筛选栏水平排列 |
| default | 移动端垂直堆叠 |

---

## 五、圆角体系

| Tailwind 类 | 值 | 用途 |
|------------|-----|------|
| `rounded` (DEFAULT) | `0.25rem` (4px) | 标准圆角 |
| `rounded-lg` | `0.5rem` (8px) | 按钮、输入框、卡片 |
| `rounded-xl` | `0.75rem` (12px) | 卡片容器 |
| `rounded-full` | `9999px` | Pill、状态徽章 |
| `rounded-md` | 6px | 分页按钮 |

---

## 六、阴影体系

| Tailwind 类 | 值 | 用途 |
|------------|-----|------|
| `shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | 卡片容器、按钮 |
| `shadow` | 默认 | 下拉菜单、弹窗 |

> 整体采用偏平设计，阴影仅用在卡片容器和按钮上。

---

## 七、组件规范

### 7.1 Header（顶部导航栏）

```
fixed top-0 w-full z-50
bg-secondary dark:bg-on-secondary-fixed-variant
text-on-secondary
border-b border-outline-variant
h-header-height (64px)
px-gutter (24px)
flex justify-between items-center
```

- 左侧：Logo（`font-bold tracking-tight text-lg`）
- 右侧：导航链接 + 通知按钮 + 帮助按钮 + 用户头像

### 7.2 Sidebar（侧边栏）

```
fixed left-0 top-header-height
w-sidebar-width (240px)
h-[calc(100vh-64px)]
border-r border-outline-variant
bg-surface-container-lowest
z-40
```

- 顶部：用户信息（头像 + 姓名 + 欢迎语）
- 中间：导航列表（`px-3 py-2 space-y-1`）
- 激活项：`text-primary border-l-4 border-primary bg-surface-container-low font-bold`
- 底部：联系我们等

### 7.3 页面标题区

```html
<h1 class="text-headline-lg text-headline-lg text-on-surface">页面标题</h1>
<p class="text-body-md text-body-md text-on-surface-variant mt-1">页面描述</p>
```

### 7.4 统计 Pill 条

```html
<div class="flex flex-wrap items-center gap-2 bg-surface-container-lowest p-1.5 rounded-full border border-outline-variant/40 shadow-sm">
  <div class="flex items-center gap-2 px-3 py-1 rounded-full bg-surface ...">
    <span class="w-2 h-2 rounded-full bg-xxx"></span>
    <span>标签文字 N</span>
  </div>
</div>
```

- 容器：`rounded-full`，内边距 `p-1.5`
- 每个统计项：`rounded-full`，`px-3 py-1`
- 圆点：`w-2 h-2 rounded-full`
- 可点击项：`hover:bg-surface-container transition-colors cursor-pointer`

### 7.5 筛选栏

```
bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 p-5
flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between
```

**筛选组**（`flex flex-wrap items-center gap-3`）：

**带标签的选择框**（分组过滤）：
```html
<div class="flex items-center border border-outline-variant/50 rounded-lg bg-surface focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20 overflow-hidden h-10">
  <label class="px-3 py-2 bg-surface-container-lowest border-r border-outline-variant/50 ...">标签</label>
  <select class="border-0 bg-transparent py-2 pl-3 pr-8 ...">
    <option>选项</option>
  </select>
</div>
```

**带图标的搜索输入框**：
```html
<div class="flex items-center border border-outline-variant/50 rounded-lg bg-surface focus-within:border-primary ... h-10 px-3 w-[180px]">
  <span class="material-symbols-outlined text-[18px] text-on-surface-variant mr-2">search</span>
  <input class="border-0 bg-transparent p-0 w-full ..." placeholder="占位文字" type="text"/>
</div>
```

### 7.6 表格

| 部分 | 样式 |
|------|------|
| 容器 | `bg-surface-container-lowest rounded-xl shadow-sm border border-outline-variant/30 overflow-hidden` |
| 表头 | `text-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider py-4 px-6` |
| 普通单元格 | `py-4 px-6 text-body-sm text-body-sm text-on-surface/variant whitespace-nowrap` |
| 行悬停 | `hover:bg-surface-container-lowest/50 transition-colors` |
| 操作按钮 | `text-primary hover:bg-primary/10 rounded transition-colors font-medium text-xs p-1` |
| 续期按钮 | `px-2 py-1 bg-primary text-on-primary rounded text-[11px] font-medium hover:bg-primary/90 transition-colors shadow-sm` |

**状态 Pill**：
```html
<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-xxx text-xxx border border-xxx">
  <span class="w-1.5 h-1.5 rounded-full bg-xxx"></span>
  状态文字
</span>
```

| 状态 | bg | text | border | dot |
|------|----|------|--------|-----|
| 已授权 | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` | `bg-emerald-500` |
| 待审批 | `bg-blue-50` | `text-blue-700` | `border-blue-200` | `bg-blue-500` |
| 审批中 | `bg-amber-50` | `text-amber-700` | `border-amber-200` | `bg-amber-500 animate-pulse` |
| 已驳回 | `bg-error-container/30` | `text-error` | `border-error/20` | `bg-error` |

**授权类型 Pill**：
| 类型 | bg | text | border |
|------|----|------|--------|
| 产品授权 | `bg-primary/10` | `text-primary` | `border-primary/20` |
| XaaS | `bg-emerald-50` | `text-emerald-700` | `border-emerald-200` |
| 解决方案 | `bg-amber-50` | `text-amber-700` | `border-amber-200` |

**客户徽章**：
| 类型 | bg | text | border |
|------|----|------|--------|
| KA客户 | `bg-amber-100` | `text-amber-800` | `border-amber-200` |
| 普通客户 | `bg-slate-100` | `text-slate-600` | `border-slate-200` |

### 7.7 分页

```
flex items-center justify-between
```

- 左侧：文字信息 "显示第 X 到 Y 条，共 Z 条记录"
- 右侧：分页按钮组（`flex items-center gap-1`）
  - 当前页：`bg-primary text-on-primary shadow-sm`
  - 普通页：`border border-outline-variant/50 text-on-surface hover:bg-surface-container`
  - 翻页箭头：`material-symbols-outlined text-[18px]`
- 跳转：`input w-12 h-8 border rounded-md text-center` + "前往 X 页"

### 7.8 解决方案折叠行

- 主行：`bg-surface-container-lowest/30`（微高亮区分）
- 展开箭头：`material-symbols-outlined > chevron_right`，展开后旋转
- 展开详情：内嵌子表格，缩进展示各产品授权明细

---

## 八、过渡与动画

| 元素 | 过渡/动画 | 时长 |
|------|----------|------|
| 按钮 Hover | `transition-colors` | 150ms |
| 输入框 Focus | `focus-within:border-primary focus-within:ring-1` | 150ms |
| 表格行 Hover | `transition-colors` | 150ms |
| 导航项 Hover | `transition-all` | 150ms |
| 审批中状态 | `animate-pulse` | 持续闪烁 |
| Sidebar 导航项 | `transition-colors` | 150ms |

---

## 九、新页面遵循规范

1. **CSS 框架**：使用 Tailwind CSS（CDN 引入），不要使用 Layui 的原生 CSS
2. **色彩**：使用上述 MD3 色彩令牌，通过 Tailwind 类名引用
3. **字体**：默认 Inter，图标使用 Material Symbols Outlined
4. **布局**：Header(64px) + Sidebar(240px) + 内容区（max-width: 1600px）
5. **组件**：使用上述组件规范中的 Tailwind 类组合
6. **状态标识**：统一使用 full rounded 的 Pill 样式
7. **操作按钮**：表格内操作用文字按钮（`text-primary hover:bg-primary/10`），强调操作用实心按钮
8. **响应式**：至少适配 md(768px) 和 lg(1024px) 两个断点
