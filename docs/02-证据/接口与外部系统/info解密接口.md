# 解密硬件信息接口文档

> 本文档基于 [`base/proto/licensesyssrv/licensesys.proto`](..\base\proto\licensesyssrv\licensesys.proto) 中的
> `DecryptDeviceInfoReq` / `DecryptDeviceInfoResp` 结构体生成，描述请求与应答两部分。字段名与示例均以
> 测试环境（`https://200.200.4.21:4431`）实际返回为准。

- 接口用途：解密硬件信息（解密设备上报的硬件指纹，返回产品信息、时间戳与 CPU 信息），
  可选地校验设备版本与授权版本是否兼容
- 使用对象：授权中心 gRPC / W3 平台 HTTP
- 传输协议：gRPC / HTTP (JSON)
- HTTP 路径：`POST /lic/v1/api/licensesys/rpc/decrypt/info`

---

## 1. 请求

### 1.1 请求参数（DecryptDeviceInfoReq）

```json
{
  "product": "HCI",
  "dev_info": "<设备上报的加密硬件信息>",
  "lic_version": "6.9.0",
  "language": ""
}
```

| 字段 | 类型 | 必填 | 说明 |
|:-----|:-----|:----:|:-----|
| `product` | string | 否 | 产品名，用于解密时定位产品密钥 |
| `dev_info` | string | 是 | 设备上报的加密硬件信息（base64） |
| `lic_version` | string | 否 | 授权版本。传入时与 `dev_info` 解出的设备版本做兼容性比较；**为空时不比较** |
| `language` | string | 否 | 授权语言，用于查询授权版本兼容配置 |

### 1.2 鉴权

HTTP 调用需在 query 中携带：`platform_type`（AK）、`sign`、`time`。

`sign = HMAC-SHA256(secret, time)`，取 hex 小写。

### 1.3 版本兼容校验规则

仅当传入非空 `lic_version` 时触发，按 `(product, lic_version, language)` 查询 `license_version_match` 配置：

- 配置的支持区间为 **[support_min_version, unsupport_min_version)**，两端为空表示该侧不限制
- 设备版本落在区间内 → 兼容；超出区间 → 不兼容（`versionIncompatible` 置 `true`）
- 查不到配置、或设备版本为空 → 视为兼容
- **仅打标记，不做自动纠错**；配置查询异常时降级为按兼容处理，仅记录告警日志，不阻断解密

---

## 2. 应答通用结构

