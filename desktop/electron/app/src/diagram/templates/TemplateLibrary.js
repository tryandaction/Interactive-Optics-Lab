/**
 * Template Library - Built-in Optical Diagram Templates
 * 
 * Provides 20+ pre-configured optical system templates
 * organized by category for quick diagram creation
 */

export const TEMPLATE_LIBRARY = {
    // ========== INTERFEROMETRY TEMPLATES ==========
    'michelson-interferometer': {
        id: 'michelson-interferometer',
        name: 'Michelson Interferometer',
        category: 'interferometry',
        description: 'Classic Michelson interferometer for precision measurements',
        preview: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2NCcgaGVpZ2h0PSc0OCc+PC9zdmc+',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser Source' },
            { type: 'beamsplitter', x: 200, y: 200, label: 'BS', angle: 45 },
            { type: 'mirror', x: 200, y: 50, label: 'M1' },
            { type: 'mirror', x: 350, y: 200, label: 'M2' },
            { type: 'screen', x: 200, y: 350, label: 'Detector' }
        ],
        rays: [
            { from: 'laser', to: 'beamsplitter', color: '#FF0000' },
            { from: 'beamsplitter', to: 'mirror-1', color: '#FF0000' },
            { from: 'beamsplitter', to: 'mirror-2', color: '#FF0000' }
        ],
        parameters: {
            wavelength: 632.8,
            armLength: 150
        }
    },

    'mach-zehnder-interferometer': {
        id: 'mach-zehnder-interferometer',
        name: 'Mach-Zehnder Interferometer',
        category: 'interferometry',
        description: 'Mach-Zehnder configuration for phase measurements',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser' },
            { type: 'beamsplitter', x: 150, y: 200, label: 'BS1', angle: 45 },
            { type: 'mirror', x: 150, y: 100, label: 'M1' },
            { type: 'mirror', x: 350, y: 100, label: 'M2' },
            { type: 'beamsplitter', x: 350, y: 200, label: 'BS2', angle: 45 },
            { type: 'mirror', x: 350, y: 300, label: 'M3' },
            { type: 'mirror', x: 150, y: 300, label: 'M4' },
            { type: 'detector', x: 450, y: 200, label: 'D1' },
            { type: 'detector', x: 350, y: 400, label: 'D2' }
        ],
        parameters: {
            wavelength: 632.8,
            pathDifference: 0
        }
    },

    'fabry-perot-cavity': {
        id: 'fabry-perot-cavity',
        name: 'Fabry-Pérot Cavity',
        category: 'interferometry',
        description: 'High-finesse optical cavity for spectroscopy',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Input' },
            { type: 'mirror', x: 200, y: 200, label: 'M1 (HR)', reflectivity: 0.99 },
            { type: 'mirror', x: 400, y: 200, label: 'M2 (HR)', reflectivity: 0.99 },
            { type: 'detector', x: 500, y: 200, label: 'Transmission' }
        ],
        parameters: {
            cavityLength: 200,
            finesse: 100,
            fsr: 1.5
        }
    },

    'sagnac-interferometer': {
        id: 'sagnac-interferometer',
        name: 'Sagnac Interferometer',
        category: 'interferometry',
        description: 'Rotation-sensitive interferometer',
        components: [
            { type: 'laser', x: 200, y: 300, label: 'Laser' },
            { type: 'beamsplitter', x: 200, y: 200, label: 'BS', angle: 45 },
            { type: 'mirror', x: 100, y: 100, label: 'M1' },
            { type: 'mirror', x: 300, y: 100, label: 'M2' },
            { type: 'mirror', x: 300, y: 200, label: 'M3' },
            { type: 'detector', x: 100, y: 200, label: 'Detector' }
        ],
        parameters: {
            loopArea: 0.1,
            rotationRate: 0
        }
    },

    // ========== SPECTROSCOPY TEMPLATES ==========
    'basic-spectroscopy': {
        id: 'basic-spectroscopy',
        name: 'Basic Spectroscopy Setup',
        category: 'spectroscopy',
        description: 'Simple absorption/emission spectroscopy',
        components: [
            { type: 'light-source', x: 50, y: 200, label: 'Source' },
            { type: 'lens', x: 150, y: 200, label: 'Collimator' },
            { type: 'sample', x: 250, y: 200, label: 'Sample' },
            { type: 'lens', x: 350, y: 200, label: 'Focusing' },
            { type: 'spectrometer', x: 500, y: 200, label: 'Spectrometer' }
        ],
        parameters: {
            wavelengthRange: [400, 700],
            resolution: 1
        }
    },

    'raman-spectroscopy': {
        id: 'raman-spectroscopy',
        name: 'Raman Spectroscopy',
        category: 'spectroscopy',
        description: 'Raman scattering measurement setup',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Excitation Laser' },
            { type: 'lens', x: 150, y: 200, label: 'Objective' },
            { type: 'sample', x: 250, y: 200, label: 'Sample' },
            { type: 'filter', x: 350, y: 200, label: 'Notch Filter' },
            { type: 'lens', x: 450, y: 200, label: 'Collection' },
            { type: 'spectrometer', x: 600, y: 200, label: 'Spectrometer' }
        ],
        parameters: {
            excitationWavelength: 532,
            ramanShift: [200, 3000]
        }
    },

    'fluorescence-spectroscopy': {
        id: 'fluorescence-spectroscopy',
        name: 'Fluorescence Spectroscopy',
        category: 'spectroscopy',
        description: 'Fluorescence emission measurement',
        components: [
            { type: 'laser', x: 50, y: 150, label: 'Excitation' },
            { type: 'dichroic-mirror', x: 200, y: 200, label: 'Dichroic', angle: 45 },
            { type: 'lens', x: 200, y: 100, label: 'Objective' },
            { type: 'sample', x: 200, y: 50, label: 'Sample' },
            { type: 'filter', x: 300, y: 200, label: 'Emission Filter' },
            { type: 'detector', x: 400, y: 200, label: 'PMT/CCD' }
        ],
        parameters: {
            excitationWavelength: 488,
            emissionWavelength: 520
        }
    },

    'absorption-spectroscopy': {
        id: 'absorption-spectroscopy',
        name: 'Absorption Spectroscopy',
        category: 'spectroscopy',
        description: 'Transmission-based absorption measurement',
        components: [
            { type: 'white-light', x: 50, y: 200, label: 'Broadband Source' },
            { type: 'lens', x: 150, y: 200, label: 'Collimator' },
            { type: 'sample', x: 250, y: 200, label: 'Sample Cell' },
            { type: 'lens', x: 350, y: 200, label: 'Focusing' },
            { type: 'spectrometer', x: 500, y: 200, label: 'Spectrometer' }
        ],
        parameters: {
            pathLength: 10,
            concentration: 1
        }
    },

    // ========== IMAGING TEMPLATES ==========
    'microscope': {
        id: 'microscope',
        name: 'Optical Microscope',
        category: 'imaging',
        description: 'Basic compound microscope configuration',
        components: [
            { type: 'light-source', x: 200, y: 400, label: 'Illumination' },
            { type: 'condenser', x: 200, y: 300, label: 'Condenser' },
            { type: 'sample', x: 200, y: 200, label: 'Sample' },
            { type: 'objective', x: 200, y: 100, label: 'Objective' },
            { type: 'tube-lens', x: 200, y: 50, label: 'Tube Lens' },
            { type: 'camera', x: 200, y: 0, label: 'Camera' }
        ],
        parameters: {
            magnification: 40,
            na: 0.65,
            workingDistance: 0.6
        }
    },

    'telescope': {
        id: 'telescope',
        name: 'Refracting Telescope',
        category: 'imaging',
        description: 'Keplerian telescope design',
        components: [
            { type: 'lens', x: 100, y: 200, label: 'Objective', focalLength: 500 },
            { type: 'lens', x: 600, y: 200, label: 'Eyepiece', focalLength: 25 },
            { type: 'detector', x: 650, y: 200, label: 'Eye/Camera' }
        ],
        parameters: {
            magnification: 20,
            aperture: 100
        }
    },

    'camera-lens': {
        id: 'camera-lens',
        name: 'Camera Lens System',
        category: 'imaging',
        description: 'Multi-element camera lens',
        components: [
            { type: 'lens', x: 100, y: 200, label: 'Front Element' },
            { type: 'aperture', x: 200, y: 200, label: 'Aperture Stop' },
            { type: 'lens', x: 300, y: 200, label: 'Rear Element' },
            { type: 'sensor', x: 400, y: 200, label: 'Image Sensor' }
        ],
        parameters: {
            focalLength: 50,
            fNumber: 1.8,
            sensorSize: 36
        }
    },

    'projector': {
        id: 'projector',
        name: 'Optical Projector',
        category: 'imaging',
        description: 'Image projection system',
        components: [
            { type: 'lamp', x: 50, y: 200, label: 'Light Source' },
            { type: 'condenser', x: 150, y: 200, label: 'Condenser' },
            { type: 'lcd', x: 250, y: 200, label: 'LCD/DMD' },
            { type: 'lens', x: 350, y: 200, label: 'Projection Lens' },
            { type: 'screen', x: 600, y: 200, label: 'Screen' }
        ],
        parameters: {
            throw: 3,
            brightness: 3000
        }
    },

    // ========== LASER SYSTEMS ==========
    'laser-cavity': {
        id: 'laser-cavity',
        name: 'Laser Cavity',
        category: 'laser-systems',
        description: 'Basic laser resonator',
        components: [
            { type: 'mirror', x: 100, y: 200, label: 'HR Mirror', reflectivity: 0.999 },
            { type: 'gain-medium', x: 250, y: 200, label: 'Gain Medium' },
            { type: 'mirror', x: 400, y: 200, label: 'OC Mirror', reflectivity: 0.95 },
            { type: 'detector', x: 500, y: 200, label: 'Output' }
        ],
        parameters: {
            cavityLength: 300,
            gain: 1.1,
            outputCoupling: 0.05
        }
    },

    'laser-amplifier': {
        id: 'laser-amplifier',
        name: 'Laser Amplifier',
        category: 'laser-systems',
        description: 'Optical amplifier configuration',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Seed Laser' },
            { type: 'isolator', x: 150, y: 200, label: 'Isolator' },
            { type: 'gain-medium', x: 300, y: 200, label: 'Amplifier' },
            { type: 'detector', x: 450, y: 200, label: 'Output' }
        ],
        parameters: {
            seedPower: 1,
            gain: 20,
            saturationPower: 10
        }
    },

    'frequency-doubling': {
        id: 'frequency-doubling',
        name: 'Frequency Doubling (SHG)',
        category: 'laser-systems',
        description: 'Second harmonic generation setup',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Fundamental', wavelength: 1064 },
            { type: 'lens', x: 150, y: 200, label: 'Focusing' },
            { type: 'nonlinear-crystal', x: 250, y: 200, label: 'SHG Crystal' },
            { type: 'dichroic-mirror', x: 350, y: 200, label: 'Separator', angle: 45 },
            { type: 'detector', x: 350, y: 100, label: 'SHG Output', wavelength: 532 }
        ],
        parameters: {
            fundamentalWavelength: 1064,
            shgWavelength: 532,
            efficiency: 0.3
        }
    },

    // ========== FIBER OPTICS ==========
    'fiber-coupling': {
        id: 'fiber-coupling',
        name: 'Fiber Coupling',
        category: 'fiber-optics',
        description: 'Free-space to fiber coupling',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser' },
            { type: 'lens', x: 150, y: 200, label: 'Collimator' },
            { type: 'lens', x: 250, y: 200, label: 'Focusing' },
            { type: 'fiber', x: 350, y: 200, label: 'Fiber' }
        ],
        parameters: {
            couplingEfficiency: 0.8,
            fiberNA: 0.14
        }
    },

    'fiber-splitter': {
        id: 'fiber-splitter',
        name: 'Fiber Splitter',
        category: 'fiber-optics',
        description: '1x2 fiber splitter configuration',
        components: [
            { type: 'fiber', x: 50, y: 200, label: 'Input' },
            { type: 'fiber-splitter', x: 200, y: 200, label: '1x2 Splitter' },
            { type: 'fiber', x: 350, y: 150, label: 'Output 1' },
            { type: 'fiber', x: 350, y: 250, label: 'Output 2' }
        ],
        parameters: {
            splitRatio: 0.5
        }
    },

    'fiber-sensor': {
        id: 'fiber-sensor',
        name: 'Fiber Optic Sensor',
        category: 'fiber-optics',
        description: 'Interferometric fiber sensor',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Source' },
            { type: 'fiber-coupler', x: 150, y: 200, label: 'Coupler' },
            { type: 'fiber', x: 250, y: 150, label: 'Reference Arm' },
            { type: 'fiber', x: 250, y: 250, label: 'Sensing Arm' },
            { type: 'fiber-coupler', x: 350, y: 200, label: 'Combiner' },
            { type: 'detector', x: 450, y: 200, label: 'Detector' }
        ],
        parameters: {
            sensitivity: 1e-6,
            range: 1000
        }
    },

    // ========== POLARIZATION ==========
    'polarization-analysis': {
        id: 'polarization-analysis',
        name: 'Polarization Analysis',
        category: 'polarization',
        description: 'Polarization state measurement',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser' },
            { type: 'polarizer', x: 150, y: 200, label: 'Polarizer' },
            { type: 'sample', x: 250, y: 200, label: 'Sample' },
            { type: 'quarter-wave-plate', x: 350, y: 200, label: 'QWP' },
            { type: 'polarizer', x: 450, y: 200, label: 'Analyzer' },
            { type: 'detector', x: 550, y: 200, label: 'Detector' }
        ],
        parameters: {
            wavelength: 632.8
        }
    },

    'polarization-control': {
        id: 'polarization-control',
        name: 'Polarization Control',
        category: 'polarization',
        description: 'Active polarization manipulation',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Input' },
            { type: 'half-wave-plate', x: 150, y: 200, label: 'HWP' },
            { type: 'quarter-wave-plate', x: 250, y: 200, label: 'QWP' },
            { type: 'detector', x: 350, y: 200, label: 'Output' }
        ],
        parameters: {
            inputPolarization: 'linear',
            outputPolarization: 'circular'
        }
    },

    // ========== QUANTUM OPTICS ==========
    'single-photon-source': {
        id: 'single-photon-source',
        name: 'Single Photon Source',
        category: 'quantum',
        description: 'Heralded single photon generation',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Pump' },
            { type: 'nonlinear-crystal', x: 150, y: 200, label: 'SPDC Crystal' },
            { type: 'dichroic-mirror', x: 250, y: 200, label: 'Separator', angle: 45 },
            { type: 'detector', x: 250, y: 100, label: 'Signal' },
            { type: 'detector', x: 350, y: 200, label: 'Idler (Herald)' }
        ],
        parameters: {
            pumpWavelength: 405,
            signalWavelength: 810,
            idlerWavelength: 810
        }
    },

    'quantum-entanglement': {
        id: 'quantum-entanglement',
        name: 'Entangled Photon Pairs',
        category: 'quantum',
        description: 'Polarization-entangled photon generation',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Pump' },
            { type: 'nonlinear-crystal', x: 150, y: 200, label: 'Type-II SPDC' },
            { type: 'polarizing-beamsplitter', x: 250, y: 200, label: 'PBS', angle: 45 },
            { type: 'detector', x: 250, y: 100, label: 'Photon A' },
            { type: 'detector', x: 350, y: 200, label: 'Photon B' }
        ],
        parameters: {
            entanglementType: 'polarization',
            fidelity: 0.99
        }
    },

    // ========== ATOMIC PHYSICS ==========
    'magneto-optical-trap': {
        id: 'magneto-optical-trap',
        name: 'Magneto-Optical Trap (MOT)',
        category: 'atomic',
        description: 'Laser cooling and trapping setup',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Cooling Laser' },
            { type: 'beam-expander', x: 150, y: 200, label: 'Expander' },
            { type: 'polarizer', x: 250, y: 200, label: 'Circular Pol.' },
            { type: 'vacuum-chamber', x: 400, y: 200, label: 'MOT Chamber' },
            { type: 'magnetic-coils', x: 400, y: 200, label: 'B-field Coils' },
            { type: 'camera', x: 550, y: 200, label: 'Imaging' }
        ],
        parameters: {
            detuning: -2,
            magneticGradient: 10,
            atomNumber: 1e7
        }
    },

    // ========== ADVANCED PAPER-LEVEL TEMPLATES ==========
    'saturated-absorption-spectroscopy': {
        id: 'saturated-absorption-spectroscopy',
        name: 'Saturated Absorption Spectroscopy',
        category: 'spectroscopy',
        description: 'Doppler-free saturated absorption setup',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser' },
            { type: 'isolator', x: 140, y: 200, label: 'Isolator' },
            { type: 'beamsplitter', x: 220, y: 200, label: 'BS', angle: 45 },
            { type: 'lens', x: 320, y: 200, label: 'Lens' },
            { type: 'sample', x: 420, y: 200, label: 'Vapor Cell' },
            { type: 'mirror', x: 520, y: 200, label: 'Retro' },
            { type: 'detector', x: 220, y: 80, label: 'Probe PD' }
        ],
        parameters: {
            wavelength: 780,
            modulation: 'FM'
        }
    },

    'pump-probe-spectroscopy': {
        id: 'pump-probe-spectroscopy',
        name: 'Pump–Probe Spectroscopy',
        category: 'spectroscopy',
        description: 'Pump–probe timing and detection layout',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser' },
            { type: 'beamsplitter', x: 160, y: 200, label: 'BS', angle: 45 },
            { type: 'mirror', x: 160, y: 80, label: 'Delay Line' },
            { type: 'lens', x: 300, y: 200, label: 'Focus' },
            { type: 'sample', x: 420, y: 200, label: 'Sample' },
            { type: 'detector', x: 540, y: 200, label: 'Probe PD' }
        ],
        parameters: {
            delayRange: 'ps–ns'
        }
    },

    'homodyne-detection': {
        id: 'homodyne-detection',
        name: 'Balanced Homodyne Detection',
        category: 'quantum',
        description: 'Local oscillator + balanced detector',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'LO' },
            { type: 'beamsplitter', x: 200, y: 200, label: '50/50 BS', angle: 45 },
            { type: 'detector', x: 320, y: 140, label: 'PD1' },
            { type: 'detector', x: 320, y: 260, label: 'PD2' },
            { type: 'detector', x: 420, y: 200, label: 'Diff Amp' }
        ],
        parameters: {
            visibility: 0.95
        }
    },

    'ramsey-interferometer': {
        id: 'ramsey-interferometer',
        name: 'Ramsey Interferometer',
        category: 'atomic',
        description: 'Two-pulse Ramsey sequence for atomic coherence',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Laser' },
            { type: 'AOM', x: 160, y: 200, label: 'AOM' },
            { type: 'lens', x: 260, y: 200, label: 'Collimator' },
            { type: 'vacuum-chamber', x: 380, y: 200, label: 'Atoms' },
            { type: 'detector', x: 520, y: 200, label: 'Detection' }
        ],
        parameters: {
            pulseSeparation: 'us–ms'
        }
    },

    'optical-tweezer': {
        id: 'optical-tweezer',
        name: 'Optical Tweezer',
        category: 'atomic',
        description: 'Single-beam optical trap layout',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Trap Laser' },
            { type: 'beam-expander', x: 160, y: 200, label: 'Expander' },
            { type: 'lens', x: 280, y: 200, label: 'Objective' },
            { type: 'sample', x: 380, y: 200, label: 'Trap Region' },
            { type: 'camera', x: 520, y: 120, label: 'Imaging' }
        ],
        parameters: {
            wavelength: 1064
        }
    },

    'optical-lattice': {
        id: 'optical-lattice',
        name: 'Optical Lattice',
        category: 'atomic',
        description: 'Counter-propagating beams for lattice',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Lattice Laser' },
            { type: 'beamsplitter', x: 180, y: 200, label: 'BS', angle: 45 },
            { type: 'mirror', x: 320, y: 120, label: 'M1' },
            { type: 'mirror', x: 320, y: 280, label: 'M2' },
            { type: 'vacuum-chamber', x: 440, y: 200, label: 'Atoms' }
        ],
        parameters: {
            latticeSpacing: 0.5
        }
    },

    'frequency-comb': {
        id: 'frequency-comb',
        name: 'Optical Frequency Comb',
        category: 'laser-systems',
        description: 'Comb generation and stabilization overview',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Mode-locked Laser' },
            { type: 'beam-expander', x: 160, y: 200, label: 'Dispersion' },
            { type: 'filter', x: 280, y: 200, label: 'Filter' },
            { type: 'detector', x: 420, y: 200, label: 'Beat PD' },
            { type: 'detector', x: 520, y: 200, label: 'Ref Osc' }
        ],
        parameters: {
            repRate: 100,
            ceo: 20
        }
    },

    'balanced-detection': {
        id: 'balanced-detection',
        name: 'Balanced Detection',
        category: 'quantum',
        description: 'Balanced detector for noise suppression',
        components: [
            { type: 'laser', x: 50, y: 200, label: 'Signal' },
            { type: 'beamsplitter', x: 180, y: 200, label: 'BS', angle: 45 },
            { type: 'detector', x: 300, y: 140, label: 'PD1' },
            { type: 'detector', x: 300, y: 260, label: 'PD2' },
            { type: 'amplifier', x: 420, y: 200, label: 'Diff Amp' }
        ],
        parameters: {
            gain: 10
        }
    }
};

