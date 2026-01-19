/**
 * MeasurementTools.js - 测量工具
 * 提供距离、角度、面积等测量功能
 * 
 * Requirements: 18.1, 18.2, 18.3, 18.4
 */

/**
 * 测量类型
 */
export const MeasurementType = {
    DISTANCE: 'distance',
    ANGLE: 'angle',
    AREA: 'area',
    OPTICAL_PATH: 'optical-path'
};

/**
 * 单位系统
 */
export const Units = {
    // 长度
    MM: 'mm',
    CM: 'cm',
    M: 'm',
    INCH: 'inch',
    PIXEL: 'px',
    
    // 角度
    DEGREE: 'deg',
    RADIAN: 'rad',
    
    // 面积
    MM2: 'mm²',
    CM2: 'cm²',
    M2: 'm²'
};

/**
 * 单位转换
 */
const UNIT_CONVERSIONS = {
    // 到毫米的转换
    [Units.MM]: 1,
    [Units.CM]: 10,
    [Units.M]: 1000,
    [Units.INCH]: 25.4,
    [Units.PIXEL]: 0.264583, // 假设96 DPI
    
    // 角度转换
    [Units.DEGREE]: 1,
    [Units.RADIAN]: 180 / Math.PI
};

/**
 * 测量结果类
 */
export class MeasurementResult {
    constructor(type, value, unit, points = []) {
        this.type = type;
        this.value = value;
        this.unit = unit;
        this.points = points;
        this.timestamp = Date.now();
    }

    /**
     * 格式化显示
     */
    format(precision = 2) {
        return `${this.value.toFixed(precision)} ${this.unit}`;
    }

    /**
     * 转换单位
     */
    convert(targetUnit) {
        if (this.unit === targetUnit) return this.value;
        
        // 长度转换
        if (UNIT_CONVERSIONS[this.unit] && UNIT_CONVERSIONS[targetUnit]) {
            const inMM = this.value * UNIT_CONVERSIONS[this.unit];
            return inMM / UNIT_CONVERSIONS[targetUnit];
        }
        
        return this.value;
    }
}

/**
 * 测量工具类
 */
export class MeasurementTools {
    constructor() {
        /** @type {MeasurementResult[]} */
        this.measurements = [];
        
        /** @type {MeasurementResult|null} */
        this.activeMeasurement = null;
        
        /** @type {string} */
        this.currentTool = null;
        
        /** @type {Array} */
        this.measurementPoints = [];
        
        /** @type {string} */
        this.defaultLengthUnit = Units.MM;
        
        /** @type {string} */
        this.defaultAngleUnit = Units.DEGREE;
        
        /** @type {number} */
        this.pixelsPerMM = 3.7795275591; // 96 DPI
        
        /** @type {boolean} */
        this.showMeasurements = true;
        
        /** @type {Object} */
        this.style = {
            lineColor: '#ff6600',
            lineWidth: 2,
            pointColor: '#ff6600',
            pointRadius: 5,
            textColor: '#333333',
            fontSize: 14,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            padding: 6
        };
    }

    /**
     * 开始测量
     */
    startMeasurement(type) {
        this.currentTool = type;
        this.measurementPoints = [];
        this.activeMeasurement = null;
    }

    /**
     * 添加测量点
     */
    addPoint(point) {
        if (!this.currentTool) return;
        
        this.measurementPoints.push({ ...point });
        
        // 根据工具类型判断是否完成
        switch (this.currentTool) {
            case MeasurementType.DISTANCE:
                if (this.measurementPoints.length === 2) {
                    this._completeMeasurement();
                }
                break;
            
            case MeasurementType.ANGLE:
                if (this.measurementPoints.length === 3) {
                    this._completeMeasurement();
                }
                break;
        }
    }

    /**
     * 完成测量
     * @private
     */
    _completeMeasurement() {
        let result = null;
        
        switch (this.currentTool) {
            case MeasurementType.DISTANCE:
                result = this.measureDistance(
                    this.measurementPoints[0],
                    this.measurementPoints[1]
                );
                break;
            
            case MeasurementType.ANGLE:
                result = this.measureAngle(
                    this.measurementPoints[0],
                    this.measurementPoints[1],
                    this.measurementPoints[2]
                );
                break;
        }
        
        if (result) {
            this.measurements.push(result);
            this.activeMeasurement = result;
        }
        
        this.currentTool = null;
        this.measurementPoints = [];
    }

