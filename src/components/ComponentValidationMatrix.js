/**
 * ComponentValidationMatrix.js - machine-readable validation status for exported components.
 *
 * This matrix is intentionally conservative. It tracks what the project can
 * claim, what is tested, and what should be upgraded next.
 */

export const VALIDATION_STATUS = Object.freeze({
    COVERED: 'covered',
    PARTIAL: 'partial',
    SMOKE_ONLY: 'smoke_only',
    UNVALIDATED: 'unvalidated',
    VISUAL_ONLY: 'visual_only'
});

export const COMPONENT_VALIDATION_MATRIX = Object.freeze({
    LaserSource: {
        category: 'source',
        reliability: 'exact_geometric',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Add browser smoke assertions for source inspector properties.'
    },
    FanSource: {
        category: 'source',
        reliability: 'exact_geometric',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Add angular density and edge-angle regression tests.'
    },
    LineSource: {
        category: 'source',
        reliability: 'exact_geometric',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Add tests for rotated line emission sampling.'
    },
    WhiteLightSource: {
        category: 'source',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.PARTIAL,
        tests: ['OpticalSources.test.js'],
        next: 'Validate multi-wavelength spread and color export behavior.'
    },
    PointSource: {
        category: 'source',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add emission count, angular spread, and intensity distribution tests.'
    },
    LEDSource: {
        category: 'source',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Define LED angular model and add golden sampling tests.'
    },
    PulsedLaserSource: {
        category: 'source',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Define pulse semantics and add intensity/time behavior tests.'
    },

    Mirror: {
        category: 'mirror',
        reliability: 'exact_geometric',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['Mirror.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Add browser hit-point overlay smoke coverage.'
    },
    SphericalMirror: {
        category: 'mirror',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['CurvedMirrors.test.js'],
        next: 'Add sign-convention and off-axis regression cases.'
    },
    ParabolicMirror: {
        category: 'mirror',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['CurvedMirrors.test.js'],
        next: 'Add non-parallel incident ray regression cases.'
    },
    DichroicMirror: {
        category: 'mirror',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Define wavelength split model and add energy tests.'
    },
    MetallicMirror: {
        category: 'mirror',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Define loss and phase assumptions before quantitative use.'
    },
    RingMirror: {
        category: 'mirror',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add aperture/ring hit-region tests.'
    },

    ThinLens: {
        category: 'lens',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['ThinLens.test.js', 'OpticalGoldenBaseline.test.js', 'LensImaging.test.js'],
        next: 'Keep advanced thick-lens presets clearly marked as non-validated.'
    },
    CylindricalLens: {
        category: 'lens',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['AdvancedLenses.test.js'],
        next: 'Add axis-rotation and off-axis sign tests.'
    },
    AsphericLens: {
        category: 'lens',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.PARTIAL,
        tests: ['AdvancedLenses.test.js'],
        next: 'Do not claim aberration accuracy until surface model tests exist.'
    },
    GRINLens: {
        category: 'lens',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.PARTIAL,
        tests: ['AdvancedLenses.test.js'],
        next: 'Add GRIN profile and pitch validation against reference cases.'
    },

    Polarizer: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['Polarizer.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Add finite extinction-ratio option only after tests.'
    },
    BeamSplitter: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['BeamSplitter.test.js', 'PBS.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Add coating/angle limitation display in inspector.'
    },
    WavePlate: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['WavePlate.test.js', 'PolarizationSpecials.test.js'],
        next: 'Add arbitrary retardance regression tests.'
    },
    HalfWavePlate: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['WavePlate.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Keep ideal Jones assumption visible.'
    },
    QuarterWavePlate: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['WavePlate.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Add handedness convention documentation.'
    },
    FaradayRotator: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['PolarizationSpecials.test.js'],
        next: 'Document non-reciprocal convention and add reverse-path tests.'
    },
    FaradayIsolator: {
        category: 'polarization',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['PolarizationSpecials.test.js'],
        next: 'Add partial leakage and extinction assumptions if modeled.'
    },
    WollastonPrism: {
        category: 'polarization',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['PolarizationSpecials.test.js'],
        next: 'Add birefringence axis and angular-separation limits.'
    },

    Screen: {
        category: 'detector',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['ScreenPhotodiode.test.js'],
        next: 'Add browser display accumulation smoke coverage.'
    },
    Photodiode: {
        category: 'detector',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['ScreenPhotodiode.test.js'],
        next: 'Add saturation/noise only as explicitly visualized assumptions.'
    },
    CCDCamera: {
        category: 'detector',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: [],
        next: 'Define pixel accumulation model before simulation claims.'
    },
    Spectrometer: {
        category: 'detector',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: [],
        next: 'Define spectral binning model before simulation claims.'
    },
    PowerMeter: {
        category: 'detector',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add accumulated power and reset behavior tests.'
    },
    PolarizationAnalyzer: {
        category: 'detector',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add Jones/Stokes analysis tests.'
    },

    Aperture: {
        category: 'special',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['Aperture.test.js'],
        next: 'Add diffraction visualization boundary docs.'
    },
    Prism: {
        category: 'special',
        reliability: 'exact_geometric',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['Prism.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Add second-surface exit angle golden tests.'
    },
    DiffractionGrating: {
        category: 'special',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['DiffractionGrating.test.js', 'OpticsMath.test.js'],
        next: 'Add invalid-order and wavelength-boundary tests.'
    },
    DielectricBlock: {
        category: 'special',
        reliability: 'exact_geometric',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['DielectricBlock.test.js', 'OpticalGoldenBaseline.test.js'],
        next: 'Add multi-interface energy-accounting tests.'
    },
    OpticalFiber: {
        category: 'special',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalFiber.test.js', 'OpticsMath.test.js'],
        next: 'Add mode-field and attenuation only after explicit model design.'
    },
    AcoustoOpticModulator: {
        category: 'special',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add deflection and frequency-shift assumptions before use.'
    },

    ElectroOpticModulator: {
        category: 'modulator',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Define phase/amplitude modulation model and tests.'
    },
    VariableAttenuator: {
        category: 'modulator',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add intensity-scaling and polarization assumptions.'
    },
    OpticalChopper: {
        category: 'modulator',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Define time-domain visualization semantics.'
    },

    AtomicCell: {
        category: 'atomic',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: [],
        next: 'Keep as diagram symbol until absorption/dispersion model exists.'
    },
    MagneticCoil: {
        category: 'atomic',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: [],
        next: 'Keep as diagram symbol until magnetic-field model exists.'
    },
    FabryPerotCavity: {
        category: 'interferometer',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.UNVALIDATED,
        tests: [],
        next: 'Add cavity ray geometry tests before resonance claims.'
    },
    CustomComponent: {
        category: 'misc',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: [],
        next: 'Treat as annotation/symbol unless user-defined physics is introduced.'
    }
});

export const EXPORTED_COMPONENT_TYPES = Object.freeze(Object.keys(COMPONENT_VALIDATION_MATRIX).sort());

export function getComponentValidation(type) {
    return COMPONENT_VALIDATION_MATRIX[type] || null;
}