// Template categories
export const TEMPLATE_CATEGORIES = {
    'interferometry': {
        name: 'Interferometry',
        description: 'Interferometer configurations for precision measurements',
        icon: 'interferometer'
    },
    'spectroscopy': {
        name: 'Spectroscopy',
        description: 'Spectroscopic measurement setups',
        icon: 'spectrometer'
    },
    'imaging': {
        name: 'Imaging',
        description: 'Optical imaging systems',
        icon: 'camera'
    },
    'laser-systems': {
        name: 'Laser Systems',
        description: 'Laser cavities and amplifiers',
        icon: 'laser'
    },
    'fiber-optics': {
        name: 'Fiber Optics',
        description: 'Fiber optic systems and sensors',
        icon: 'fiber'
    },
    'polarization': {
        name: 'Polarization',
        description: 'Polarization control and analysis',
        icon: 'polarizer'
    },
    'quantum': {
        name: 'Quantum Optics',
        description: 'Quantum optical experiments',
        icon: 'photon'
    },
    'atomic': {
        name: 'Atomic Physics',
        description: 'Atomic and molecular optics',
        icon: 'atom'
    }
};

/**
 * Get all templates
 */
export function getAllTemplates() {
    return Object.values(TEMPLATE_LIBRARY);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category) {
    return Object.values(TEMPLATE_LIBRARY).filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id) {
    return TEMPLATE_LIBRARY[id];
}

/**
 * Search templates
 */
export function searchTemplates(query) {
    const lowerQuery = query.toLowerCase();
    return Object.values(TEMPLATE_LIBRARY).filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.description.toLowerCase().includes(lowerQuery) ||
        t.category.toLowerCase().includes(lowerQuery)
    );
}
