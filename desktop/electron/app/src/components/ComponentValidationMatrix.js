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
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Keep weighted visible-spectrum sampling and optional Gaussian-beam assumptions explicit; do not imply calibrated spectral power distribution.'
    },
    PointSource: {
        category: 'source',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Keep the two-dimensional uniform angular-sampling assumption explicit; do not imply a three-dimensional radiometric model.'
    },
    LEDSource: {
        category: 'source',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Keep Gaussian spectral sampling, two-dimensional fan geometry, and unpolarized output assumptions explicit; do not imply package optics or calibrated radiometry.'
    },
    PulsedLaserSource: {
        category: 'source',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalSources.test.js'],
        next: 'Keep pulse-derived power/bandwidth semantics explicit; do not imply time-resolved propagation or chirp physics.'
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
        validation: VALIDATION_STATUS.COVERED,
        tests: ['DichroicMirror.test.js'],
        next: 'Keep sigmoid wavelength split and scalar branch-loss assumptions explicit; do not imply coating-stack or angle/polarization spectra.'
    },
    MetallicMirror: {
        category: 'mirror',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['MetallicMirror.test.js'],
        next: 'Keep the tabulated single-wavelength metal constants and simplified angle dependence explicit; do not imply coating or polarization-resolved spectra.'
    },
    RingMirror: {
        category: 'mirror',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['RingMirror.test.js'],
        next: 'Keep scalar 0.99 reflection loss and center-hole transmission assumptions explicit; do not imply coating or diffraction behavior.'
    },

    ThinLens: {
        category: 'lens',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['ThinLens.test.js', 'LensRotationInvariant.test.js', 'ThickLensSurfacePhysics.test.js', 'OpticalGoldenBaseline.test.js', 'LensImaging.test.js'],
        next: 'Thick presets use scalar two-surface Snell/Fresnel tracing; keep thin-film coating behavior, polarization-resolved Fresnel coefficients, and higher-order aberrations outside quantitative claims.'
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
        next: 'Persistence, paraxial behavior, and spherical/parabolic sag-slope reference cases are covered; do not claim full-aperture aberration accuracy or multi-surface physical tracing.'
    },
    GRINLens: {
        category: 'lens',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.PARTIAL,
        tests: ['AdvancedLenses.test.js'],
        next: 'Persistence, profile monotonicity, pitch, and bidirectional quarter-pitch paraxial transfer are covered; retain experimental status until inhomogeneous-media reference cases and external lens calibration are broader.'
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
        tests: ['VisualOnlyDetectorSemantics.test.js'],
        next: 'Define pixel accumulation model before simulation claims.'
    },
    Spectrometer: {
        category: 'detector',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: ['VisualOnlyDetectorSemantics.test.js'],
        next: 'Define spectral binning model before simulation claims.'
    },
    PowerMeter: {
        category: 'detector',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['PowerMeterSemantics.test.js'],
        next: 'Keep display units and sensor-response assumptions visible before quantitative use.'
    },
    PolarizationAnalyzer: {
        category: 'detector',
        reliability: 'paraxial_approximation',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['PolarizationAnalyzerSemantics.test.js'],
        next: 'Keep Stokes sign convention and coherent-light assumption visible for quantitative use.'
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
        validation: VALIDATION_STATUS.COVERED,
        tests: ['AOMInteractionGolden.test.js', 'BeamGraph.test.js'],
        next: 'Keep the single-order diffraction and RF-shift assumptions visible before quantitative use.'
    },

    ElectroOpticModulator: {
        category: 'modulator',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['ElectroOpticModulator.test.js'],
        next: 'Keep scalar phase/amplitude and quality assumptions explicit; do not imply crystal tensor, polarization coupling, or time-domain RF physics.'
    },
    VariableAttenuator: {
        category: 'modulator',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['VariableAttenuatorSemantics.test.js'],
        next: 'Keep its scalar neutral-density assumption explicit; do not imply polarization-dependent or spectral attenuation.'
    },
    OpticalChopper: {
        category: 'modulator',
        reliability: 'educational_visualization',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['OpticalChopper.test.js'],
        next: 'Keep discrete angular gating and time-averaged duty-cycle assumptions explicit; do not imply blade diffraction or phase-locked mechanics.'
    },

    AtomicCell: {
        category: 'atomic',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: ['AtomicCellSemantics.test.js'],
        next: 'Keep as diagram symbol until absorption/dispersion model exists.'
    },
    MagneticCoil: {
        category: 'atomic',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: ['VisualOnlyAnnotationSemantics.test.js'],
        next: 'Keep as diagram symbol until magnetic-field model exists.'
    },
    FabryPerotCavity: {
        category: 'interferometer',
        reliability: 'experimental',
        validation: VALIDATION_STATUS.COVERED,
        tests: ['FabryPerotCavity.test.js'],
        next: 'Keep scalar Airy transmission and air-cavity assumptions explicit; do not imply mode structure, mirror phase, or polarization-resolved resonance.'
    },
    CustomComponent: {
        category: 'misc',
        reliability: 'visual_only',
        validation: VALIDATION_STATUS.VISUAL_ONLY,
        tests: ['VisualOnlyAnnotationSemantics.test.js'],
        next: 'Treat as annotation/symbol unless user-defined physics is introduced.'
    }
});

export const EXPORTED_COMPONENT_TYPES = Object.freeze(Object.keys(COMPONENT_VALIDATION_MATRIX).sort());

export function getComponentValidation(type) {
    return COMPONENT_VALIDATION_MATRIX[type] || null;
}
