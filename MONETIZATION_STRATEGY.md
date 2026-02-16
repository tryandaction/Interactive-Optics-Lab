# OpticsLab 开源商业化策略

**核心理念:** Open Core Model（开放核心模式）

---

## 🎯 商业模式设计

### 策略：开源免费 + 增值服务收费

**开源部分（GitHub，MIT License）:**
- ✅ 核心光学模拟引擎
- ✅ 基础 UI 和编辑器
- ✅ 本地存储功能
- ✅ 基础预设场景（5 个）
- ✅ 基础导出（PNG/SVG）

**付费部分（闭源，需授权）:**
- 💎 云端同步与备份
- 💎 高级预设场景库（50+ 专业场景）
- 💎 高分辨率导出（4K/8K）
- 💎 批量导出与自动化
- 💎 论文模板库（IEEE/Nature/Science 格式）
- 💎 优先技术支持
- 💎 团队协作功能
- 💎 API 访问

---

## 💰 定价策略

### 1. 免费版（Free）

**价格:** $0/永久

**功能:**
- ✅ 完整的光学模拟引擎
- ✅ 本地场景保存（无限制）
- ✅ 基础预设场景（5 个）
- ✅ 标准导出（PNG/SVG，最高 1080p）
- ✅ 社区支持（GitHub Issues）

**限制:**
- ❌ 无云端同步
- ❌ 无高级预设
- ❌ 无高分辨率导出
- ❌ 无优先支持

**目标用户:** 学生、爱好者、试用用户

---

### 2. 个人专业版（Pro）

**价格:** $9.99/月 或 $99/年（节省 17%）

**功能:**
- ✅ 免费版所有功能
- ✅ 云端同步（GitHub Gists 集成）
- ✅ 高级预设场景库（50+ 场景）
- ✅ 高分辨率导出（4K，3840×2160）
- ✅ 批量导出（一键导出所有场景）
- ✅ 论文模板库（10+ 期刊格式）
- ✅ 优先邮件支持（48 小时响应）
- ✅ 去除水印

**目标用户:** 研究生、博士后、独立研究者

---

### 3. 教育版（Education）

**价格:** $4.99/月 或 $49/年（需学生/教师认证）

**功能:**
- ✅ 个人专业版所有功能
- ✅ 教育专用预设（20+ 教学场景）
- ✅ 课程模板
- ✅ 学生进度追踪（教师账户）

**认证方式:**
- 学生：上传学生证或使用 .edu 邮箱
- 教师：上传教师证或学校邮箱

**目标用户:** 学生、教师

---

### 4. 团队版（Team）

**价格:** $49/月（5 个席位）+ $8/月每增加 1 个席位

**功能:**
- ✅ 个人专业版所有功能
- ✅ 团队共享场景库
- ✅ 协作编辑（实时同步）
- ✅ 团队管理后台
- ✅ 统一账单
- ✅ 优先支持（24 小时响应）
- ✅ 自定义品牌（Logo/水印）

**目标用户:** 课题组、研究团队、小型企业

---

### 5. 企业版（Enterprise）

**价格:** 定制报价（起步 $499/月）

**功能:**
- ✅ 团队版所有功能
- ✅ 私有部署（本地服务器）
- ✅ SSO 单点登录
- ✅ API 访问（自动化集成）
- ✅ 无限席位
- ✅ SLA 保障（99.9% 可用性）
- ✅ 专属客户经理
- ✅ 定制开发

**目标用户:** 大型企业、研究机构、高校

---

## 🔐 技术实现：License Key 验证

### 方案 A: 客户端 License Key（推荐）

**架构:**
```
用户购买 → Gumroad/Stripe → 生成 License Key → 用户输入 Key → 本地验证
```

**实现步骤:**

1. **生成 License Key**

创建 `scripts/generate-license.js`:

```javascript
import crypto from 'crypto';

function generateLicenseKey(email, plan, expiryDate) {
    const data = `${email}|${plan}|${expiryDate}`;
    const secret = process.env.LICENSE_SECRET; // 保密
    const signature = crypto.createHmac('sha256', secret)
        .update(data)
        .digest('hex')
        .substring(0, 16);

    const key = `${Buffer.from(data).toString('base64')}.${signature}`;
    return key;
}

// 示例
const key = generateLicenseKey('user@example.com', 'pro', '2027-02-16');
console.log(key); // ZW1haWx8cHJvfDIwMjctMDItMTY=.a1b2c3d4e5f6g7h8
```

