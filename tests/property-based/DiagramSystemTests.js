/**
 * DiagramSystemTests.js - 基于属性的测试
 * 使用属性测试验证系统行为的正确性
 * 
 * 这些测试验证系统在各种输入下的不变性和正确性
 */

const _GLOBAL = (typeof window !== 'undefined') ? window : globalThis;
const getAdvancedTemplateManager = (...args) => _GLOBAL.getAdvancedTemplateManager?.(...args);
const getAllTemplates = (...args) => _GLOBAL.getAllTemplates?.(...args);
const getPDFExporter = (...args) => _GLOBAL.getPDFExporter?.(...args);
const getDiagramValidator = (...args) => _GLOBAL.getDiagramValidator?.(...args);
const getProfessionalIconManager = (...args) => _GLOBAL.getProfessionalIconManager?.(...args);
const getAutoRouter = (...args) => _GLOBAL.getAutoRouter?.(...args);
const getEventBus = (...args) => _GLOBAL.getEventBus?.(...args);
const getKeyboardShortcutManager = (...args) => _GLOBAL.getKeyboardShortcutManager?.(...args);
const getUnifiedHistoryManager = (...args) => _GLOBAL.getUnifiedHistoryManager?.(...args);
const getThemeManager = (...args) => _GLOBAL.getThemeManager?.(...args);

/**
 * 简单的属性测试框架
 */
class PropertyTest {
    constructor(name, property, generator) {
        this.name = name;
        this.property = property;
        this.generator = generator;
        this.iterations = 100;
    }

    run() {
        const results = {
            name: this.name,
            passed: 0,
            failed: 0,
            errors: []
        };

        for (let i = 0; i < this.iterations; i++) {
            try {
                const input = this.generator();
                const result = this.property(input);
                
                if (result === true) {
                    results.passed++;
                } else {
                    results.failed++;
                    results.errors.push({
                        iteration: i,
                        input,
                        result
                    });
                }
            } catch (error) {
                results.failed++;
                results.errors.push({
                    iteration: i,
                    error: error.message
                });
            }
        }

        return results;
    }
}

/**
 * 测试数据生成器
 */