接口应答统一包裹在通用响应体中，`data` 字段即为本接口返回的业务数据（`DecryptDeviceInfoResp`）。

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "product": { },
    "timestamp": "0",
    "cpuinfo": { },
    "versionIncompatible": false
  }
}
```

| 字段 | 类型 | 说明 |
|:-----|:-----|:-----|
| `code` | int | 业务返回码，`0` 表示成功 |
| `message` | string | 返回信息，成功时为 `成功` |
| `data` | object | 业务数据，即 `DecryptDeviceInfoResp` 结构 |

---

## 3. data 响应体（DecryptDeviceInfoResp）

```json
{
  "product": {
    "id": "",
    "name": "",
    "idtype": "",
    "language": "",
    "version": "",
    "appversion": "",
    "sfversion": "",
    "sn": "",
    "clusterId": "",
    "oldLicense": {}
  },
  "timestamp": "0",
  "cpuinfo": {
    "vendor": "",
    "family": "",
    "model": "",
    "modelname": "",
    "stepping": ""
  },
  "versionIncompatible": false
}
```

### 3.1 data 字段说明

| 字段 | 类型 | 必填 | 说明 |
|:-----|:-----|:----:|:-----|
| `product` | object (DeviceProduct) | 否 | 设备产品信息，解密失败或不存在时可能为空 |
| `timestamp` | string | 否 | 时间戳（秒），设备上报硬件信息时的时间。**实测以字符串形式返回** |
| `cpuinfo` | object (Cpuinfo) | 否 | 设备 CPU 信息 |
| `versionIncompatible` | bool | 否 | 设备版本与授权版本不兼容标记。`true` 表示不兼容 |

> **`versionIncompatible` 字段注意**：该字段为布尔值且带 `omitempty`，值为 `false` 时
> **不会出现在响应中**。因此"字段缺失"有两种可能：未传 `lic_version`（未校验），或校验结果为兼容。
> 调用方若需区分，请以请求是否传入 `lic_version` 为准；判断不兼容请使用 `versionIncompatible === true`，
> 不要用字段是否存在来判断。

---

## 4. product 对象（DeviceProduct）

设备产品信息结构。

| 字段 | 类型 | 必填 | 说明 |
|:-----|:-----|:----:|:-----|
| `id` | string | 否 | 产品 ID |
| `name` | string | 否 | 产品名称 |
| `idtype` | string | 否 | ID 类型（如 `saasid` / `gatewayid` / `keyid` / `virtualid` / `clusterid` 等） |
| `language` | string | 否 | 语言 |
| `version` | string | 否 | 产品版本 |
| `appversion` | string | 否 | 应用版本 |
| `sfversion` | string | 否 | 深信服软件版本 |
| `sn` | string | 否 | 设备序列号 |
| `cluster_id` | string | 否 | 集群 ID（Go 字段名 `cluster_id`，JSON 别名 `clusterId`） |
| `old_license` | map<string,string> | 否 | 旧授权信息映射（Go 字段名 `old_license`，JSON 别名 `oldLicense`） |

> **字段名/别名说明**：`cluster_id` 与 `old_license` 在 Go 结构体中的 JSON tag 分别为 `clusterId`、`oldLicense`，即 JSON 序列化时使用驼峰命名，请以实际返回的 JSON 字段名为准。

---

## 5. cpuinfo 对象（Cpuinfo）

设备 CPU 信息结构。

| 字段 | 类型 | 必填 | 说明 |
|:-----|:-----|:----:|:-----|
| `vendor` | string | 否 | CPU 厂商 |
| `family` | string | 否 | CPU 家族 |
| `model` | string | 否 | CPU 型号编号 |
| `modelname` | string | 否 | CPU 型号名称 |
| `stepping` | string | 否 | CPU 步进（stepping） |

---

## 6. 完整应答示例

### 6.1 传入 `lic_version` 且不兼容

请求：`{"product":"HCI","dev_info":"<加密信息>","lic_version":"6.9.0"}`

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "product": {
      "id": "AF7711CB",
      ### 6.1 传入 `lic_version` 且不兼容

请求：`{"product":"HCI","dev_info":"<加密信息>","lic_version":"6.9.0"}`

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "product": {
      "id": "AF7711CB",
      "name": "HCI",
      "idtype": "gwid",
      "language": "zh",
      "version": "6.8.0",
      "appversion": "20221010",
      "sfversion": "1.0.0",
      "clusterId": "2896b56e-3e4c-42a8-bcd8-b409a43f2375",
      "oldLicense": {
        "PR_UPD": "FKWPJFRFZ5MWJDX2"
      }
    },
    "timestamp": "1793157772",
    "cpuinfo": {
      "vendor": "GenuineIntel",
      "family": "6",
      "model": "15",
      "modelname": "Intel(R) Core(TM)2 Duo CPU     T7700  @ 2.40GHz",
      "stepping": "11"
    },
    "versionIncompatible": true
  }
}
```

### 6.2 不传 `lic_version`（不校验）

请求：`{"product":"HCI","dev_info":"<加密信息>"}`

响应中**不含** `versionIncompatible` 字段，其余结构与上例一致：

```json
{
  "code": 0,
  "message": "成功",
  "data": {
    "product": { },
    "timestamp": "1793157772",
    "cpuinfo": { }
  }
}
```

### 6.3 传入 `lic_version` 且兼容

请求：`{"product":"HCI","dev_info":"<加密信息>","lic_version":"6.8.0"}`

`versionIncompatible` 为 `false`，因 `omitempty` 同样不出现在响应中，结构与 6.2 一致。

---

## 7. 返回码说明

| code | message | 说明 |
|:----:|:--------|:-----|
| 0 | 成功 | 成功，`data` 中返回解密后的设备信息 |
| 非 0 | 错误描述 | 失败，`data` 通常为空或部分字段为空 |

> 具体错误码定义请以授权中心接口规范为准，本文档仅描述成功应答的结构。