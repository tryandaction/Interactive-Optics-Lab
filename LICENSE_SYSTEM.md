# OpticsLab 许可证系统实施指南

## 概述

OpticsLab 采用 **Open Core** 商业模式，核心功能开源免费，高级功能需要付费许可证。本文档介绍许可证系统的实施、使用和管理。

---

## 系统架构

### 组件结构

```
OpticsLab/
├── src/license/
│   ├── LicenseValidator.js    # 许可证验证核心
│   └── LicenseUI.js            # 许可证UI组件
├── scripts/
│   └── generate-license.js     # 许可证生成脚本
└── main.js                     # 集成许可证验证
```

### 工作流程

```
用户购买 → 生成许可证密钥 → 用户激活 → 本地验证 → 功能解锁
```

---

## 许可证密钥格式

### 密钥结构

```
BASE64_DATA.SIGNATURE
```

- **BASE64_DATA**: Base64 编码的用户数据 `email|plan|expiryDate`
- **SIGNATURE**: HMAC-SHA256 签名的前 16 位（用于验证）

### 示例

```
ZW1haWx8cHJvfDIwMjctMTItMzE=.a1b2c3d4e5f6g7h8
```

解码后:
- Email: `user@example.com`
- Plan: `pro`
- Expiry Date: `2027-12-31`

---

## 许可证计划

| 计划 | 价格 | 功能 |
|------|------|------|
| **Free** | $0 | 基础导出、本地存储、基础预设 |
| **Pro** | $99/年 | + 云端同步、高清导出、高级预设、批量导出 |
| **Education** | $49/年 | Pro 功能 + 教育专用预设、课程模板 |
| **Team** | $588/年 | Pro 功能 + 团队共享、协作编辑 |
| **Enterprise** | 定制 | 所有功能 + 私有部署、API 访问 |

---

## 生成许可证密钥

### 安装依赖

```bash
cd OpticsLab
npm install
```

### 单个许可证生成

```bash
node scripts/generate-license.js <email> <plan> <expiryDate>
```

**示例:**

```bash
# 生成 Pro 版许可证，有效期至 2027-12-31
node scripts/generate-license.js user@example.com pro 2027-12-31
```

**输出:**

```
✓ License Key Generated Successfully

Details:
  Email:       user@example.com
  Plan:        pro
  Expiry Date: 2027-12-31

License Key:
  dXNlckBleGFtcGxlLmNvbXxwcm98MjAyNy0xMi0zMQ==.a1b2c3d4e5f6g7h8

Verification:
  Valid: ✓

Instructions:
  1. Send this license key to the user
  2. User opens OpticsLab
  3. User clicks on license status indicator
  4. User pastes the key and clicks "Activate"
```

### 批量生成许可证

创建 CSV 文件 `licenses.csv`:

```csv
email,plan,expiryDate
user1@example.com,pro,2027-12-31
user2@example.com,education,2027-06-30
user3@example.com,team,2028-01-31
```

运行批量生成:

```bash
node scripts/generate-license.js --batch licenses.csv
```

输出文件 `licenses_output.csv` 包含所有生成的许可证密钥。

### 验证许可证

```bash
node scripts/generate-license.js --verify <licenseKey>
```

**示例:**

```bash
node scripts/generate-license.js --verify dXNlckBleGFtcGxlLmNvbXxwcm98MjAyNy0xMi0zMQ==.a1b2c3d4e5f6g7h8
```

---

## 用户激活流程

### 1. 购买许可证

用户通过以下渠道购买:
- Gumroad: https://gumroad.com/opticslab
- Stripe: https://opticslab.app/pricing
- 企业直接联系

### 2. 接收许可证密钥

用户购买后会收到邮件，包含:
- 许可证密钥
- 激活说明
- 支持联系方式

### 3. 激活许可证

**方法 A: 通过 UI 激活**

1. 打开 OpticsLab
2. 点击右上角的许可证状态指示器（显示 "Free"）
3. 在弹出的对话框中粘贴许可证密钥
4. 点击 "激活" 按钮
5. 刷新页面以应用更改