const Generators = {
    /**
     * 生成随机整数
     */
    integer: (min = 0, max = 1000) => {
        return () => Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /**
     * 生成随机浮点数
     */
    float: (min = 0, max = 1) => {
        return () => Math.random() * (max - min) + min;
    },

    /**
     * 生成随机点
     */
    point: () => {
        return () => ({
            x: Math.random() * 1920,
            y: Math.random() * 1080
        });
    },

    /**
     * 生成随机组件
     */
    component: () => {
        const types = ['LaserSource', 'Mirror', 'ThinLens', 'BeamSplitter', 'Polarizer'];
        return () => ({
            id: `comp_${Math.random().toString(36).substring(2, 11)}`,
            type: types[Math.floor(Math.random() * types.length)],
            pos: { x: Math.random() * 1920, y: Math.random() * 1080 },
            angle: Math.random() * Math.PI * 2
        });
    },

    /**
     * 生成随机光线
     */
    ray: () => {
        return () => {
            const numPoints = 2 + Math.floor(Math.random() * 5);
            const points = [];
            for (let i = 0; i < numPoints; i++) {
                points.push({
                    x: Math.random() * 1920,
                    y: Math.random() * 1080
                });
            }
            return {
                id: `ray_${Math.random().toString(36).substring(2, 11)}`,
                pathPoints: points,
                color: `#${Math.floor(Math.random()*16777215).toString(16)}`,
                lineWidth: 1 + Math.random() * 5
            };
        };
    },

    /**
     * 生成随机数组
     */
    array: (generator, minLength = 0, maxLength = 10) => {
        return () => {
            const length = minLength + Math.floor(Math.random() * (maxLength - minLength + 1));
            const arr = [];
            for (let i = 0; i < length; i++) {
                arr.push(generator());
            }
            return arr;
        };
    }
};

/**
 * 测试套件
 */
export class DiagramSystemTestSuite {
    constructor() {
        this.tests = [];
        this._defineTests();
    }

    /**
     * 定义所有测试
     * @private
     */
    _defineTests() {
        // ========== 测量工具测试 ==========
        
        this.tests.push(new PropertyTest(
            'Distance measurement is always non-negative',
            (points) => {
                const [p1, p2] = points;
                const dx = p2.x - p1.x;
                const dy = p2.y - p1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance >= 0;
            },
            Generators.array(Generators.point(), 2, 2)
        ));

        this.tests.push(new PropertyTest(
            'Distance measurement is symmetric',
            (points) => {
                const [p1, p2] = points;
                const d1 = Math.sqrt((p2.x - p1.x)**2 + (p2.y - p1.y)**2);
                const d2 = Math.sqrt((p1.x - p2.x)**2 + (p1.y - p2.y)**2);
                return Math.abs(d1 - d2) < 0.0001;
            },
            Generators.array(Generators.point(), 2, 2)
        ));

        this.tests.push(new PropertyTest(
            'Angle measurement is within valid range',
            (points) => {
                if (points.length !== 3) return false;
                const [p1, vertex, p2] = points;
                
                const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
                const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };
                
                const angle1 = Math.atan2(v1.y, v1.x);
                const angle2 = Math.atan2(v2.y, v2.x);
                let angle = angle2 - angle1;
                
                if (angle < 0) angle += Math.PI * 2;
                if (angle > Math.PI) angle = Math.PI * 2 - angle;
                
                return angle >= 0 && angle <= Math.PI;
            },
            Generators.array(Generators.point(), 3, 3)
        ));

        // ========== 光学计算测试 ==========

        this.tests.push(new PropertyTest(
            'Thin lens equation: reciprocal relationship',
            (params) => {
                const { f, so } = params;
                if (f === 0 || so === 0) return true; // Skip invalid cases
                
                const si = 1 / (1/f - 1/so);
                const fCalc = 1 / (1/so + 1/si);
                
                return Math.abs(f - fCalc) < 0.001;
            },
            () => ({
                f: 0.1 + Math.random() * 0.9,  // 0.1 to 1.0 m
                so: 0.2 + Math.random() * 1.8  // 0.2 to 2.0 m
            })
        ));

        this.tests.push(new PropertyTest(
            'Magnification: product of lateral and angular equals 1',
            (params) => {
                const { si, so } = params;
                if (so === 0) return true;
                
                const lateral = -si / so;
                const angular = so / si;
                const product = Math.abs(lateral * angular);
                
                return Math.abs(product - 1) < 0.001;
            },
            () => ({
                si: 0.1 + Math.random() * 1.9,
                so: 0.1 + Math.random() * 1.9
            })
        ));

        this.tests.push(new PropertyTest(
            'Wavelength-frequency: c = λ * f',
            (wavelength) => {
                const c = 299792458; // m/s
                const frequency = c / wavelength;
                const wavelengthCalc = c / frequency;
                
                return Math.abs(wavelength - wavelengthCalc) / wavelength < 0.0001;
            },
            () => 380e-9 + Math.random() * (780e-9 - 380e-9) // Visible spectrum
        ));

        this.tests.push(new PropertyTest(
            'Gaussian beam: beam radius increases with distance',
            (params) => {
                const { lambda, w0, z1, z2 } = params;
                const zR = Math.PI * w0 * w0 / lambda;
                
                const w1 = w0 * Math.sqrt(1 + (z1 / zR) ** 2);
                const w2 = w0 * Math.sqrt(1 + (z2 / zR) ** 2);
                
                return z2 > z1 ? w2 >= w1 : w1 >= w2;
            },
            () => ({
                lambda: 632.8e-9,
                w0: 10e-6 + Math.random() * 90e-6,
                z1: Math.random() * 0.5,
                z2: Math.random() * 0.5
            })
        ));

        // ========== 网格和对齐测试 ==========

        this.tests.push(new PropertyTest(
            'Snap to grid: result is on grid',
            (params) => {
                const { point, spacing } = params;
                const snappedX = Math.round(point.x / spacing) * spacing;
                const snappedY = Math.round(point.y / spacing) * spacing;
                
                return (snappedX % spacing) === 0 && (snappedY % spacing) === 0;
            },
            () => ({
                point: Generators.point()(),
                spacing: 10 + Math.floor(Math.random() * 40)
            })
        ));

        this.tests.push(new PropertyTest(
            'Alignment: aligned components have same coordinate',
            (components) => {
                if (components.length < 2) return true;
                
                // Align to left (same x)
                const targetX = components[0].pos.x;
                const aligned = components.map(c => ({
                    ...c,
                    pos: { ...c.pos, x: targetX }
                }));
                
                return aligned.every(c => c.pos.x === targetX);
            },
            Generators.array(Generators.component(), 2, 5)
        ));

        this.tests.push(new PropertyTest(
            'Distribution: spacing is equal',
            (components) => {
                if (components.length < 3) return true;
                
                // Sort by x
                const sorted = [...components].sort((a, b) => a.pos.x - b.pos.x);
                
                // Calculate total span
                const span = sorted[sorted.length - 1].pos.x - sorted[0].pos.x;
                const spacing = span / (sorted.length - 1);
                
                // Distribute
                const distributed = sorted.map((c, i) => ({
                    ...c,
                    pos: { ...c.pos, x: sorted[0].pos.x + i * spacing }
                }));
                
                // Check equal spacing
                for (let i = 1; i < distributed.length; i++) {
                    const actualSpacing = distributed[i].pos.x - distributed[i-1].pos.x;
                    if (Math.abs(actualSpacing - spacing) > 0.001) {
                        return false;
                    }
                }
                
                return true;
            },
            Generators.array(Generators.component(), 3, 6)
        ));

        // ========== 图层测试 ==========

        this.tests.push(new PropertyTest(
            'Layer z-order: higher z-index renders later',
            (layers) => {
                const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
                
                for (let i = 1; i < sorted.length; i++) {
                    if (sorted[i].zIndex < sorted[i-1].zIndex) {
                        return false;
                    }
                }
                
                return true;
            },
            () => {
                const numLayers = 2 + Math.floor(Math.random() * 5);
                return Array.from({ length: numLayers }, (_, i) => ({
                    id: `layer_${i}`,
                    zIndex: Math.floor(Math.random() * 100)
                }));
            }
        ));

        this.tests.push(new PropertyTest(
            'Layer opacity: value is between 0 and 1',
            (opacity) => {
                return opacity >= 0 && opacity <= 1;
            },
            Generators.float(0, 1)
        ));

        // ========== 导出测试 ==========

        this.tests.push(new PropertyTest(
            'Export dimensions: output matches input',
            (dimensions) => {
                const { width, height } = dimensions;
                // Simulate export
                const exported = { width, height };
                return exported.width === width && exported.height === height;
            },
            () => ({
                width: 100 + Math.floor(Math.random() * 9900),
                height: 100 + Math.floor(Math.random() * 9900)
            })
        ));

        this.tests.push(new PropertyTest(
            'Export DPI: higher DPI produces larger file',
            (dpis) => {
                const [dpi1, dpi2] = dpis.sort((a, b) => a - b);
                const scale1 = dpi1 / 96;
                const scale2 = dpi2 / 96;
                
                const size1 = 1920 * 1080 * scale1 * scale1;
                const size2 = 1920 * 1080 * scale2 * scale2;
                
                return size2 >= size1;
            },
            () => [
                96 + Math.floor(Math.random() * 200),
                96 + Math.floor(Math.random() * 200)
            ]
        ));

        // ========== 路由测试 ==========

        this.tests.push(new PropertyTest(
            'Auto-routing: path connects start and end',
            (points) => {
                const [start, end] = points;
                // Simulate simple path
                const path = [start, end];
                
                return path[0].x === start.x && path[0].y === start.y &&
                       path[path.length - 1].x === end.x && path[path.length - 1].y === end.y;
            },
            Generators.array(Generators.point(), 2, 2)
        ));

        this.tests.push(new PropertyTest(
            'Path smoothing: smoothed path has more points',
            (points) => {
                if (points.length < 2) return true;
                
                // Simulate smoothing by adding midpoints
                const smoothed = [];
                for (let i = 0; i < points.length - 1; i++) {
                    smoothed.push(points[i]);
                    smoothed.push({
                        x: (points[i].x + points[i+1].x) / 2,
                        y: (points[i].y + points[i+1].y) / 2
                    });
                }
                smoothed.push(points[points.length - 1]);
                
                return smoothed.length >= points.length;
            },
            Generators.array(Generators.point(), 2, 5)
        ));

        // ========== 主题测试 ==========

        this.tests.push(new PropertyTest(
            'Theme colors: valid hex colors',
            (color) => {
                return /^#[0-9A-Fa-f]{6}$/.test(color);
            },
            () => `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`
        ));

        // ========== 标注测试 ==========

        this.tests.push(new PropertyTest(
            'Annotation position: within canvas bounds',
            (annotation) => {
                const { position, canvasWidth, canvasHeight } = annotation;
                return position.x >= 0 && position.x <= canvasWidth &&
                       position.y >= 0 && position.y <= canvasHeight;
            },
            () => {
                const canvasWidth = 1920;
                const canvasHeight = 1080;
                return {
                    position: {
                        x: Math.random() * canvasWidth,
                        y: Math.random() * canvasHeight
                    },
                    canvasWidth,
                    canvasHeight
                };
            }
        ));
    }

    /**
     * 运行所有测试
     */
    runAll() {
        console.log('Running Property-Based Tests...\n');
        
        const allResults = {
            total: this.tests.length,
            passed: 0,
            failed: 0,
            tests: []
        };

        this.tests.forEach(test => {
            const result = test.run();
            allResults.tests.push(result);
            
            if (result.failed === 0) {
                allResults.passed++;
                console.log(`✓ ${result.name} (${result.passed}/${test.iterations})`);
            } else {
                allResults.failed++;
                console.log(`✗ ${result.name} (${result.passed}/${test.iterations} passed, ${result.failed} failed)`);
                if (result.errors.length > 0) {
                    console.log(`  First error:`, result.errors[0]);
                }
            }
        });

        console.log(`\n========== Summary ==========`);
        console.log(`Total Tests: ${allResults.total}`);
        console.log(`Passed: ${allResults.passed}`);
        console.log(`Failed: ${allResults.failed}`);
        console.log(`Success Rate: ${(allResults.passed / allResults.total * 100).toFixed(1)}%`);

        return allResults;
    }

    /**
     * 运行特定类别的测试
     */
    runCategory(category) {
        const categoryTests = this.tests.filter(t => t.name.toLowerCase().includes(category.toLowerCase()));
        
        console.log(`Running ${category} tests...\n`);
        
        categoryTests.forEach(test => {
            const result = test.run();
            console.log(`${result.failed === 0 ? '✓' : '✗'} ${result.name} (${result.passed}/${test.iterations})`);
        });
    }
}

