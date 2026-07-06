# 测试设备授权平台 V2 — 设计系统规范

> 基于 `测试设备授权平台V2.html` 提取，遵循 Material Design 3（MD3）设计语言
> 最后更新：2026-07-06

---

## 一、色彩系统

### 1.1 主色调

| 用途 | 色值 | 备注 |
|------|------|------|
| Primary（主色） | `#0050cb` | 按钮、激活态、链接 |
| Primary Hover | `#003fa3` | 按钮悬停 |
| Primary Pill | `#dae1ff` bg / `#0050cb` text | 功能开关开启态 |
| Primary Light | `#eff4ff` | 行悬停背景、搜索下拉悬停 |
| Primary Border | `#e5eeff` | 输入框默认边框 |

### 1.2 中性色

| 用途 | 色值 |
|------|------|
| Surface 容器色 | `#f8f9ff` |
| 卡片/背景纯白 | `#ffffff` |
| 标题色（强调） | `#1a1a2e` / `#0b1c30` |
| 正文色（默认） | `#424656` |
| 辅助/次要文字 | `#8b92a5` |
| 占位/灰色文字 | `#999` |
| 分割线/边框 | `#eff4ff` / `#e6e6e6` |
| 输入框边框 | `#e5eeff` |
| 输入框 Hover 边框 | `#c2c6d8` |
| 禁用背景 | `#e8ecf0` |
| 不可用按钮 | `#aaa` |

### 1.3 语义色

| 用途 | 色值 | 场景 |
|------|------|------|
| 错误/必填 | `#ba1a1a` / `#c62828` | 校验失败提示、必填星号、红色边框 |
| 成功 | `#2e7d32` | 通过状态 |
| 警告 | `#e65100` | 超限提示、过期警告 |
| Toast 成功 | `#4CAF50` | 操作成功提示 |
| Toast 警告 | `#ff9800` | 操作警告提示 |

### 1.4 徽章/Pill 体系

| 类型 | 背景 | 文字 | 边框 | 场景 |
|------|------|------|------|------|
| KA 客户 | `#fff3e0` | `#e65100` | `#ffcc80` | KA 客户标识 |
| 普通客户 | `#e8f5e9` | `#2e7d32` | `#a5d6a7` | 普通客户标识 |
| 状态-活跃 | `#e8f5e9` | `#2e7d32` | — | 授权有效 |
| 状态-过期 | `#fce4ec` | `#c62828` | — | 授权过期 |
| 功能 Pill-开 | `#dae1ff` | `#0050cb` | — | 功能开启 |
| 功能 Pill-关 | `#e8ecf0` | `#8b92a5` | — | 功能关闭 |
| 模块状态-启用 | `#0050cb` | `#ffffff` | — | 模块已启用 pill |
| 模块状态-禁用 | `#e8ecf0` | `#8b92a5` | — | 模块已禁用 pill |
| 续期-常规 | `#e8f5e9` | `#2e7d32` | `#a5d6a7` | 常规续期 |
| 续期-超规 | `#fff3e0` | `#e65100` | `#ffcc80` | 超规续期 |
| 日期限制-普通 | `#dce8ff` | `#0050cb` | — | 90 天 |
| 日期限制-KA | `#fff3e0` | `#e65100` | — | 180 天 |

### 1.5 Special 交互色

| 元素 | 默认 | Hover | Focus/Active |
|------|------|-------|-------------|
| 输入框 | border `#e5eeff` bg `#fff` | border `#c2c6d8` | border `#0050cb` + `box-shadow: 0 0 0 3px rgba(0,80,203,.08)` |
| 主按钮 | bg `#0066ff`/`#0050cb` color `#fff` | `opacity: 0.9` + `box-shadow: 0 2px 8px rgba(0,80,203,.25)` | — |
| 次要按钮 | bg `#fff` color `#0050cb` border `#0050cb` | bg `#eff4ff` | — |
| 下拉悬停 | — | bg `#eff4ff` color `#0050cb` | bg `#e5eeff` color `#0050cb` font-weight `500` left-border `2px solid #0050cb` |
| 导航项 | color `#424656` | bg `#eff4ff` color `#0050cb` | bg `#0050cb` color `#fff` font-weight `600` |
| 功能 Pill | on: `#dae1ff/#0050cb`, off: `#e8ecf0/#8b92a5` | `transform: translateY(-1px)`, `box-shadow: 0 2px 6px rgba(0,0,0,.06)` | — |
| 卡片头部 | — | bg `#f0f3ff` | — |
| 卡片本体 | `box-shadow: 0 1px 4px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.04)` | `box-shadow: 0 4px 12px rgba(0,0,0,.08)` | — |