    /**
     * 取消测量
     */
    cancelMeasurement() {
        this.currentTool = null;
        this.measurementPoints = [];
        this.activeMeasurement = null;
    }

    /**
     * 测量距离
     */
    measureDistance(point1, point2, unit = null) {
        const dx = point2.x - point1.x;
        const dy = point2.y - point1.y;
        const distanceInPixels = Math.sqrt(dx * dx + dy * dy);
        
        // 转换为实际单位
        const distanceInMM = distanceInPixels / this.pixelsPerMM;
        const targetUnit = unit || this.defaultLengthUnit;
        const value = distanceInMM / UNIT_CONVERSIONS[targetUnit];
        
        return new MeasurementResult(
            MeasurementType.DISTANCE,
            value,
            targetUnit,
            [point1, point2]
        );
    }

    /**
     * 测量角度
     */
    measureAngle(point1, vertex, point2, unit = null) {
        // 计算两个向量
        const v1 = {
            x: point1.x - vertex.x,
            y: point1.y - vertex.y
        };
        const v2 = {
            x: point2.x - vertex.x,
            y: point2.y - vertex.y
        };
        
        // 计算角度（弧度）
        const angle1 = Math.atan2(v1.y, v1.x);
        const angle2 = Math.atan2(v2.y, v2.x);
        let angleRad = angle2 - angle1;
        
        // 归一化到 0-2π
        if (angleRad < 0) angleRad += Math.PI * 2;
        if (angleRad > Math.PI) angleRad = Math.PI * 2 - angleRad;
        
        // 转换单位
        const targetUnit = unit || this.defaultAngleUnit;
        const value = targetUnit === Units.DEGREE 
            ? angleRad * 180 / Math.PI 
            : angleRad;
        
        return new MeasurementResult(
            MeasurementType.ANGLE,
            value,
            targetUnit,
            [point1, vertex, point2]
        );
    }

    /**
     * 测量面积
     */
    measureArea(points, unit = null) {
        if (points.length < 3) return null;
        
        // 使用鞋带公式计算多边形面积
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        area = Math.abs(area) / 2;
        
        // 转换为实际单位
        const areaInMM2 = area / (this.pixelsPerMM * this.pixelsPerMM);
        const targetUnit = unit || Units.MM2;
        
        let value = areaInMM2;
        if (targetUnit === Units.CM2) value = areaInMM2 / 100;
        if (targetUnit === Units.M2) value = areaInMM2 / 1000000;
        
        return new MeasurementResult(
            MeasurementType.AREA,
            value,
            targetUnit,
            points
        );
    }