2. **验证 License Key**

创建 `src/license/LicenseValidator.js`:

```javascript
/**
 * LicenseValidator.js - 客户端 License 验证（无需后端）
 */

export class LicenseValidator {
    constructor() {
        this.licenseKey = localStorage.getItem('opticslab_license');
        this.publicKeys = [
            // 公钥列表（定期轮换）
            'a1b2c3d4e5f6g7h8',
            'i9j0k1l2m3n4o5p6'
        ];
    }

    // 验证 License Key
    validate() {
        if (!this.licenseKey) return { valid: false, plan: 'free' };

        try {
            const [dataB64, signature] = this.licenseKey.split('.');
            const data = Buffer.from(dataB64, 'base64').toString();
            const [email, plan, expiryDate] = data.split('|');

            // 验证签名（简化版，实际应使用 RSA）
            const isValidSignature = this.publicKeys.includes(signature);
            if (!isValidSignature) {
                return { valid: false, plan: 'free', error: 'Invalid signature' };
            }

            // 验证过期时间
            const expiry = new Date(expiryDate);
            if (expiry < new Date()) {
                return { valid: false, plan: 'free', error: 'License expired' };
            }

            return {
                valid: true,
                plan: plan,
                email: email,
                expiryDate: expiryDate
            };
        } catch (e) {
            return { valid: false, plan: 'free', error: 'Invalid format' };
        }
    }

    // 激活 License
    activate(licenseKey) {
        this.licenseKey = licenseKey;
        localStorage.setItem('opticslab_license', licenseKey);
        return this.validate();
    }

    // 获取当前计划
    getPlan() {
        const result = this.validate();
        return result.plan || 'free';
    }

    // 检查功能权限
    hasFeature(feature) {
        const plan = this.getPlan();
        const features = {
            free: ['basic_export', 'local_storage'],
            pro: ['basic_export', 'local_storage', 'cloud_sync', 'hd_export', 'advanced_presets'],
            team: ['basic_export', 'local_storage', 'cloud_sync', 'hd_export', 'advanced_presets', 'collaboration'],
            enterprise: ['*'] // 所有功能
        };
        return features[plan]?.includes(feature) || features[plan]?.includes('*');
    }
}
```

3. **功能门控**

在 `main.js` 中集成：

```javascript
import { LicenseValidator } from './src/license/LicenseValidator.js';

const license = new LicenseValidator();

// 导出功能门控
function exportScene(format, resolution) {
    if (resolution === '4K' && !license.hasFeature('hd_export')) {
        showUpgradeModal('高分辨率导出需要专业版');
        return;
    }
    // 执行导出
    performExport(format, resolution);
}

// 云端同步门控
function saveToCloud() {
    if (!license.hasFeature('cloud_sync')) {
        showUpgradeModal('云端同步需要专业版');
        return;
    }
    // 执行云端保存
    cloudStorage.saveScene();
}

// 显示升级提示
function showUpgradeModal(message) {
    const modal = document.createElement('div');
    modal.innerHTML = `
        <div class="upgrade-modal">
            <h3>升级到专业版</h3>
            <p>${message}</p>
            <button onclick="window.open('https://opticslab.app/pricing')">
                查看定价
            </button>
        </div>
    `;
    document.body.appendChild(modal);
}
```

**优势:**
- ✅ 无需后端服务器
- ✅ 离线验证
- ✅ 简单易实现

**劣势:**
- ⚠️ 可被破解（但对大多数用户足够）
- ⚠️ 需要定期轮换公钥

---

### 方案 B: 在线验证（更安全）

**架构:**
```
用户输入 Key → 调用 Vercel Function → 验证数据库 → 返回结果
```

创建 `api/verify-license.js`:

```javascript
// api/verify-license.js (Vercel Serverless Function)
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { licenseKey } = req.body;

    // 查询数据库
    const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .eq('key', licenseKey)
        .single();

    if (error || !data) {
        return res.status(404).json({ valid: false, error: 'Invalid license' });
    }

    // 检查过期
    if (new Date(data.expiry_date) < new Date()) {
        return res.status(403).json({ valid: false, error: 'License expired' });
    }

    // 返回验证结果
    res.status(200).json({
        valid: true,
        plan: data.plan,
        email: data.email,
        expiryDate: data.expiry_date
    });
}
```