---

## 二、布局系统

### 2.1 页面结构

```
┌─────────────────────────────────────────┐
│  Header (50px)                          │
├──────┬──────────────────────────────────┤
│      │  Tab Bar (40px)                  │
│ Side ├──────────────────────────────────┤
│(200px)│  Content Body                   │
│      │  max-width: 900px, margin: auto  │
│      │  padding: 12px 200px 12px 200px  │
│      │                                  │
├──────┴──────────────────────────────────┤
│  Footer (44px)                          │
└─────────────────────────────────────────┘
```

### 2.2 关键尺寸

| 元素 | 尺寸 |
|------|------|
| 内容最大宽度 | 900px |
| 左侧导航宽度 | 200px |
| 右侧模块导航宽度 | 168px（紧凑 156px/138px） |
| Header 高度 | 50px |
| Tab Bar 高度 | 40px |
| Footer 高度 | 44px |
| 内容区 padding | `12px 200px` |

### 2.3 响应式断点

| 断点 | 调整内容 |
|------|----------|
| ≤1520px | 右侧 padding 缩小至 40px，内容区 max-width 自适应 |
| ≤1366px | 右侧 padding → 28px，右侧导航缩小 |
| ≤1100px | 右侧 padding → 18px，导航缩至 138px |
| ≤768px | 隐藏左侧导航，右导航缩至 126px，单列布局 |
| ≤480px | 表单垂直排列，按钮全宽 |

---

## 三、圆角体系

| 级别 | 圆角值 | 应用 |
|------|--------|------|
| 卡片 | `12px` | 模块卡片、特殊表单区、右侧导航 |
| 控件 | `8px` | 输入框、按钮、下拉框、文件信息框、导航项 |
| 徽章 | `16px`/`999px` | 状态 Pill、功能 Pill、模块状态标签 |
| 小控件 | `6px` | 查询 Tab、内联选择框、规格按钮 |
| 工具提示 | `8px` | Tooltip 弹窗 |
| 搜索下拉 | `2px` | 旧版搜索下拉容器 |

---

## 四、阴影体系

| 层级 | 阴影值 | 用途 |
|------|--------|------|
| 基础 | `0 1px 4px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.04)` | 卡片默认 |
| 抬高 | `0 4px 12px rgba(0,0,0,.08)` | 卡片 Hover |
| 浮层 | `0 4px 12px rgba(0,0,0,.04), 0 1px 3px rgba(0,0,0,.02)` | 下拉菜单 |
| 菜单 | `0 2px 10px rgba(0,0,0,.12)` | 搜索下拉 |
| 强调 | `0 2px 12px rgba(0,0,0,.08)` | 右侧导航 |
| 按钮 | `0 2px 8px rgba(0,80,203,.25)` | 按钮 Hover |
| Modal | `0 4px 20px rgba(0,0,0,.15)` | 弹窗 |
| Tooltip | `0 4px 16px rgba(0,0,0,.25)` | 工具提示 |

---

## 五、排版

### 5.1 字体栈

```
font-family: "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif;
```

### 5.2 字号与字重

| 用途 | 字号 | 字重 | 色值 |
|------|------|------|------|
| 页面标题/模块名 | 15px | 600 | `#1a1a2e` |
| 操作栏标题 | 15px | 600 | `#1a1a2e` |
| 表单标签 | 14px | 500 | `#424656` |
| 输入框文字 | 14px | 400 | `#0b1c30` |
| 下拉选项 | 14px | 400 | `#424656` |
| 按钮文字 | 14px | 500 | `#fff` / `#0050cb` |
| 辅助说明 | 12px | 400 | `#8b92a5` / `#999` |
| 徽章/Pill | 11-12px | 500-600 | 见色彩体系 |
| Tab 标签 | 13px | 500 | `#8b92a5` (active: `#0050cb`) |
| Toast | 14px | 400 | `#fff` |

