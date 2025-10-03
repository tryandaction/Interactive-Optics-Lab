// server.js - 交互式光学实验室后端API服务器

const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// 中间件
app.use(helmet());
app.use(cors()); // 简化CORS配置，允许所有请求
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 速率限制
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 限制每个IP 15分钟内最多100个请求
    message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/opticslab', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB连接成功'))
.catch(err => console.error('MongoDB连接失败:', err));

// 用户模型
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 20
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    lastLogin: {
        type: Date,
        default: null
    },
    preferences: {
        theme: {
            type: String,
            default: 'light-ui-dark-canvas'
        },
        language: {
            type: String,
            default: 'zh-CN'
        }
    }
});

const User = mongoose.model('User', userSchema);

// 场景模型（扩展支持协作）
const sceneSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    },
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 500
    },
    tags: [{
        type: String,
        trim: true
    }],
    data: {
        type: Object,
        required: true
    },
    // 协作相关字段
    collaborators: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        permission: {
            type: String,
            enum: ['viewer', 'editor'],
            default: 'viewer'
        }
    }],
    // 记录每个元件的所有者
    componentOwnership: [{
        componentId: String,
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        createdAt: {
            type: Date,
            default: Date.now
        },
        lastModified: {
            type: Date,
            default: Date.now
        }
    }],
    isPublic: {
        type: Boolean,
        default: false
    },
    isCollaborative: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
});

const Scene = mongoose.model('Scene', sceneSchema);

// 项目模型（支持多用户协作和子项目）
const projectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        type: String,
        trim: true,
        maxlength: 1000
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        default: null
    },
    children: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project'
    }],
    level: {
        type: Number,
        default: 0,
        min: 0,
        max: 5 // 限制最大层级为5级
    },
    collaborators: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        permission: {
            type: String,
            enum: ['viewer', 'editor'],
            default: 'viewer'
        },
        invitedAt: {
            type: Date,
            default: Date.now
        },
        joinedAt: {
            type: Date,
            default: null
        }
    }],
    scenes: [{
        sceneId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Scene'
        },
        name: String,
        order: {
            type: Number,
            default: 0
        }
    }],
    settings: {
        isPublic: {
            type: Boolean,
            default: false
        },
        allowGuestView: {
            type: Boolean,
            default: false
        },
        maxCollaborators: {
            type: Number,
            default: 10
        }
    },
    tags: [{
        type: String,
        trim: true
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    lastActivity: {
        type: Date,
        default: Date.now
    }
});

const Project = mongoose.model('Project', projectSchema);

// 协作会话模型（记录实时协作状态）
const collaborationSessionSchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    activeUsers: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        username: String,
        joinedAt: {
            type: Date,
            default: Date.now
        },
        lastActivity: {
            type: Date,
            default: Date.now
        },
        cursor: {
            x: Number,
            y: Number
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24小时后过期
    }
});

const CollaborationSession = mongoose.model('CollaborationSession', collaborationSessionSchema);

// 操作历史模型（记录每个用户的操作）
const operationHistorySchema = new mongoose.Schema({
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project',
        required: true
    },
    sceneId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Scene'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    username: String,
    operation: {
        type: String,
        required: true,
        enum: ['create', 'update', 'delete', 'move', 'rotate', 'property_change']
    },
    targetType: {
        type: String,
        required: true,
        enum: ['component', 'scene', 'project']
    },
    targetId: {
        type: String,
        required: true
    },
    beforeState: Object,
    afterState: Object,
    timestamp: {
        type: Date,
        default: Date.now
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CollaborationSession'
    }
});

const OperationHistory = mongoose.model('OperationHistory', operationHistorySchema);

// 密码重置令牌模型
const passwordResetTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    token: {
        type: String,
        required: true,
        unique: true
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 3600000) // 1小时后过期
    },
    used: {
        type: Boolean,
        default: false
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const PasswordResetToken = mongoose.model('PasswordResetToken', passwordResetTokenSchema);

// 邮件发送配置
const emailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// 认证中间件
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: '访问令牌缺失' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: '无效的访问令牌' });
        }
        req.user = user;
        next();
    });
};