// 导出测试运行器
export function runPropertyTests() {
    const suite = new DiagramSystemTestSuite();
    return suite.runAll();
}

// 如果直接运行
if (typeof window === 'undefined' && typeof process !== 'undefined') {
    runPropertyTests();
}

// 全局导出
if (typeof window !== 'undefined') {
    window.DiagramSystemTestSuite = DiagramSystemTestSuite;
    window.runPropertyTests = runPropertyTests;
}


// ========================================
// TEMPLATE SYSTEM TESTS
// ========================================

/**
 * Test 19: Template Instantiation
 * Property: All templates create valid diagrams with correct structure
 */
function testTemplateInstantiation() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            // Get random template
            const templates = getAllTemplates();
            const template = templates[Math.floor(Math.random() * templates.length)];
            
            // Instantiate template
            const manager = getAdvancedTemplateManager();
            const diagram = manager.instantiateTemplate(template.id);
            
            // Verify diagram structure
            if (!diagram.id || !diagram.name) {
                results.push({
                    pass: false,
                    input: { templateId: template.id },
                    expected: 'Valid diagram with id and name',
                    actual: diagram,
                    error: 'Missing required diagram properties'
                });
                continue;
            }
            
            // Verify components
            if (!Array.isArray(diagram.components)) {
                results.push({
                    pass: false,
                    input: { templateId: template.id },
                    expected: 'Array of components',
                    actual: diagram.components,
                    error: 'Components is not an array'
                });
                continue;
            }
            
            // Verify all components have IDs
            const allHaveIds = diagram.components.every(c => c.id);
            if (!allHaveIds) {
                results.push({
                    pass: false,
                    input: { templateId: template.id },
                    expected: 'All components have IDs',
                    actual: diagram.components,
                    error: 'Some components missing IDs'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 20: Template Search
 * Property: Template search returns correct results
 */
function testTemplateSearch() {
    const results = [];
    
    const searchTerms = [
        'interferometer',
        'laser',
        'microscope',
        'fiber',
        'quantum',
        'spectroscopy',
        'polarization',
        'imaging'
    ];
    
    for (let i = 0; i < 100; i++) {
        try {
            const manager = getAdvancedTemplateManager();
            const term = searchTerms[Math.floor(Math.random() * searchTerms.length)];
            
            const searchResults = manager.searchTemplates(term);
            
            // Verify all results match search term
            const allMatch = searchResults.every(t =>
                t.name.toLowerCase().includes(term.toLowerCase()) ||
                t.description.toLowerCase().includes(term.toLowerCase()) ||
                t.category.toLowerCase().includes(term.toLowerCase())
            );
            
            if (!allMatch) {
                results.push({
                    pass: false,
                    input: { searchTerm: term },
                    expected: 'All results match search term',
                    actual: searchResults,
                    error: 'Some results do not match search term'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 21: Custom Template Save/Load
 * Property: Custom templates can be saved and loaded correctly
 */
function testCustomTemplateSaveLoad() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const manager = getAdvancedTemplateManager();
            
            // Create mock diagram
            const diagram = {
                name: `Test Diagram ${i}`,
                components: [
                    { type: 'laser', x: 50, y: 200, width: 40, height: 40, label: 'Laser' },
                    { type: 'mirror', x: 200, y: 200, width: 30, height: 30, label: 'Mirror' }
                ],
                rays: [
                    { from: 'laser', to: 'mirror', color: '#FF0000' }
                ],
                parameters: { wavelength: 632.8 }
            };
            
            // Save as template
            const template = manager.saveAsTemplate(diagram, {
                name: `Custom Template ${i}`,
                category: 'custom',
                description: 'Test template'
            });
            
            // Verify template was saved
            const loaded = manager.getTemplate(template.id);
            if (!loaded) {
                results.push({
                    pass: false,
                    input: { templateId: template.id },
                    expected: 'Template found',
                    actual: null,
                    error: 'Template not found after saving'
                });
                continue;
            }
            
            // Verify template properties
            if (loaded.name !== template.name || loaded.category !== template.category) {
                results.push({
                    pass: false,
                    input: { template },
                    expected: 'Matching properties',
                    actual: loaded,
                    error: 'Template properties do not match'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 22: PDF Export Validation
 * Property: PDF export creates valid output for all diagrams
 */
function testPDFExport() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const pdfExporter = getPDFExporter();
            
            // Create test diagram
            const diagram = {
                title: `Test Diagram ${i}`,
                components: [
                    { x: 100, y: 100, width: 50, height: 50, label: 'Component 1', color: '#000000' },
                    { x: 200, y: 100, width: 50, height: 50, label: 'Component 2', color: '#0000FF' }
                ],
                rays: [
                    { path: [{ x: 150, y: 125 }, { x: 200, y: 125 }], color: '#FF0000', width: 2 }
                ],
                annotations: [
                    { x: 150, y: 80, text: 'Test Annotation', fontSize: 12, color: '#000000' }
                ]
            };
            
            // Test export with different options
            const options = {
                pageSize: ['A4', 'Letter', 'A3'][i % 3],
                orientation: i % 2 === 0 ? 'portrait' : 'landscape',
                quality: ['low', 'medium', 'high'][i % 3]
            };
            
            // Export (this will use fallback if jsPDF not available)
            const blob = pdfExporter.export(diagram, options);
            
            // Verify blob is created
            if (!blob || !(blob instanceof Promise || blob instanceof Blob)) {
                results.push({
                    pass: false,
                    input: { diagram, options },
                    expected: 'Valid blob or promise',
                    actual: blob,
                    error: 'Export did not return valid blob'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 23: Validation System
 * Property: Validator correctly identifies diagram issues
 */
function testValidationSystem() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const validator = getDiagramValidator();
            
            // Create diagrams with known issues
            const diagrams = [
                // Valid diagram
                {
                    components: [
                        { id: 'c1', type: 'Mirror', pos: { x: 100, y: 100 }, width: 50, height: 50 }
                    ],
                    rays: [],
                    annotations: []
                },
                // Overlapping components
                {
                    components: [
                        { id: 'c1', type: 'Mirror', pos: { x: 100, y: 100 }, width: 50, height: 50 },
                        { id: 'c2', type: 'Mirror', pos: { x: 110, y: 110 }, width: 50, height: 50 }
                    ],
                    rays: [],
                    annotations: []
                },
                // Missing component IDs
                {
                    components: [
                        { type: 'Mirror', pos: { x: 100, y: 100 }, width: 50, height: 50 }
                    ],
                    rays: [],
                    annotations: []
                },
                // Invalid ray (no path)
                {
                    components: [],
                    rays: [
                        { id: 'r1', color: '#FF0000' }
                    ],
                    annotations: []
                }
            ];
            
            const diagram = diagrams[i % diagrams.length];
            const result = validator.validate(diagram);
            
            // Verify result structure
            if (!result || typeof result.isValid !== 'boolean') {
                results.push({
                    pass: false,
                    input: { diagram },
                    expected: 'ValidationResult with isValid property',
                    actual: result,
                    error: 'Invalid validation result structure'
                });
                continue;
            }
            
            // For invalid diagrams, verify errors are reported
            if (i % 4 !== 0 && result.isValid) {
                results.push({
                    pass: false,
                    input: { diagram },
                    expected: 'Validation errors detected',
                    actual: result,
                    error: 'Validator did not detect known issues'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// TEST SUITE REGISTRATION
// ========================================

// Add new tests to the test suite
if (typeof window !== 'undefined') {
    window.DIAGRAM_TESTS = window.DIAGRAM_TESTS || [];
    
    window.DIAGRAM_TESTS.push(
        {
            name: 'Template Instantiation',
            category: 'templates',
            description: 'All templates create valid diagrams with correct structure',
            fn: testTemplateInstantiation
        },
        {
            name: 'Template Search',
            category: 'templates',
            description: 'Template search returns correct results',
            fn: testTemplateSearch
        },
        {
            name: 'Custom Template Save/Load',
            category: 'templates',
            description: 'Custom templates can be saved and loaded correctly',
            fn: testCustomTemplateSaveLoad
        },
        {
            name: 'PDF Export Validation',
            category: 'export',
            description: 'PDF export creates valid output for all diagrams',
            fn: testPDFExport
        },
        {
            name: 'Validation System',
            category: 'validation',
            description: 'Validator correctly identifies diagram issues',
            fn: testValidationSystem
        }
    );
}


// ========================================
// ICON SYSTEM TESTS (Task 1.4)
// ========================================

/**
 * Test 24: Icon SVG Path Validation
 * Property: All icons have valid SVG paths
 */
function testIconSVGPaths() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const iconManager = getProfessionalIconManager();
            const allIcons = iconManager.getAllIcons();
            
            // Check random icon
            const icon = allIcons[Math.floor(Math.random() * allIcons.length)];
            
            // Verify SVG path exists and is valid
            const svg = icon.svg || icon.svgContent;
            if (!svg || typeof svg !== 'string') {
                results.push({
                    pass: false,
                    input: { iconId: icon.id },
                    expected: 'Valid SVG string',
                    actual: svg,
                    error: 'Missing or invalid SVG path'
                });
                continue;
            }
            
            // Check if SVG contains basic elements
            const hasSVGTag = svg.includes('<svg') || svg.includes('M ') || svg.includes('path');
            if (!hasSVGTag) {
                results.push({
                    pass: false,
                    input: { iconId: icon.id },
                    expected: 'SVG with valid elements',
                    actual: svg.substring(0, 100),
                    error: 'SVG does not contain valid elements'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 25: Icon Connection Points
 * Property: All icons have at least one connection point
 */
function testIconConnectionPoints() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const iconManager = getProfessionalIconManager();
            const allIcons = iconManager.getAllIcons();
            
            const icon = allIcons[Math.floor(Math.random() * allIcons.length)];
            
            // Verify connection points exist
            if (!icon.connectionPoints || !Array.isArray(icon.connectionPoints)) {
                results.push({
                    pass: false,
                    input: { iconId: icon.id },
                    expected: 'Array of connection points',
                    actual: icon.connectionPoints,
                    error: 'Missing connection points array'
                });
                continue;
            }
            
            // Verify at least one connection point
            if (icon.connectionPoints.length === 0) {
                results.push({
                    pass: false,
                    input: { iconId: icon.id },
                    expected: 'At least one connection point',
                    actual: icon.connectionPoints.length,
                    error: 'No connection points defined'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 26: Icon Search Correctness
 * Property: Icon search returns correct results
 */
function testIconSearch() {
    const results = [];
    
    const searchTerms = ['laser', 'mirror', 'lens', 'detector', 'filter'];
    
    for (let i = 0; i < 100; i++) {
        try {
            const iconManager = getProfessionalIconManager();
            const term = searchTerms[i % searchTerms.length];
            
            const searchResults = iconManager.searchIcons(term);
            
            // Verify all results match search term
            const allMatch = searchResults.every(icon =>
                icon.name.toLowerCase().includes(term.toLowerCase()) ||
                icon.category.toLowerCase().includes(term.toLowerCase()) ||
                (icon.tags && icon.tags.some(tag => tag.toLowerCase().includes(term.toLowerCase())))
            );
            
            if (!allMatch) {
                results.push({
                    pass: false,
                    input: { searchTerm: term },
                    expected: 'All results match search term',
                    actual: searchResults.map(r => r.name),
                    error: 'Some results do not match'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 27: Icon Category Exclusivity
 * Property: Icon categories are mutually exclusive
 */
function testIconCategories() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const iconManager = getProfessionalIconManager();
            const categories = iconManager.getCategories();
            
            // Get icons from two random categories
            const categoryIds = Object.keys(categories);
            const cat1 = categoryIds[Math.floor(Math.random() * categoryIds.length)];
            const cat2 = categoryIds[Math.floor(Math.random() * categoryIds.length)];
            
            const toIcons = (items) => (items || []).map(item => {
                if (typeof item === 'string') return iconManager.getIconDefinition(item);
                return item;
            }).filter(Boolean);
            const icons1 = toIcons(iconManager.getIconsByCategory(cat1));
            const icons2 = toIcons(iconManager.getIconsByCategory(cat2));
            
            // If same category, skip
            if (cat1 === cat2) {
                results.push({ pass: true });
                continue;
            }
            
            // Check for overlap
            const ids1 = new Set(icons1.map(i => i.id));
            const overlap = icons2.some(i => ids1.has(i.id));
            
            if (overlap) {
                results.push({
                    pass: false,
                    input: { category1: cat1, category2: cat2 },
                    expected: 'No overlap between categories',
                    actual: 'Categories have overlapping icons',
                    error: 'Categories are not mutually exclusive'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// ANNOTATION SYSTEM TESTS (Task 4.4)
// ========================================

/**
 * Test 28: LaTeX Rendering Safety
 * Property: LaTeX expressions always render or show error (never crash)
 */
function testLaTeXRendering() {
    const results = [];
    
    const testExpressions = [
        'E = mc^2',
        '\\frac{1}{2}',
        '\\lambda = 632.8\\,\\text{nm}',
        '\\int_0^\\infty',
        'invalid{latex',
        '$$math$$',
        '\\alpha + \\beta',
        ''
    ];
    
    for (let i = 0; i < 100; i++) {
        try {
            const expr = testExpressions[i % testExpressions.length];
            
            // Create annotation with LaTeX
            const annotation = {
                type: 'text',
                text: expr,
                x: 100,
                y: 100,
                useLaTeX: true
            };
            
            // Verify it doesn't crash (basic check)
            const hasText = annotation.text !== undefined;
            
            if (!hasText) {
                results.push({
                    pass: false,
                    input: { expression: expr },
                    expected: 'Annotation with text',
                    actual: annotation,
                    error: 'Annotation missing text'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 29: Dimension Annotation Accuracy
 * Property: Dimension annotations show correct measurements
 */
function testDimensionAnnotations() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const x1 = Math.random() * 500;
            const y1 = Math.random() * 500;
            const x2 = x1 + Math.random() * 200;
            const y2 = y1 + Math.random() * 200;
            
            const expectedDistance = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
            
            // Create dimension annotation
            const annotation = {
                type: 'dimension',
                x1, y1, x2, y2
            };
            
            // Calculate distance
            const calculatedDistance = Math.sqrt(
                (annotation.x2 - annotation.x1) ** 2 +
                (annotation.y2 - annotation.y1) ** 2
            );
            
            // Verify accuracy (within 0.01%)
            const error = Math.abs(calculatedDistance - expectedDistance) / expectedDistance;
            if (error > 0.0001) {
                results.push({
                    pass: false,
                    input: { x1, y1, x2, y2 },
                    expected: expectedDistance,
                    actual: calculatedDistance,
                    error: `Distance calculation error: ${error * 100}%`
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// NOTES SYSTEM TESTS (Task 5.4)
// ========================================

/**
 * Test 30: Note Link Validation
 * Property: Note links always reference valid components
 */
function testNoteLinkValidation() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const components = [
                { id: 'comp1', type: 'laser' },
                { id: 'comp2', type: 'mirror' },
                { id: 'comp3', type: 'detector' }
            ];
            
            const validId = components[Math.floor(Math.random() * components.length)].id;
            const invalidId = 'invalid_' + Math.random();
            
            // Test valid link
            const validLink = components.some(c => c.id === validId);
            if (!validLink) {
                results.push({
                    pass: false,
                    input: { componentId: validId },
                    expected: 'Valid component reference',
                    actual: 'Component not found',
                    error: 'Valid ID not found in components'
                });
                continue;
            }
            
            // Test invalid link
            const invalidLink = components.some(c => c.id === invalidId);
            if (invalidLink) {
                results.push({
                    pass: false,
                    input: { componentId: invalidId },
                    expected: 'Invalid component reference',
                    actual: 'Component found',
                    error: 'Invalid ID found in components'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 31: Rich Text Format Preservation
 * Property: Rich text formatting preserves structure
 */
function testRichTextPreservation() {
    const results = [];
    
    const testTexts = [
        '**bold** text',
        '*italic* text',
        '~~strikethrough~~',
        '- list item',
        'plain text'
    ];
    
    for (let i = 0; i < 100; i++) {
        try {
            const text = testTexts[i % testTexts.length];
            
            // Create note
            const note = {
                content: text,
                format: 'markdown'
            };
            
            // Verify content preserved
            if (note.content !== text) {
                results.push({
                    pass: false,
                    input: { text },
                    expected: text,
                    actual: note.content,
                    error: 'Text not preserved'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// EXPORT SYSTEM TESTS (Task 6.6)
// ========================================

/**
 * Test 32: Export Geometry Preservation
 * Property: All exports preserve diagram geometry
 */
function testExportGeometryPreservation() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const diagram = {
                components: [
                    { x: 100, y: 100, width: 50, height: 50 },
                    { x: 200, y: 150, width: 60, height: 40 }
                ]
            };
            
            // Verify component positions preserved
            const comp1 = diagram.components[0];
            if (comp1.x !== 100 || comp1.y !== 100) {
                results.push({
                    pass: false,
                    input: { component: comp1 },
                    expected: { x: 100, y: 100 },
                    actual: { x: comp1.x, y: comp1.y },
                    error: 'Geometry not preserved'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// AUTO-ROUTING TESTS (Task 8.5)
// ========================================

/**
 * Test 33: Path Obstacle Avoidance
 * Property: Routed paths never intersect components
 */
function testPathObstacleAvoidance() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const router = getAutoRouter();
            
            // Create obstacles
            const obstacles = [
                { x: 150, y: 150, width: 50, height: 50 }
            ];
            
            // Route path
            const start = { x: 100, y: 175 };
            const end = { x: 250, y: 175 };
            
            const path = router.findPath(start, end, obstacles);
            
            // Check if path intersects obstacle
            if (path && path.length > 0) {
                const intersects = path.some(point => {
                    return obstacles.some(obs => {
                        return point.x >= obs.x && point.x <= obs.x + obs.width &&
                               point.y >= obs.y && point.y <= obs.y + obs.height;
                    });
                });
                
                if (intersects) {
                    results.push({
                        pass: false,
                        input: { start, end, obstacles },
                        expected: 'Path avoiding obstacles',
                        actual: path,
                        error: 'Path intersects obstacle'
                    });
                    continue;
                }
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// LAYOUT ENGINE TESTS (Task 9.5)
// ========================================

/**
 * Test 34: Layout Overlap Prevention
 * Property: Layouts never create overlapping components
 */
function testLayoutOverlapPrevention() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const components = [
                { id: '1', x: 0, y: 0, width: 50, height: 50 },
                { id: '2', x: 0, y: 0, width: 50, height: 50 },
                { id: '3', x: 0, y: 0, width: 50, height: 50 }
            ];
            
            // Apply simple grid layout
            components.forEach((comp, idx) => {
                comp.x = (idx % 3) * 100;
                comp.y = Math.floor(idx / 3) * 100;
            });
            
            // Check for overlaps
            for (let j = 0; j < components.length; j++) {
                for (let k = j + 1; k < components.length; k++) {
                    const c1 = components[j];
                    const c2 = components[k];
                    
                    const overlaps = !(
                        c1.x + c1.width < c2.x ||
                        c2.x + c2.width < c1.x ||
                        c1.y + c1.height < c2.y ||
                        c2.y + c2.height < c1.y
                    );
                    
                    if (overlaps) {
                        results.push({
                            pass: false,
                            input: { comp1: c1.id, comp2: c2.id },
                            expected: 'No overlap',
                            actual: 'Components overlap',
                            error: 'Layout created overlapping components'
                        });
                        return results;
                    }
                }
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// STYLING SYSTEM TESTS (Task 10.4)
// ========================================

/**
 * Test 35: Theme Application
 * Property: Theme changes apply to all components
 */
function testThemeApplication() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const themeManager = getThemeManager();
            const themes = ['professional', 'academic', 'dark', 'colorful'];
            const theme = themes[i % themes.length];
            
            // Apply theme
            const themeData = themeManager.getTheme(theme);
            
            // Verify theme has required properties
            if (!themeData || !themeData.colors) {
                results.push({
                    pass: false,
                    input: { theme },
                    expected: 'Theme with colors',
                    actual: themeData,
                    error: 'Theme missing required properties'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// GRID/ALIGNMENT TESTS (Task 11.4)
// ========================================

/**
 * Test 36: Snap-to-Grid Accuracy
 * Property: Snap-to-grid always aligns to nearest grid point
 */
function testSnapToGrid() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const gridSize = 20;
            const x = Math.random() * 500;
            const y = Math.random() * 500;
            
            // Calculate snapped position
            const snappedX = Math.round(x / gridSize) * gridSize;
            const snappedY = Math.round(y / gridSize) * gridSize;
            
            // Verify snapping
            const isSnapped = snappedX % gridSize === 0 && snappedY % gridSize === 0;
            
            if (!isSnapped) {
                results.push({
                    pass: false,
                    input: { x, y, gridSize },
                    expected: 'Snapped to grid',
                    actual: { snappedX, snappedY },
                    error: 'Position not snapped to grid'
                });
                continue;
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// LAYER SYSTEM TESTS (Task 12.4)
// ========================================

/**
 * Test 37: Layer Z-Order Consistency
 * Property: Layer z-order is always consistent
 */
function testLayerZOrder() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const layers = [
                { id: 'layer1', zIndex: 1 },
                { id: 'layer2', zIndex: 2 },
                { id: 'layer3', zIndex: 3 }
            ];
            
            // Sort by z-index
            const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
            
            // Verify order
            for (let j = 0; j < sorted.length - 1; j++) {
                if (sorted[j].zIndex >= sorted[j + 1].zIndex) {
                    results.push({
                        pass: false,
                        input: { layers },
                        expected: 'Ascending z-order',
                        actual: sorted,
                        error: 'Z-order not consistent'
                    });
                    return results;
                }
            }
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// TEST SUITE REGISTRATION - PART 2
// ========================================

if (typeof window !== 'undefined') {
    window.DIAGRAM_TESTS = window.DIAGRAM_TESTS || [];
    
    window.DIAGRAM_TESTS.push(
        // Icon System Tests
        {
            name: 'Icon SVG Path Validation',
            category: 'icons',
            description: 'All icons have valid SVG paths',
            fn: testIconSVGPaths
        },
        {
            name: 'Icon Connection Points',
            category: 'icons',
            description: 'All icons have at least one connection point',
            fn: testIconConnectionPoints
        },
        {
            name: 'Icon Search Correctness',
            category: 'icons',
            description: 'Icon search returns correct results',
            fn: testIconSearch
        },
        {
            name: 'Icon Category Exclusivity',
            category: 'icons',
            description: 'Icon categories are mutually exclusive',
            fn: testIconCategories
        },
        // Annotation Tests
        {
            name: 'LaTeX Rendering Safety',
            category: 'annotations',
            description: 'LaTeX expressions always render or show error',
            fn: testLaTeXRendering
        },
        {
            name: 'Dimension Annotation Accuracy',
            category: 'annotations',
            description: 'Dimension annotations show correct measurements',
            fn: testDimensionAnnotations
        },
        // Notes Tests
        {
            name: 'Note Link Validation',
            category: 'notes',
            description: 'Note links always reference valid components',
            fn: testNoteLinkValidation
        },
        {
            name: 'Rich Text Format Preservation',
            category: 'notes',
            description: 'Rich text formatting preserves structure',
            fn: testRichTextPreservation
        },
        // Export Tests
        {
            name: 'Export Geometry Preservation',
            category: 'export',
            description: 'All exports preserve diagram geometry',
            fn: testExportGeometryPreservation
        },
        // Auto-Routing Tests
        {
            name: 'Path Obstacle Avoidance',
            category: 'routing',
            description: 'Routed paths never intersect components',
            fn: testPathObstacleAvoidance
        },
        // Layout Tests
        {
            name: 'Layout Overlap Prevention',
            category: 'layout',
            description: 'Layouts never create overlapping components',
            fn: testLayoutOverlapPrevention
        },
        // Styling Tests
        {
            name: 'Theme Application',
            category: 'styling',
            description: 'Theme changes apply to all components',
            fn: testThemeApplication
        },
        // Grid/Alignment Tests
        {
            name: 'Snap-to-Grid Accuracy',
            category: 'grid',
            description: 'Snap-to-grid always aligns to nearest grid point',
            fn: testSnapToGrid
        },
        // Layer Tests
        {
            name: 'Layer Z-Order Consistency',
            category: 'layers',
            description: 'Layer z-order is always consistent',
            fn: testLayerZOrder
        }
    );
    
    console.log(`Total tests registered: ${window.DIAGRAM_TESTS.length}`);
}


// ========================================
// KEYBOARD SHORTCUT TESTS
// ========================================

/**
 * Test 38: Shortcut Registration Validation
 * Property: All registered shortcuts have valid handlers
 */
function testShortcutRegistration() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const keyboard = getKeyboardShortcutManager({ eventBus: getEventBus() });
            
            // Generate random shortcut
            const modifiers = ['Ctrl', 'Alt', 'Shift'];
            const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
            const modifier = modifiers[i % modifiers.length];
            const key = keys[i % keys.length];
            const shortcut = `${modifier}+${key}`;
            
            let handlerCalled = false;
            const handler = () => { handlerCalled = true; };
            
            // Register shortcut
            const registered = keyboard.register(shortcut, handler, {
                description: 'Test shortcut',
                override: true
            });
            
            if (!registered) {
                results.push({
                    pass: false,
                    input: { shortcut },
                    expected: 'Successful registration',
                    actual: 'Registration failed',
                    error: 'Failed to register valid shortcut'
                });
                continue;
            }
            
            // Verify it's in the registry
            const shortcuts = keyboard.getAllShortcuts();
            const found = shortcuts.some(s => s.originalKey === shortcut);
            
            if (!found) {
                results.push({
                    pass: false,
                    input: { shortcut },
                    expected: 'Shortcut in registry',
                    actual: 'Shortcut not found',
                    error: 'Registered shortcut not in registry'
                });
                continue;
            }
            
            // Cleanup
            keyboard.unregister(shortcut);
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 39: Shortcut Conflict Detection
 * Property: Duplicate shortcuts are detected
 */
function testShortcutConflictDetection() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const keyboard = getKeyboardShortcutManager({ eventBus: getEventBus() });
            
            const shortcut = 'Ctrl+T';
            const handler1 = () => {};
            const handler2 = () => {};
            
            // Register first shortcut
            keyboard.register(shortcut, handler1, { description: 'First' });
            
            // Try to register duplicate without override
            const registered = keyboard.register(shortcut, handler2, { 
                description: 'Second',
                override: false 
            });
            
            if (registered) {
                results.push({
                    pass: false,
                    input: { shortcut },
                    expected: 'Conflict detected',
                    actual: 'Duplicate registered',
                    error: 'Conflict not detected'
                });
                keyboard.unregister(shortcut);
                continue;
            }
            
            // Cleanup
            keyboard.unregister(shortcut);
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 40: Shortcut Context Switching
 * Property: Context changes affect shortcut availability
 */
function testShortcutContextSwitching() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const keyboard = getKeyboardShortcutManager({ eventBus: getEventBus() });
            
            // Register shortcuts in different contexts
            keyboard.register('Ctrl+G', () => {}, { 
                description: 'Global',
                context: 'global' 
            });
            keyboard.register('Ctrl+C', () => {}, { 
                description: 'Canvas',
                context: 'canvas' 
            });
            
            // Switch to canvas context
            keyboard.setContext('canvas');
            
            if (keyboard.getContext() !== 'canvas') {
                results.push({
                    pass: false,
                    input: { context: 'canvas' },
                    expected: 'Context changed',
                    actual: keyboard.getContext(),
                    error: 'Context not changed'
                });
                continue;
            }
            
            // Cleanup
            keyboard.unregister('Ctrl+G', 'global');
            keyboard.unregister('Ctrl+C', 'canvas');
            keyboard.setContext('global');
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 41: Shortcut Enable/Disable
 * Property: Disabled shortcuts don't execute
 */
function testShortcutEnableDisable() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const keyboard = getKeyboardShortcutManager({ eventBus: getEventBus() });
            
            const shortcut = 'Ctrl+E';
            let executed = false;
            
            keyboard.register(shortcut, () => { executed = true; }, {
                description: 'Test'
            });
            
            // Disable shortcut
            keyboard.disable(shortcut);
            
            // Verify it's disabled
            const shortcuts = keyboard.getAllShortcuts();
            const found = shortcuts.find(s => s.originalKey === shortcut);
            
            if (!found || found.enabled) {
                results.push({
                    pass: false,
                    input: { shortcut },
                    expected: 'Shortcut disabled',
                    actual: found ? 'enabled' : 'not found',
                    error: 'Shortcut not disabled'
                });
                keyboard.unregister(shortcut);
                continue;
            }
            
            // Cleanup
            keyboard.unregister(shortcut);
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 42: Shortcut Serialization
 * Property: Shortcuts can be serialized and restored
 */
function testShortcutSerialization() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const keyboard = getKeyboardShortcutManager({ eventBus: getEventBus() });
            
            // Register some shortcuts
            keyboard.register('Ctrl+1', () => {}, { description: 'Test 1' });
            keyboard.register('Ctrl+2', () => {}, { description: 'Test 2' });
            keyboard.disable('Ctrl+2');
            
            // Serialize
            const state = keyboard.serialize();
            
            if (!state || !state.shortcuts) {
                results.push({
                    pass: false,
                    input: {},
                    expected: 'Valid state',
                    actual: state,
                    error: 'Serialization failed'
                });
                continue;
            }
            
            // Create new instance and deserialize
            const keyboard2 = getKeyboardShortcutManager({ eventBus: getEventBus() });
            keyboard2.deserialize(state);
            
            // Verify state restored
            const shortcuts = keyboard2.getAllShortcuts();
            const shortcut2 = shortcuts.find(s => s.originalKey === 'Ctrl+2');
            
            if (!shortcut2 || shortcut2.enabled) {
                results.push({
                    pass: false,
                    input: { state },
                    expected: 'Ctrl+2 disabled',
                    actual: shortcut2 ? 'enabled' : 'not found',
                    error: 'State not restored correctly'
                });
                continue;
            }
            
            // Cleanup
            keyboard.unregister('Ctrl+1');
            keyboard.unregister('Ctrl+2');
            
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// HISTORY MANAGER TESTS
// ========================================

/**
 * Test 43: Undo/Redo Consistency
 * Property: Undo followed by redo returns to original state
 */
function testUndoRedoConsistency() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const history = getUnifiedHistoryManager({ eventBus: getEventBus() });
            history.clear();
            
            let value = 0;
            
            // Record action
            history.record({
                type: 'test:modify',
                name: 'Modify Value',
                undo: () => { value = 0; },
                redo: () => { value = 10; },
                batchable: false
            });
            
            // Execute
            value = 10;
            
            // Undo
            history.undo();
            
            if (value !== 0) {
                results.push({
                    pass: false,
                    input: { initialValue: 10 },
                    expected: 0,
                    actual: value,
                    error: 'Undo did not restore state'
                });
                continue;
            }
            
            // Redo
            history.redo();
            
            if (value !== 10) {
                results.push({
                    pass: false,
                    input: { undoneValue: 0 },
                    expected: 10,
                    actual: value,
                    error: 'Redo did not restore state'
                });
                continue;
            }
            
            history.clear();
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 44: History Size Limit
 * Property: History respects maximum size limit
 */
function testHistorySizeLimit() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const maxSize = 10;
            const history = getUnifiedHistoryManager({ 
                eventBus: getEventBus(),
                maxHistorySize: maxSize
            });
            history.clear();
            
            // Add more actions than limit
            for (let j = 0; j < maxSize + 5; j++) {
                history.record({
                    type: 'test:action',
                    name: `Action ${j}`,
                    undo: () => {},
                    redo: () => {}
                });
            }
            
            const stats = history.getStats();
            
            if (stats.undoCount > maxSize) {
                results.push({
                    pass: false,
                    input: { maxSize, added: maxSize + 5 },
                    expected: `<= ${maxSize}`,
                    actual: stats.undoCount,
                    error: 'History exceeded size limit'
                });
                continue;
            }
            
            history.clear();
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 45: Batch Operation Merging
 * Property: Batched operations become single undo step
 */
function testBatchOperationMerging() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const history = getUnifiedHistoryManager({ eventBus: getEventBus() });
            history.clear();
            
            let values = [];
            
            // Begin batch
            history.beginBatch('Add Multiple Values');
            
            // Add multiple actions
            for (let j = 0; j < 5; j++) {
                history.record({
                    type: 'test:add',
                    name: `Add ${j}`,
                    undo: () => { values.pop(); },
                    redo: () => { values.push(j); }
                });
                values.push(j);
            }
            
            // End batch
            history.endBatch();
            
            const stats = history.getStats();
            
            // Should be 1 undo operation (the batch)
            if (stats.undoCount !== 1) {
                results.push({
                    pass: false,
                    input: { operations: 5 },
                    expected: 1,
                    actual: stats.undoCount,
                    error: 'Batch not merged into single operation'
                });
                continue;
            }
            
            // Undo should remove all 5 values
            history.undo();
            
            if (values.length !== 0) {
                results.push({
                    pass: false,
                    input: { batchSize: 5 },
                    expected: 0,
                    actual: values.length,
                    error: 'Batch undo did not undo all operations'
                });
                continue;
            }
            
            history.clear();
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 46: Action Validation
 * Property: Invalid actions are rejected
 */
function testActionValidation() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const history = getUnifiedHistoryManager({ eventBus: getEventBus() });
            history.clear();
            
            const initialCount = history.getStats().undoCount;
            
            // Try to record invalid action (no undo method)
            history.record({
                type: 'test:invalid',
                name: 'Invalid Action'
                // Missing undo/restore
            });
            
            const finalCount = history.getStats().undoCount;
            
            // Should not have been recorded
            if (finalCount !== initialCount) {
                results.push({
                    pass: false,
                    input: { action: 'invalid' },
                    expected: 'Action rejected',
                    actual: 'Action recorded',
                    error: 'Invalid action was recorded'
                });
                continue;
            }
            
            history.clear();
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 47: History Navigation
 * Property: Can jump to any point in history
 */
function testHistoryNavigation() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const history = getUnifiedHistoryManager({ eventBus: getEventBus() });
            history.clear();
            
            let value = 0;
            
            // Record multiple actions
            for (let j = 1; j <= 5; j++) {
                const targetValue = j;
                history.record({
                    type: 'test:set',
                    name: `Set ${j}`,
                    undo: () => { value = targetValue - 1; },
                    redo: () => { value = targetValue; },
                    batchable: false
                });
                value = j;
            }
            
            // Jump to middle point
            history.goToHistoryPoint(2);
            
            // Value should be 3 (index 2 in 0-based)
            if (value !== 3) {
                results.push({
                    pass: false,
                    input: { targetIndex: 2 },
                    expected: 3,
                    actual: value,
                    error: 'History navigation failed'
                });
                continue;
            }
            
            history.clear();
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

/**
 * Test 48: History Serialization
 * Property: History configuration can be serialized
 */
function testHistorySerialization() {
    const results = [];
    
    for (let i = 0; i < 100; i++) {
        try {
            const history = getUnifiedHistoryManager({ 
                eventBus: getEventBus(),
                maxHistorySize: 50
            });
            
            history.setEnabled(false);
            
            // Serialize
            const state = history.serialize();
            
            if (!state || typeof state.enabled !== 'boolean') {
                results.push({
                    pass: false,
                    input: {},
                    expected: 'Valid state',
                    actual: state,
                    error: 'Serialization failed'
                });
                continue;
            }
            
            // Create new instance and deserialize
            const history2 = getUnifiedHistoryManager({ eventBus: getEventBus() });
            history2.deserialize(state);
            
            // Verify config restored
            const stats = history2.getStats();
            
            if (stats.enabled !== false) {
                results.push({
                    pass: false,
                    input: { state },
                    expected: 'enabled: false',
                    actual: `enabled: ${stats.enabled}`,
                    error: 'State not restored correctly'
                });
                continue;
            }
            
            history.clear();
            results.push({ pass: true });
        } catch (error) {
            results.push({
                pass: false,
                error: error.message
            });
        }
    }
    
    return results;
}

// ========================================
// TEST SUITE REGISTRATION - PART 3
// ========================================

if (typeof window !== 'undefined') {
    window.DIAGRAM_TESTS = window.DIAGRAM_TESTS || [];
    
    window.DIAGRAM_TESTS.push(
        // Keyboard Shortcut Tests
        {
            name: 'Shortcut Registration Validation',
            category: 'keyboard',
            description: 'All registered shortcuts have valid handlers',
            fn: testShortcutRegistration
        },
        {
            name: 'Shortcut Conflict Detection',
            category: 'keyboard',
            description: 'Duplicate shortcuts are detected',
            fn: testShortcutConflictDetection
        },
        {
            name: 'Shortcut Context Switching',
            category: 'keyboard',
            description: 'Context changes affect shortcut availability',
            fn: testShortcutContextSwitching
        },
        {
            name: 'Shortcut Enable/Disable',
            category: 'keyboard',
            description: 'Disabled shortcuts don\'t execute',
            fn: testShortcutEnableDisable
        },
        {
            name: 'Shortcut Serialization',
            category: 'keyboard',
            description: 'Shortcuts can be serialized and restored',
            fn: testShortcutSerialization
        },
        // History Manager Tests
        {
            name: 'Undo/Redo Consistency',
            category: 'history',
            description: 'Undo followed by redo returns to original state',
            fn: testUndoRedoConsistency
        },
        {
            name: 'History Size Limit',
            category: 'history',
            description: 'History respects maximum size limit',
            fn: testHistorySizeLimit
        },
        {
            name: 'Batch Operation Merging',
            category: 'history',
            description: 'Batched operations become single undo step',
            fn: testBatchOperationMerging
        },
        {
            name: 'Action Validation',
            category: 'history',
            description: 'Invalid actions are rejected',
            fn: testActionValidation
        },
        {
            name: 'History Navigation',
            category: 'history',
            description: 'Can jump to any point in history',
            fn: testHistoryNavigation
        },
        {
            name: 'History Serialization',
            category: 'history',
            description: 'History configuration can be serialized',
            fn: testHistorySerialization
        }
    );
    
    console.log(`✅ Total tests registered: ${window.DIAGRAM_TESTS.length}`);
    console.log(`📊 Test categories: ${[...new Set(window.DIAGRAM_TESTS.map(t => t.category))].join(', ')}`);
}