### 5.3 图标

使用 **Material Symbols Outlined** 字体图标：
- 引用：`https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap`
- 设置方式：`font-family: 'Material Symbols Outlined'; font-size: 22px`
- 常用图标：`arrow_drop_down`、`close`、`expand_less` 等

---

## 六、组件规范

### 6.1 表单元素

#### 输入框（.layui-input）
```
height: 40px; border-radius: 8px; border: 1px solid #e5eeff;
padding: 0 12px; background: #fff; max-width: 300px;
transition: all 0.15s;
```
- Hover: `border-color: #c2c6d8`
- Focus: `border-color: #0050cb` + `box-shadow: 0 0 0 3px rgba(0,80,203,.08)`

#### 下拉选择框（.layui-select-box / .layui-select）
```
height: 40px; border-radius: 8px; border: 1px solid #c2c6d8;
padding: 0 36px 0 12px; max-width: 300px;
appearance: none; cursor: pointer;
```
- Focus: `border: 2px solid #0050cb` + `box-shadow: 0 0 0 3px #b3c5ff`

#### 自定义下拉框（.custom-select）
完整自定义组件，包含 trigger + dropdown + option 体系
- Trigger: `height: 40px; border: 1px solid #c2c6d8; border-radius: 8px;`
- Dropdown: `box-shadow + border-radius: 8px`
- Option hover: `background: #eff4ff; color: #0050cb`
- Option selected: `background: #e5eeff; color: #0050cb; font-weight: 500; border-left: 2px solid #0050cb`
- Group label: `font-weight: 500; color: #0b1c30; padding: 8px 12px`
- Arrow: `Material Symbols Outlined: arrow_drop_down`，open 时旋转 180deg

#### 文本域（.layui-textarea）
```
width: 100%; max-width: 400px; min-height: 100px;
border: 1px solid #e5eeff; border-radius: 8px;
padding: 10px 12px; resize: vertical;
```

### 6.2 按钮

#### 主按钮（.layui-btn）
```
height: 40px; padding: 0 24px; background: #0066ff;
color: #fff; border: 1px solid #0066ff; border-radius: 8px;
font-size: 14px; font-weight: 500;
```
- Hover: `opacity: 0.9; box-shadow: 0 2px 8px rgba(0,80,203,.25)`
- Disabled: `opacity: 0.5; cursor: not-allowed; box-shadow: none`

#### 次要按钮（.layui-btn-primary）
```
background: #fff; color: #0050cb; border-color: #0050cb;
```
- Hover: `background: #eff4ff; box-shadow: none`

#### 工具按钮（.toolbar-btn）
```
height: 28px; padding: 0 12px; background: #eff4ff;
color: #0050cb; border-radius: 8px; font-size: 12px;
```

### 6.3 开关（Toggle Switch）

```
width: 40px; height: 22px; border-radius: 11px;
cursor: pointer; transition: background 0.2s;
```
- 开启：`background: #0050cb`，滑块右侧（`left: 21px`）
- 关闭：`background: #c2c6d8`，滑块左侧（`left: 3px`）
- 滑块：`width: 16px; height: 16px; border-radius: 50%; background: #fff`

### 6.4 模块卡片（.module-item）

```
background: #f8f9ff; border-radius: 12px; border: none;
overflow: hidden; max-width: 900px; margin: 0 auto 12px;
box-shadow: 0 1px 4px rgba(0,0,0,.06), 0 0 1px rgba(0,0,0,.04);
```
- Hover: `box-shadow: 0 4px 12px rgba(0,0,0,.08)`
- Disabled: `opacity: 0.45`

**卡片头部（.module-head）**：
```
display: flex; align-items: center; padding: 14px 22px; gap: 12px;
cursor: pointer; user-select: none;
```
- Hover: `background: #f0f3ff`

**卡片内容区（.module-body）**：
```
border-top: 1px solid #eff4ff; padding: 14px 22px;
```

**双栏网格（.module-grid）**：
```
display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px;
```

**功能开关区（.module-features）**：
```
border-top: 1px solid #eff4ff; padding: 8px 0;
display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
```

### 6.5 文件上传（.hw-upload-area）

```
display: flex; align-items: center; gap: 10px; min-height: 40px;
```
布局：文件名容器（左）→ 上传按钮（右）→ 校验结果 pill

