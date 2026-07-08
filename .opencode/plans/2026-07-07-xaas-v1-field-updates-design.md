# XaaS V1 字段调整设计文档

## 概述
对 XaaS 授权申请的字段显示、数据结构和交互逻辑进行调整，共计 5 项改动。

## 1. 所属云图账号添加字段

### 数据改造
`mockCloudAccounts` 每条数据增加字段：`tenantId`、`tenantName`、`masterAccount`、`masterContact`

### UI 改造
在 `#xaasCloudAccountItem` 的 `.layui-input-block` 中，下拉框下方新增 4 个展示字段：
- 租户 ID、租户名、主账号、主账号联系人
初始隐藏，选中云图账号后展示并填充数据。

## 2. 字段顺序调整
将 `#xaasCloudAccountItem` DOM 节点移动到客户名称字段之前。
新顺序：联系人姓名 → 手机号 → 邮箱 → 所属云图账号 → 客户名称 → 行业 → 订阅产品 → ...

## 3. 删除所属区域字段
移除整个 `xaas-region` 相关 DOM 及 JS 校验/重置引用。

## 4. SASE-SWG 去除每分支带宽
从 HTML、`xaasSpecValues`、重置、验证、绑定、弹窗中彻底移除 `bandwidth` / `swg-bw`。

## 5. SASE-GA 去除修改规格按钮 + 二次申请置灰
- 删除 `.xaas-spec-btn` 和 `#ga-inline-spec`
- 客户已使用过 GA（previous/active）→ checkbox disabled，整行置灰，提示"GA只支持新用户使用"

## 数据流变更
当前：Phone → mcodes(客户ID) → 选客户 → 加载云图账号
改为：Phone → 返回云图账号列表(含客户ID) → 0/1/2+ 条分别处理 → 加载客户信息