**方法 B: 通过控制台激活**

```javascript
// 打开浏览器控制台 (F12)
licenseValidator.activate('YOUR_LICENSE_KEY_HERE');
location.reload();
```

### 4. 验证激活

激活成功后:
- 许可证状态指示器显示计划名称（如 "Professional"）
- 高级功能解锁
- 控制台显示: `License plan: Professional`

---

## 功能门控实施

### 检查功能权限

```javascript
// 在需要门控的功能前检查权限
if (!checkFeatureAccess('hd_export')) {
    return; // 自动显示升级提示
}

// 执行高级功能
performHDExport();
```

### 功能标识符

| 功能 | 标识符 | 所需计划 |
|------|--------|---------|
| 基础导出 | `basic_export` | Free+ |
| 本地存储 | `local_storage` | Free+ |
| 云端同步 | `cloud_sync` | Pro+ |
| 高清导出 | `hd_export` | Pro+ |
| 高级预设 | `advanced_presets` | Pro+ |
| 批量导出 | `batch_export` | Pro+ |
| 论文模板 | `paper_templates` | Pro+ |
| 去除水印 | `no_watermark` | Pro+ |
| 团队共享 | `team_sharing` | Team+ |
| 协作编辑 | `collaboration` | Team+ |

### 示例: 高清导出门控

```javascript
function exportSceneHD() {
    // 检查权限
    if (!checkFeatureAccess('hd_export')) {
        return; // 自动显示升级提示
    }

    // 执行高清导出
    const canvas = document.getElementById('opticsCanvas');
    const scale = 4; // 4K 分辨率
    const scaledCanvas = document.createElement('canvas');
    scaledCanvas.width = canvas.width * scale;
    scaledCanvas.height = canvas.height * scale;

    const ctx = scaledCanvas.getContext('2d');
    ctx.scale(scale, scale);
    ctx.drawImage(canvas, 0, 0);

    // 下载
    scaledCanvas.toBlob(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scene-4k.png';
        a.click();
    });
}
```

---

## 安全性

### 客户端验证

**优势:**
- ✅ 无需后端服务器
- ✅ 离线工作
- ✅ 零运营成本

**劣势:**
- ⚠️ 可被技术用户破解
- ⚠️ 无法远程撤销许可证

**适用场景:**
- 个人用户和小团队
- 教育用户
- 信任为主的商业模式

### 增强安全性

#### 1. 定期轮换公钥

```javascript
// LicenseValidator.js
this.publicKeys = [
    'a1b2c3d4e5f6g7h8', // 当前密钥
    'i9j0k1l2m3n4o5p6'  // 旧密钥（宽限期）
];
```

每 6 个月更新一次公钥，旧密钥保留 3 个月宽限期。

#### 2. 代码混淆

```bash
# 混淆许可证验证代码
npx terser src/license/LicenseValidator.js --compress --mangle -o dist/license.min.js
```

#### 3. 在线验证（可选）

对于高价值功能（如企业版），可添加在线验证:

```javascript
async function verifyLicenseOnline(licenseKey) {
    const response = await fetch('https://api.opticslab.app/verify-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey })
    });
    return response.json();
}
```

---

## 许可证管理

### 查看许可证信息

```javascript
// 控制台
const info = licenseValidator.getLicenseInfo();
console.log(info);
// {
//   valid: true,
//   plan: 'pro',
//   email: 'user@example.com',
//   expiryDate: '2027-12-31'
// }
```

### 检查到期时间

```javascript
const days = licenseValidator.getDaysUntilExpiry();
console.log(`许可证还有 ${days} 天到期`);
```

### 停用许可证

```javascript
licenseValidator.deactivate();
location.reload();
```

---

## 续费流程

### 自动续费提醒

系统会在许可证到期前 30 天显示续费提醒:

```javascript
// 在初始化时检查
if (licenseValidator.isExpiringSoon()) {
    licenseUI.showExpiryWarning();
}
```