- 文件名容器：`width: 300px; height: 40px; border: 1px solid #e5eeff; border-radius: 8px;`
- 上传按钮：主按钮样式 + upload icon (⇧)
- 校验结果：pill 样式（`.pass: #e8f5e9/#2e7d32` / `.fail: #ffebee/#c62828`）

### 6.6 模块导航（.module-nav）

```
position: fixed; top: 100px; right: 12px; width: 168px;
background: #fff; border-radius: 12px; padding: 10px 6px;
max-height: calc(100vh - 160px); overflow-y: auto;
box-shadow: 0 2px 12px rgba(0,0,0,.08);
```
- Item hover: `background: #eff4ff; color: #0050cb; border-radius: 8px;`
- Item active: `background: #0050cb; color: #fff; font-weight: 600;`
- Title: `font-size: 13px; font-weight: 600; color: #1a1a2e;`

### 6.7 Tooltip

```
background: #1f2937; color: #f3f4f6; border-radius: 8px;
padding: 14px 16px; font-size: 13px; line-height: 1.7;
box-shadow: 0 4px 16px rgba(0,0,0,.25);
```
- 三角箭头：`border-right: 6px solid #1f2937`
- 复制按钮：右上角 `border: 1px solid #4b5563; color: #9ca3af;`

### 6.8 Toast

```
position: fixed; top: 60px; right: 20px; background: #4CAF50;
color: #fff; padding: 10px 20px; border-radius: 4px;
font-size: 14px; z-index: 99999;
```

### 6.9 Tab 栏（.renewal-tab-bar / .ea-tab-bar）

```
display: flex; gap: 0; border-bottom: 2px solid #e5eeff;
```
- Tab: `padding: 8px 20px; font-size: 13px; font-weight: 500; color: #8b92a5; border-bottom: 2px solid transparent; margin-bottom: -2px;`
- Active: `color: #0050cb; border-bottom-color: #0050cb;`

### 6.10 搜索下拉（.search-select-box）

- Input: 同标准输入框, `max-width: 300px;`
- Dropdown: `border: 1px solid #e6e6e6; border-radius: 2px; box-shadow: 0 2px 10px rgba(0,0,0,.12); max-height: 300px;`
- Item: `padding: 9px 15px; border-bottom: 1px solid #f6f6f6; display: flex; justify-content: space-between;`
- Item hover: `background: #eff4ff; color: #0050cb;`

---

## 七、间距体系

| 间距 | 值 | 典型用途 |
|------|----|---------|
| 超小 | 4px/6px | 字段间紧凑排列 |
| 小 | 8px/10px | gap、间距 |
| 中 | 12px/14px | 卡片内边距、字段间隔 |
| 大 | 18px/20px/22px | 卡片 body 内边距、分区间距 |
| 特大 | 24px | 弹窗内边距 |
| 底部 | 12px/15px | 表单项间距、卡片间隔 |

---

## 八、过渡与动画

| 元素 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| 输入框边框 | border-color | 0.15s | ease |
| 按钮 Hover | opacity, box-shadow | 0.2s | ease |
| 下拉箭头旋转 | transform | 0.2s | ease |
| 折叠箭头旋转 | transform | 0.2s | ease |
| 开关滑块 | left, background | 0.2s | ease |
| 卡片阴影 | box-shadow | 0.2s | ease |
| 禁用模块 | opacity | 0.3s | ease |
| 导航项 | all | 0.15s | ease |
| Pill Hover | transform, box-shadow | 0.2s | ease |
| 功能开关 Transition | all | 0.2s | ease |

---

## 九、新页面遵循规范

所有新增页面需遵循以下规则：

1. **色彩**：使用上述色板中的色值，不得引入新的色值
2. **布局**：内容区最大宽度 900px + 水平居中
3. **组件**：优先复用现有组件（`custom-select`、`toggle-switch`、Pill、Badge 等）
4. **圆角**：严格遵循圆角体系（12px/8px/16px/6px）
5. **阴影**：遵循阴影分层体系
6. **间距**：使用间距体系中的值
7. **图标**：使用 Material Symbols Outlined 图标库
8. **响应式**：适配 5 个断点（1520/1366/1100/768/480）