// 验证中间件
const validateRequest = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '输入验证失败',
            errors: errors.array()
        });
    }
    next();
};

// 路由

// 健康检查
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: '服务器运行正常', timestamp: new Date() });
});

// 用户注册
app.post('/api/auth/register', [
    body('username')
        .isLength({ min: 3, max: 20 })
        .withMessage('用户名长度必须在3-20个字符之间')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('用户名只能包含字母、数字和下划线'),
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('密码长度至少6个字符')
], validateRequest, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 检查用户是否已存在
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: existingUser.username === username ? '用户名已存在' : '邮箱已被注册'
            });
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 12);

        // 创建用户
        const user = new User({
            username,
            email,
            password: hashedPassword
        });

        await user.save();

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({
            success: true,
            message: '注册成功',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                createdAt: user.createdAt
            },
            token
        });
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 用户登录
app.post('/api/auth/login', [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空')
], validateRequest, async (req, res) => {
    try {
        const { username, password } = req.body;

        // 查找用户（支持用户名或邮箱登录）
        const user = await User.findOne({
            $or: [
                { username: username },
                { email: username }
            ]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 验证密码
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: '用户名或密码错误'
            });
        }

        // 更新最后登录时间
        user.lastLogin = new Date();
        await user.save();

        // 生成JWT令牌
        const token = jwt.sign(
            { userId: user._id, username: user.username },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            message: '登录成功',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                preferences: user.preferences,
                lastLogin: user.lastLogin
            },
            token
        });
    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 获取用户信息
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                preferences: user.preferences,
                createdAt: user.createdAt,
                lastLogin: user.lastLogin
            }
        });
    } catch (error) {
        console.error('获取用户信息错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 更新用户偏好
app.put('/api/user/preferences', authenticateToken, [
    body('theme').optional().isIn(['light-ui-dark-canvas', 'light-ui-light-canvas', 'dark-ui-dark-canvas', 'dark-ui-light-canvas']),
    body('language').optional().isIn(['zh-CN', 'en-US'])
], validateRequest, async (req, res) => {
    try {
        const { theme, language } = req.body;
        const updateData = {};

        if (theme) updateData['preferences.theme'] = theme;
        if (language) updateData['preferences.language'] = language;

        const user = await User.findByIdAndUpdate(
            req.user.userId,
            { $set: updateData },
            { new: true }
        ).select('-password');

        res.json({
            success: true,
            message: '偏好设置已更新',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                preferences: user.preferences
            }
        });
    } catch (error) {
        console.error('更新用户偏好错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 请求密码重置
app.post('/api/auth/forgot-password', [
    body('email')
        .isEmail()
        .withMessage('请输入有效的邮箱地址')
        .normalizeEmail()
], validateRequest, async (req, res) => {
    try {
        const { email } = req.body;

        // 查找用户
        const user = await User.findOne({ email });
        if (!user) {
            // 为了安全起见，即使用户不存在也返回成功消息
            return res.json({
                success: true,
                message: '如果邮箱存在，重置密码邮件已发送'
            });
        }

        // 删除旧的重置令牌
        await PasswordResetToken.deleteMany({ userId: user._id });

        // 生成重置令牌
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // 保存令牌到数据库
        const passwordResetToken = new PasswordResetToken({
            userId: user._id,
            token: hashedToken,
            expiresAt: new Date(Date.now() + 3600000) // 1小时后过期
        });

        await passwordResetToken.save();

        // 发送重置邮件
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/reset-password.html?token=${resetToken}&userId=${user._id}`;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: '光学实验室 - 密码重置',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">密码重置请求</h2>
                    <p>您好 ${user.username}，</p>
                    <p>您收到了这封邮件是因为我们收到了您的密码重置请求。</p>
                    <p>请点击下面的链接重置您的密码：</p>
                    <p style="margin: 20px 0;">
                        <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">重置密码</a>
                    </p>
                    <p>此链接将在1小时后过期。</p>
                    <p>如果您没有请求密码重置，请忽略此邮件。</p>
                    <p>感谢您使用光学实验室！</p>
                </div>
            `
        };

        try {
            await emailTransporter.sendMail(mailOptions);
            console.log('密码重置邮件已发送至:', user.email);
        } catch (emailError) {
            console.error('邮件发送失败:', emailError);
            return res.status(500).json({
                success: false,
                message: '邮件发送失败，请稍后重试'
            });
        }

        res.json({
            success: true,
            message: '如果邮箱存在，重置密码邮件已发送'
        });
    } catch (error) {
        console.error('密码重置请求错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 重置密码
app.post('/api/auth/reset-password', [
    body('userId').notEmpty().withMessage('用户ID不能为空'),
    body('token').notEmpty().withMessage('重置令牌不能为空'),
    body('newPassword')
        .isLength({ min: 6 })
        .withMessage('新密码长度至少6个字符')
], validateRequest, async (req, res) => {
    try {
        const { userId, token, newPassword } = req.body;

        // 验证令牌
        const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
        const resetToken = await PasswordResetToken.findOne({
            userId,
            token: hashedToken,
            used: false,
            expiresAt: { $gt: new Date() }
        });

        if (!resetToken) {
            return res.status(400).json({
                success: false,
                message: '无效或已过期的重置令牌'
            });
        }

        // 查找用户
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 加密新密码
        const hashedPassword = await bcrypt.hash(newPassword, 12);

        // 更新用户密码
        user.password = hashedPassword;
        await user.save();

        // 标记令牌为已使用
        resetToken.used = true;
        await resetToken.save();

        // 删除所有该用户未使用的重置令牌
        await PasswordResetToken.updateMany(
            { userId, used: false },
            { used: true }
        );

        res.json({
            success: true,
            message: '密码重置成功，请使用新密码登录'
        });
    } catch (error) {
        console.error('密码重置错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 场景管理路由

// 获取用户的所有场景
app.get('/api/scenes', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, tags } = req.query;
        const skip = (page - 1) * limit;

        let query = { userId: req.user.userId };
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $in: tagArray };
        }

        const scenes = await Scene.find(query)
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit))
            .select('-data'); // 不返回完整数据，只返回元数据

        const total = await Scene.countDocuments(query);

        res.json({
            success: true,
            scenes,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取场景列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 获取单个场景
app.get('/api/scenes/:id', authenticateToken, async (req, res) => {
    try {
        const scene = await Scene.findOne({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!scene) {
            return res.status(404).json({
                success: false,
                message: '场景不存在'
            });
        }

        res.json({
            success: true,
            scene
        });
    } catch (error) {
        console.error('获取场景错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 创建新场景
app.post('/api/scenes', authenticateToken, [
    body('name').notEmpty().withMessage('场景名称不能为空').isLength({ max: 100 }),
    body('data').notEmpty().withMessage('场景数据不能为空'),
    body('description').optional().isLength({ max: 500 }),
    body('tags').optional().isArray(),
    body('isPublic').optional().isBoolean()
], validateRequest, async (req, res) => {
    try {
        const { name, description, tags, data, isPublic } = req.body;

        const scene = new Scene({
            userId: req.user.userId,
            name,
            description: description || '',
            tags: tags || [],
            data,
            isPublic: isPublic || false
        });

        await scene.save();

        res.status(201).json({
            success: true,
            message: '场景创建成功',
            scene: {
                id: scene._id,
                name: scene.name,
                description: scene.description,
                tags: scene.tags,
                isPublic: scene.isPublic,
                createdAt: scene.createdAt,
                updatedAt: scene.updatedAt
            }
        });
    } catch (error) {
        console.error('创建场景错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 更新场景
app.put('/api/scenes/:id', authenticateToken, [
    body('name').optional().isLength({ max: 100 }),
    body('description').optional().isLength({ max: 500 }),
    body('tags').optional().isArray(),
    body('data').optional(),
    body('isPublic').optional().isBoolean()
], validateRequest, async (req, res) => {
    try {
        const { name, description, tags, data, isPublic } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (tags !== undefined) updateData.tags = tags;
        if (data !== undefined) updateData.data = data;
        if (isPublic !== undefined) updateData.isPublic = isPublic;

        const scene = await Scene.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.userId },
            { $set: updateData },
            { new: true }
        );

        if (!scene) {
            return res.status(404).json({
                success: false,
                message: '场景不存在'
            });
        }

        res.json({
            success: true,
            message: '场景更新成功',
            scene: {
                id: scene._id,
                name: scene.name,
                description: scene.description,
                tags: scene.tags,
                isPublic: scene.isPublic,
                updatedAt: scene.updatedAt
            }
        });
    } catch (error) {
        console.error('更新场景错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 删除场景
app.delete('/api/scenes/:id', authenticateToken, async (req, res) => {
    try {
        const scene = await Scene.findOneAndDelete({
            _id: req.params.id,
            userId: req.user.userId
        });

        if (!scene) {
            return res.status(404).json({
                success: false,
                message: '场景不存在'
            });
        }

        res.json({
            success: true,
            message: '场景删除成功'
        });
    } catch (error) {
        console.error('删除场景错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// ============ 项目管理API ============

// 获取用户项目列表
app.get('/api/projects', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, tags } = req.query;
        const skip = (page - 1) * limit;

        let query = {
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId }
            ]
        };

        if (search) {
            query.$and = query.$and || [];
            query.$and.push({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ]
            });
        }

        if (tags) {
            const tagArray = tags.split(',').map(tag => tag.trim());
            query.tags = { $in: tagArray };
        }

        const projects = await Project.find(query)
            .populate('ownerId', 'username')
            .populate('collaborators.userId', 'username')
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Project.countDocuments(query);

        res.json({
            success: true,
            projects,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取项目列表错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 获取单个项目
app.get('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId }
            ]
        })
        .populate('ownerId', 'username')
        .populate('collaborators.userId', 'username')
        .populate('scenes.sceneId');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无访问权限'
            });
        }

        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error('获取项目错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 创建新项目
app.post('/api/projects', authenticateToken, [
    body('name').notEmpty().withMessage('项目名称不能为空').isLength({ max: 100 }),
    body('description').optional().isLength({ max: 1000 }),
    body('tags').optional().isArray(),
    body('settings').optional().isObject(),
    body('parentId').optional().isMongoId().withMessage('父项目ID格式无效')
], validateRequest, async (req, res) => {
    try {
        const { name, description, tags, settings, parentId } = req.body;

        // 如果指定了父项目，验证父项目存在且用户有权限
        let parentProject = null;
        let projectLevel = 0;

        if (parentId) {
            parentProject = await Project.findOne({
                _id: parentId,
                $or: [
                    { ownerId: req.user.userId },
                    { 'collaborators.userId': req.user.userId }
                ]
            });

            if (!parentProject) {
                return res.status(404).json({
                    success: false,
                    message: '父项目不存在或无访问权限'
                });
            }

            if (parentProject.level >= 5) {
                return res.status(400).json({
                    success: false,
                    message: '已达到最大项目层级（5级）'
                });
            }

            projectLevel = parentProject.level + 1;
        }

        const project = new Project({
            name,
            description: description || '',
            ownerId: req.user.userId,
            parentId: parentId || null,
            level: projectLevel,
            tags: tags || [],
            settings: {
                isPublic: false,
                allowGuestView: false,
                maxCollaborators: 10,
                ...settings
            }
        });

        await project.save();

        // 如果有父项目，更新父项目的children数组
        if (parentProject) {
            parentProject.children.push(project._id);
            await parentProject.save();
        }

        // 重新获取完整的项目信息
        const populatedProject = await Project.findById(project._id)
            .populate('ownerId', 'username')
            .populate('parentId', 'name');

        res.status(201).json({
            success: true,
            message: '项目创建成功',
            project: populatedProject
        });
    } catch (error) {
        console.error('创建项目错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 更新项目
app.put('/api/projects/:id', authenticateToken, [
    body('name').optional().isLength({ max: 100 }),
    body('description').optional().isLength({ max: 1000 }),
    body('tags').optional().isArray(),
    body('settings').optional().isObject()
], validateRequest, async (req, res) => {
    try {
        const { name, description, tags, settings } = req.body;
        const updateData = { updatedAt: new Date() };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (tags !== undefined) updateData.tags = tags;
        if (settings !== undefined) updateData.settings = { ...settings };

        const project = await Project.findOneAndUpdate(
            {
                _id: req.params.id,
                $or: [
                    { ownerId: req.user.userId },
                    { 'collaborators.userId': req.user.userId, 'collaborators.permission': 'editor' }
                ]
            },
            { $set: updateData },
            { new: true }
        ).populate('ownerId', 'username');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无编辑权限'
            });
        }

        res.json({
            success: true,
            message: '项目更新成功',
            project
        });
    } catch (error) {
        console.error('更新项目错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 删除项目
app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            ownerId: req.user.userId // 只有所有者能删除项目
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无删除权限'
            });
        }

        // 检查是否有子项目
        if (project.children && project.children.length > 0) {
            return res.status(400).json({
                success: false,
                message: '无法删除包含子项目的项目，请先删除所有子项目'
            });
        }

        // 从父项目的children数组中移除此项目
        if (project.parentId) {
            await Project.findByIdAndUpdate(project.parentId, {
                $pull: { children: project._id }
            });
        }

        // 删除项目
        await Project.findByIdAndDelete(req.params.id);

        // 删除项目相关的所有场景
        await Scene.deleteMany({ projectId: req.params.id });

        res.json({
            success: true,
            message: '项目删除成功'
        });
    } catch (error) {
        console.error('删除项目错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 获取项目的子项目
app.get('/api/projects/:id/children', authenticateToken, async (req, res) => {
    try {
        // 验证用户有权限访问父项目
        const parentProject = await Project.findOne({
            _id: req.params.id,
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId }
            ]
        });

        if (!parentProject) {
            return res.status(404).json({
                success: false,
                message: '父项目不存在或无访问权限'
            });
        }

        // 获取所有子项目
        const children = await Project.find({
            parentId: req.params.id,
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId }
            ]
        })
        .populate('ownerId', 'username')
        .sort({ createdAt: 1 });

        res.json({
            success: true,
            children
        });
    } catch (error) {
        console.error('获取子项目错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// ============ 项目场景管理 ============

// 获取项目的所有场景
app.get('/api/projects/:id/scenes', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId }
            ]
        }).populate('scenes.sceneId');

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无访问权限'
            });
        }

        res.json({
            success: true,
            scenes: project.scenes
        });
    } catch (error) {
        console.error('获取项目场景错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 向项目添加场景
app.post('/api/projects/:id/scenes', authenticateToken, [
    body('sceneRef.sceneId').notEmpty().withMessage('场景ID不能为空'),
    body('sceneRef.name').notEmpty().withMessage('场景名称不能为空'),
    body('sceneRef.order').optional().isInt({ min: 0 }).withMessage('顺序必须是非负整数')
], validateRequest, async (req, res) => {
    try {
        const { sceneRef } = req.body;

        const project = await Project.findOne({
            _id: req.params.id,
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId, 'collaborators.permission': 'editor' }
            ]
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无编辑权限'
            });
        }

        // 验证场景存在且属于当前用户
        const scene = await Scene.findOne({
            _id: sceneRef.sceneId,
            userId: req.user.userId
        });

        if (!scene) {
            return res.status(404).json({
                success: false,
                message: '场景不存在或无访问权限'
            });
        }

        // 检查场景是否已经在项目中
        const existingScene = project.scenes.find(s => s.sceneId.toString() === sceneRef.sceneId);
        if (existingScene) {
            return res.status(400).json({
                success: false,
                message: '场景已经在项目中'
            });
        }

        // 添加场景到项目
        const newSceneRef = {
            sceneId: sceneRef.sceneId,
            name: sceneRef.name,
            order: sceneRef.order !== undefined ? sceneRef.order : project.scenes.length
        };

        project.scenes.push(newSceneRef);
        await project.save();

        res.status(201).json({
            success: true,
            message: '场景已添加到项目',
            sceneRef: newSceneRef
        });
    } catch (error) {
        console.error('添加场景到项目错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 从项目移除场景
app.delete('/api/projects/:id/scenes/:sceneId', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            $or: [
                { ownerId: req.user.userId },
                { 'collaborators.userId': req.user.userId, 'collaborators.permission': 'editor' }
            ]
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无编辑权限'
            });
        }

        // 从项目中移除场景
        project.scenes = project.scenes.filter(s => s.sceneId.toString() !== req.params.sceneId);
        await project.save();

        res.json({
            success: true,
            message: '场景已从项目中移除'
        });
    } catch (error) {
        console.error('从项目移除场景错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 邀请协作者
app.post('/api/projects/:id/invite', authenticateToken, [
    body('email').isEmail().withMessage('请输入有效的邮箱地址'),
    body('permission').isIn(['viewer', 'editor']).withMessage('权限必须是viewer或editor')
], validateRequest, async (req, res) => {
    try {
        const { email, permission } = req.body;

        // 检查项目所有权
        const project = await Project.findOne({
            _id: req.params.id,
            ownerId: req.user.userId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无邀请权限'
            });
        }

        // 查找用户
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 检查是否已经是协作者
        const existingCollaborator = project.collaborators.find(
            c => c.userId.toString() === user._id.toString()
        );

        if (existingCollaborator) {
            return res.status(400).json({
                success: false,
                message: '用户已经是协作者'
            });
        }

        // 检查协作者数量限制
        if (project.collaborators.length >= project.settings.maxCollaborators) {
            return res.status(400).json({
                success: false,
                message: '已达到最大协作者数量'
            });
        }

        // 添加协作者
        project.collaborators.push({
            userId: user._id,
            permission,
            invitedAt: new Date()
        });

        await project.save();

        // 发送邀请邮件（这里可以扩展）
        console.log(`邀请 ${user.email} 加入项目 ${project.name} 作为 ${permission}`);

        res.json({
            success: true,
            message: '邀请发送成功',
            collaborator: {
                userId: user._id,
                username: user.username,
                email: user.email,
                permission
            }
        });
    } catch (error) {
        console.error('邀请协作者错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 移除协作者
app.delete('/api/projects/:id/collaborators/:userId', authenticateToken, async (req, res) => {
    try {
        const project = await Project.findOne({
            _id: req.params.id,
            ownerId: req.user.userId
        });

        if (!project) {
            return res.status(404).json({
                success: false,
                message: '项目不存在或无权限'
            });
        }

        // 移除协作者
        project.collaborators = project.collaborators.filter(
            c => c.userId.toString() !== req.params.userId
        );

        await project.save();

        res.json({
            success: true,
            message: '协作者移除成功'
        });
    } catch (error) {
        console.error('移除协作者错误:', error);
        res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('未处理的错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误'
    });
});

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '接口不存在'
    });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`健康检查: http://localhost:${PORT}/api/health`);
});

module.exports = app;