### 续费步骤

1. 用户收到到期提醒
2. 点击 "立即续费" 按钮
3. 跳转到购买页面
4. 购买后收到新的许可证密钥
5. 在 OpticsLab 中激活新密钥

---

## 故障排查

### 问题 1: 许可证激活失败

**症状:** 提示 "Invalid signature"

**原因:**
- 许可证密钥复制不完整
- 密钥已过期
- 密钥格式错误

**解决:**
```bash
# 验证许可证
node scripts/generate-license.js --verify <licenseKey>
```

### 问题 2: 功能未解锁

**症状:** 激活后功能仍然被锁定

**原因:**
- 页面未刷新
- localStorage 被清除
- 浏览器隐私模式

**解决:**
```javascript
// 检查许可证状态
console.log(licenseValidator.getPlan()); // 应显示 'pro' 而非 'free'

// 重新激活
licenseValidator.activate('YOUR_LICENSE_KEY');
location.reload();
```

### 问题 3: 许可证丢失

**症状:** 刷新后许可证失效

**原因:**
- localStorage 被清除
- 浏览器数据被清理

**解决:**
- 用户重新输入许可证密钥
- 建议用户保存许可证密钥到安全位置

---

## 环境变量配置

### 生产环境

```bash
# .env
LICENSE_SECRET=your_production_secret_key_here_min_32_chars
```

**重要:**
- 生产环境必须使用强密钥（至少 32 字符）
- 密钥必须保密，不要提交到 Git
- 定期轮换密钥

### 开发环境

开发环境可使用默认密钥，但生成的许可证仅用于测试。

---

## 集成支付系统

### Gumroad 集成

1. 在 Gumroad 创建产品
2. 设置 Webhook 接收购买通知
3. 自动生成并发送许可证密钥

```javascript
// Webhook 处理 (Vercel Function)
export default async function handler(req, res) {
    const { email, product_id } = req.body;

    // 根据产品 ID 确定计划
    const planMap = {
        'prod_pro': 'pro',
        'prod_edu': 'education',
        'prod_team': 'team'
    };
    const plan = planMap[product_id];

    // 生成许可证
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);
    const key = generateLicenseKey(email, plan, expiryDate.toISOString().split('T')[0]);

    // 发送邮件
    await sendEmail(email, key);

    res.status(200).json({ success: true });
}
```

### Stripe 集成

类似 Gumroad，使用 Stripe Webhooks 自动化许可证生成和发送。

---

## 最佳实践

### 1. 用户体验

- ✅ 免费版功能足够强大，吸引用户
- ✅ 升级提示友好，不打断工作流
- ✅ 提供 14 天试用（可选）
- ✅ 清晰展示付费功能价值

### 2. 安全性

- ✅ 定期轮换公钥
- ✅ 混淆关键代码
- ✅ 高价值功能使用在线验证
- ✅ 监控异常激活模式

### 3. 支持

- ✅ 提供清晰的激活文档
- ✅ 快速响应许可证问题
- ✅ 提供许可证找回服务
- ✅ 教育用户保存许可证密钥

---

## 下一步

1. **测试许可证系统**
   ```bash
   # 生成测试许可证
   node scripts/generate-license.js test@example.com pro 2027-12-31

   # 在 OpticsLab 中激活测试
   ```

2. **配置支付系统**
   - 注册 Gumroad 或 Stripe 账户
   - 创建产品和定价
   - 设置 Webhook

3. **部署到生产环境**
   - 设置 LICENSE_SECRET 环境变量
   - 更新公钥列表
   - 部署到 GitHub Pages / Vercel

4. **营销和推广**
   - 创建定价页面
   - 撰写功能对比文档
   - 发布到社交媒体

---

## 支持

如有问题，请联系:
- Email: support@opticslab.app
- GitHub Issues: https://github.com/tryandaction/Interactive-Optics-Lab/issues
- 文档: https://opticslab.app/docs

---

**OpticsLab 许可证系统 v1.0**