    /**
     * 测量光程
     */
    measureOpticalPath(points, refractiveIndices = []) {
        if (points.length < 2) return null;
        
        let totalPath = 0;
        
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i-1].x;
            const dy = points[i].y - points[i-1].y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // 应用折射率
            const n = refractiveIndices[i-1] || 1.0;
            totalPath += distance * n;
        }
        
        // 转换为实际单位
        const pathInMM = totalPath / this.pixelsPerMM;
        const value = pathInMM / UNIT_CONVERSIONS[this.defaultLengthUnit];
        
        return new MeasurementResult(
            MeasurementType.OPTICAL_PATH,
            value,
            this.defaultLengthUnit,
            points
        );
    }

    /**
     * 渲染测量
     */
    render(ctx) {
        if (!this.showMeasurements) return;
        
        ctx.save();
        
        // 渲染所有测量
        this.measurements.forEach(measurement => {
            this._renderMeasurement(ctx, measurement);
        });
        
        // 渲染正在进行的测量
        if (this.currentTool && this.measurementPoints.length > 0) {
            this._renderInProgress(ctx);
        }
        
        ctx.restore();
    }

    /**
     * 渲染测量结果
     * @private
     */
    _renderMeasurement(ctx, measurement) {
        const { points } = measurement;
        if (!points || points.length === 0) return;
        
        ctx.strokeStyle = this.style.lineColor;
        ctx.lineWidth = this.style.lineWidth;
        ctx.fillStyle = this.style.pointColor;
        
        // 绘制线条
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
        }
        ctx.stroke();
        
        // 绘制点
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.style.pointRadius, 0, Math.PI * 2);
            ctx.fill();
        });
        
        // 绘制标签
        const midPoint = this._getMidPoint(points);
        this._renderLabel(ctx, measurement.format(), midPoint);
        
        // 特殊渲染
        if (measurement.type === MeasurementType.ANGLE && points.length === 3) {
            this._renderAngleArc(ctx, points[0], points[1], points[2]);
        }
    }

    /**
     * 渲染进行中的测量
     * @private
     */
    _renderInProgress(ctx) {
        const points = this.measurementPoints;
        
        ctx.strokeStyle = this.style.lineColor;
        ctx.lineWidth = this.style.lineWidth;
        ctx.setLineDash([5, 5]);
        ctx.fillStyle = this.style.pointColor;
        
        // 绘制线条
        if (points.length > 1) {
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();
        }
        
        ctx.setLineDash([]);
        
        // 绘制点
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.style.pointRadius, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    /**
     * 渲染角度弧
     * @private
     */
    _renderAngleArc(ctx, point1, vertex, point2) {
        const radius = 30;
        
        const angle1 = Math.atan2(point1.y - vertex.y, point1.x - vertex.x);
        const angle2 = Math.atan2(point2.y - vertex.y, point2.x - vertex.x);
        
        ctx.strokeStyle = this.style.lineColor;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(vertex.x, vertex.y, radius, angle1, angle2);
        ctx.stroke();
    }

    /**
     * 渲染标签
     * @private
     */
    _renderLabel(ctx, text, position) {
        ctx.font = `${this.style.fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const metrics = ctx.measureText(text);
        const width = metrics.width + this.style.padding * 2;
        const height = this.style.fontSize + this.style.padding * 2;
        
        // 背景
        ctx.fillStyle = this.style.backgroundColor;
        ctx.fillRect(
            position.x - width / 2,
            position.y - height / 2,
            width,
            height
        );
        
        // 文本
        ctx.fillStyle = this.style.textColor;
        ctx.fillText(text, position.x, position.y);
    }

    /**
     * 获取中点
     * @private
     */
    _getMidPoint(points) {
        if (points.length === 0) return { x: 0, y: 0 };
        
        const sum = points.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    }

    /**
     * 获取所有测量
     */
    getAllMeasurements() {
        return [...this.measurements];
    }

    /**
     * 清除所有测量
     */
    clearAll() {
        this.measurements = [];
        this.activeMeasurement = null;
    }

    /**
     * 删除测量
     */
    deleteMeasurement(index) {
        if (index >= 0 && index < this.measurements.length) {
            this.measurements.splice(index, 1);
        }
    }

    /**
     * 设置像素比例
     */
    setPixelsPerMM(value) {
        this.pixelsPerMM = value;
    }

    /**
     * 设置默认单位
     */
    setDefaultUnits(lengthUnit, angleUnit) {
        if (lengthUnit) this.defaultLengthUnit = lengthUnit;
        if (angleUnit) this.defaultAngleUnit = angleUnit;
    }

    /**
     * 导出测量结果
     */
    exportMeasurements() {
        return this.measurements.map(m => ({
            type: m.type,
            value: m.value,
            unit: m.unit,
            formatted: m.format(),
            timestamp: m.timestamp
        }));
    }

    /**
     * 序列化
     */
    serialize() {
        return {
            measurements: this.measurements.map(m => ({
                type: m.type,
                value: m.value,
                unit: m.unit,
                points: m.points
            })),
            defaultLengthUnit: this.defaultLengthUnit,
            defaultAngleUnit: this.defaultAngleUnit,
            pixelsPerMM: this.pixelsPerMM
        };
    }

    /**
     * 反序列化
     */
    deserialize(data) {
        if (data.measurements) {
            this.measurements = data.measurements.map(m => 
                new MeasurementResult(m.type, m.value, m.unit, m.points)
            );
        }
        if (data.defaultLengthUnit) this.defaultLengthUnit = data.defaultLengthUnit;
        if (data.defaultAngleUnit) this.defaultAngleUnit = data.defaultAngleUnit;
        if (data.pixelsPerMM) this.pixelsPerMM = data.pixelsPerMM;
    }
}

// ========== 单例模式 ==========
let measurementToolsInstance = null;

export function getMeasurementTools() {
    if (!measurementToolsInstance) {
        measurementToolsInstance = new MeasurementTools();
    }
    return measurementToolsInstance;
}

export function resetMeasurementTools() {
    measurementToolsInstance = null;
}

// 全局导出
if (typeof window !== 'undefined') {
    window.MeasurementTools = MeasurementTools;
    window.MeasurementResult = MeasurementResult;
    window.getMeasurementTools = getMeasurementTools;
    window.MeasurementType = MeasurementType;
    window.Units = Units;
}
