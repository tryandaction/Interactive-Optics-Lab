# Testing Documentation

## Overview

This directory contains automated tests for the Professional Optics Diagram System. The tests use property-based testing to verify system behavior across a wide range of inputs.

## Property-Based Testing

Property-based testing validates that certain properties (invariants) hold true for all possible inputs. Instead of testing specific cases, we test general properties that should always be true.

### Example Properties

- **Distance measurements are always non-negative**
- **Angle measurements are within valid range (0 to π)**
- **Thin lens equation maintains reciprocal relationship**
- **Grid snapping always produces coordinates on the grid**
- **Layer z-order is always consistent**

## Running Tests

### Browser-Based Testing

1. Open `tests/property-based/test-runner.html` in a web browser
2. Click "Run All Tests" button
3. View results with detailed error information

The test runner provides:
- Visual summary of test results
- Category filtering (Measurement, Optics, Alignment, etc.)
- Detailed error information for failed tests
- Progress tracking

### Console-Based Testing

```javascript
import { runPropertyTests } from './tests/property-based/DiagramSystemTests.js';

// Run all tests
const results = runPropertyTests();

// Check results
console.log(`Passed: ${results.passed}/${results.total}`);
console.log(`Success Rate: ${(results.passed / results.total * 100).toFixed(1)}%`);
```

### Programmatic Testing

```javascript
import { DiagramSystemTestSuite } from './tests/property-based/DiagramSystemTests.js';

const suite = new DiagramSystemTestSuite();

// Run all tests
const allResults = suite.runAll();

// Run specific category
suite.runCategory('measurement');
suite.runCategory('optics');
suite.runCategory('alignment');
```

## Test Categories

### 1. Measurement Tools (3 tests)
- Distance measurement properties
- Angle measurement properties
- Measurement symmetry

### 2. Optical Calculations (4 tests)
- Thin lens equation
- Magnification relationships
- Wavelength-frequency conversion
- Gaussian beam propagation

### 3. Grid and Alignment (3 tests)
- Snap-to-grid accuracy
- Alignment operations
- Distribution spacing

### 4. Layer Management (2 tests)
- Z-order consistency
- Opacity validation

### 5. Export System (2 tests)
- Dimension preservation
- DPI scaling

### 6. Auto-Routing (2 tests)
- Path connectivity
- Path smoothing

### 7. Styling (1 test)
- Color format validation

### 8. Annotations (1 test)
- Position bounds checking

## Test Statistics

- **Total Tests**: 18 property-based tests
- **Iterations per Test**: 100
- **Total Test Cases**: 1,800+ automatically generated
- **Coverage**: Core functionality across all major modules

## Adding New Tests

To add a new property-based test:

```javascript
this.tests.push(new PropertyTest(
    'Property description',
    (input) => {
        // Test logic
        return true; // or false
    },
    () => {
        // Input generator
        return generateRandomInput();
    }
));
```

### Test Structure

1. **Name**: Clear description of the property being tested
2. **Property Function**: Takes input and returns true/false
3. **Generator Function**: Creates random test inputs

### Example

```javascript
this.tests.push(new PropertyTest(
    'Component IDs are unique',
    (components) => {
        const ids = components.map(c => c.id);
        return new Set(ids).size === ids.length;
    },
    Generators.array(Generators.component(), 2, 10)
));
```

## Validation System

The `DiagramValidator` class provides comprehensive validation:

```javascript
import { getDiagramValidator } from '../src/diagram/validation/DiagramValidator.js';

const validator = getDiagramValidator();

// Validate entire diagram
const result = validator.validateDiagram(diagram);

if (result.hasErrors()) {
    console.error('Validation errors:', result.errors);
}

if (result.hasWarnings()) {
    console.warn('Validation warnings:', result.warnings);
}

// Validate individual components
const componentResult = validator.validateComponent(component);
const rayResult = validator.validateRay(ray);
const annotationResult = validator.validateAnnotation(annotation);
const layerResult = validator.validateLayer(layer);
```

### Validation Rules

The validator includes built-in rules for:
- Component structure (ID, type, position)
- Ray properties (endpoints, wavelength)
- Connection points (coordinates)
- Annotations (content)
- Layers (name, z-order)
- Connections (valid references)

### Custom Validation Rules

Add custom rules:

```javascript
validator.addRule('custom-rule', (item) => {
    // Validation logic
    return item.someProperty === expectedValue;
}, 'Error message if validation fails');
```

## Continuous Integration

These tests can be integrated into CI/CD pipelines:

```bash
# Run tests in headless browser (requires setup)
npm test

# Or use Node.js
node tests/property-based/DiagramSystemTests.js
```

## Test Results Interpretation

### Success Criteria
- All tests should pass 100% of iterations
- No errors or exceptions during test execution
- Validation rules should catch invalid data

### Common Failure Patterns
- **Floating-point precision**: Use epsilon comparisons for float equality
- **Edge cases**: Zero values, negative numbers, boundary conditions
- **Null/undefined**: Ensure proper handling of missing data

## Performance Considerations

- Each test runs 100 iterations by default
- Total test execution time: ~1-2 seconds
- Tests are independent and can run in parallel
- No external dependencies or network calls

## Future Enhancements

Planned additions:
- Integration tests for complete workflows
- Performance benchmarking tests
- Visual regression tests
- Accessibility compliance tests
- Cross-browser compatibility tests

## Resources

- [Property-Based Testing Guide](https://en.wikipedia.org/wiki/Property_testing)
- [Test-Driven Development](https://en.wikipedia.org/wiki/Test-driven_development)
- [Validation Patterns](https://martinfowler.com/articles/practical-test-pyramid.html)

## Support

For issues or questions about testing:
1. Check test output for detailed error messages
2. Review validation rules in `DiagramValidator.js`
3. Examine test generators in `DiagramSystemTests.js`
4. Open an issue with test failure details