**优势:**
- ✅ 更安全（难以破解）
- ✅ 可实时撤销 License
- ✅ 可追踪使用情况

**劣势:**
- ⚠️ 需要在线验证
- ⚠️ 需要后端服务（Vercel Function + Supabase）

**成本:** ~$0-5/月（Supabase 免费额度 + Vercel 免费额度）

---

## 💳 支付集成

### 推荐方案：Gumroad（最简单）

**优势:**
- ✅ 零技术门槛
- ✅ 自动生成 License Key
- ✅ 处理支付、税务、退款
- ✅ 支持订阅和一次性购买

**费用:** 10% 交易费（含支付处理费）

**集成步骤:**

1. 在 Gumroad 创建产品
2. 设置 License Key 生成规则
3. 用户购买后自动收到 License Key
4. 用户在 OpticsLab 中输入 Key 激活

**示例:**
```
产品名称: OpticsLab Pro (年付)
价格: $99
License Key 格式: OPTICSLAB-PRO-XXXX-XXXX-XXXX
```

---

### 备选方案：Stripe + Supabase

**优势:**
- ✅ 更低手续费（2.9% + $0.30）
- ✅ 完全控制用户数据
- ✅ 支持更复杂的订阅逻辑

**劣势:**
- ⚠️ 需要自己处理税务
- ⚠️ 需要实现订阅管理

**成本:** 2.9% + $0.30 每笔交易

---

## 📊 收入预测

### 保守估算（第一年）

| 计划 | 用户数 | 单价 | 年收入 |
|------|--------|------|--------|
| 免费版 | 5,000 | $0 | $0 |
| 个人专业版 | 100 | $99/年 | $9,900 |
| 教育版 | 50 | $49/年 | $2,450 |
| 团队版 | 5 | $588/年 | $2,940 |
| **总计** | **5,155** | - | **$15,290** |

### 乐观估算（第二年）

| 计划 | 用户数 | 单价 | 年收入 |
|------|--------|------|--------|
| 免费版 | 20,000 | $0 | $0 |
| 个人专业版 | 500 | $99/年 | $49,500 |
| 教育版 | 200 | $49/年 | $9,800 |
| 团队版 | 20 | $588/年 | $11,760 |
| 企业版 | 2 | $5,988/年 | $11,976 |
| **总计** | **20,722** | - | **$83,036** |

---

## 🎁 营销策略

### 1. 免费增值（Freemium）

**策略:**
- 免费版功能足够强大，吸引用户
- 在关键功能点提示升级（云端同步、高清导出）
- 提供 14 天专业版试用

### 2. 学术折扣

**策略:**
- 教育版 50% 折扣
- 学生免费使用（需认证）
- 与高校合作（批量授权）

### 3. 开源社区

**策略:**
- GitHub 保持活跃（吸引贡献者）
- 定期发布新功能
- 社区用户可获得折扣码

### 4. 内容营销

**策略:**
- 发布教程视频（YouTube）
- 撰写技术博客（Medium）
- 参与学术会议（展示 Demo）

---

## 🔒 防破解策略

### 1. 代码混淆

```bash
# 使用 Terser 混淆付费功能代码
npx terser src/premium/*.js --compress --mangle -o dist/premium.min.js
```

### 2. 功能分离

**架构:**
```
开源仓库 (GitHub):
  - 核心引擎
  - 基础 UI
  - 免费功能

私有仓库 (GitLab/Bitbucket):
  - 高级预设
  - 高清导出
  - 云端同步
```

### 3. 服务端验证

**关键功能（如高清导出）通过 API 调用:**
```javascript
async function exportHD() {
    const response = await fetch('https://api.opticslab.app/export/hd', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${licenseKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sceneData })
    });
    const blob = await response.blob();
    downloadBlob(blob, 'scene-4k.png');
}
```

---

## 📝 总结

### 推荐方案

**商业模式:** Open Core（开源核心 + 付费增值）

**定价:**
- 免费版: $0
- 个人专业版: $99/年
- 教育版: $49/年
- 团队版: $588/年（5 席位）

**技术实现:**
- License Key 验证（客户端 + 在线混合）
- Gumroad 处理支付
- Vercel Function 验证 License

**预期收入:**
- 第一年: $15K
- 第二年: $83K

**总成本:** ~$5-10/月（Vercel + Supabase 免费额度）

**ROI:** 极高（几乎零成本）

---

**下一步:** 需要我开始实施 License 验证系统吗？
