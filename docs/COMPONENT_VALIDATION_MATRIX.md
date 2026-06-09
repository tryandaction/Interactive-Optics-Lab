# Component Validation Matrix

This matrix defines what OpticsLab can currently claim for each exported component.

Validation status:

- `covered`: has focused unit or golden tests for the current claimed behavior.
- `partial`: has some tests, but important model boundaries remain unvalidated.
- `smoke_only`: covered only by browser or workflow smoke tests.
- `unvalidated`: exported but not yet covered by focused tests.
- `visual_only`: diagram/symbol component, not a physics model.

Reliability levels:

- `exact_geometric`: deterministic geometric optics baseline with tests.
- `paraxial_approximation`: idealized small-angle or Jones/paraxial model.
- `educational_visualization`: useful for demonstration, not quantitative claims.
- `experimental`: model exists but is not mature enough for trust.
- `visual_only`: visual diagram element only.

| Component | Category | Reliability | Validation | Tests | Next Work |
|---|---|---|---|---|---|
| AcoustoOpticModulator | special | experimental | unvalidated | - | Add deflection and frequency-shift assumptions before use. |
| Aperture | special | educational_visualization | covered | Aperture.test.js | Add diffraction visualization boundary docs. |
| AsphericLens | lens | experimental | partial | AdvancedLenses.test.js | Do not claim aberration accuracy until surface model tests exist. |
| AtomicCell | atomic | visual_only | visual_only | - | Keep as diagram symbol until absorption/dispersion model exists. |
| BeamSplitter | polarization | paraxial_approximation | covered | BeamSplitter.test.js, PBS.test.js, OpticalGoldenBaseline.test.js | Add coating/angle limitation display in inspector. |
| CCDCamera | detector | visual_only | visual_only | - | Define pixel accumulation model before simulation claims. |
| CustomComponent | misc | visual_only | visual_only | - | Treat as annotation/symbol unless user-defined physics is introduced. |
| CylindricalLens | lens | paraxial_approximation | covered | AdvancedLenses.test.js | Add axis-rotation and off-axis sign tests. |
| DichroicMirror | mirror | experimental | unvalidated | - | Define wavelength split model and add energy tests. |
| DielectricBlock | special | exact_geometric | covered | DielectricBlock.test.js, OpticalGoldenBaseline.test.js | Add multi-interface energy-accounting tests. |
| DiffractionGrating | special | educational_visualization | covered | DiffractionGrating.test.js, OpticsMath.test.js | Add invalid-order and wavelength-boundary tests. |
| ElectroOpticModulator | modulator | experimental | unvalidated | - | Define phase/amplitude modulation model and tests. |
| FabryPerotCavity | interferometer | experimental | unvalidated | - | Add cavity ray geometry tests before resonance claims. |
| FanSource | source | exact_geometric | covered | OpticalSources.test.js | Add angular density and edge-angle regression tests. |
| FaradayIsolator | polarization | paraxial_approximation | covered | PolarizationSpecials.test.js | Add partial leakage and extinction assumptions if modeled. |
| FaradayRotator | polarization | paraxial_approximation | covered | PolarizationSpecials.test.js | Document non-reciprocal convention and add reverse-path tests. |
| GRINLens | lens | experimental | partial | AdvancedLenses.test.js | Add GRIN profile and pitch validation against reference cases. |
| HalfWavePlate | polarization | paraxial_approximation | covered | WavePlate.test.js, OpticalGoldenBaseline.test.js | Keep ideal Jones assumption visible. |
| LEDSource | source | educational_visualization | unvalidated | - | Define LED angular model and add golden sampling tests. |
| LaserSource | source | exact_geometric | covered | OpticalSources.test.js | Add browser smoke assertions for source inspector properties. |
| LineSource | source | exact_geometric | covered | OpticalSources.test.js | Add tests for rotated line emission sampling. |
| MagneticCoil | atomic | visual_only | visual_only | - | Keep as diagram symbol until magnetic-field model exists. |
| MetallicMirror | mirror | experimental | unvalidated | - | Define loss and phase assumptions before quantitative use. |
| Mirror | mirror | exact_geometric | covered | Mirror.test.js, OpticalGoldenBaseline.test.js | Add browser hit-point overlay smoke coverage. |
| OpticalChopper | modulator | educational_visualization | unvalidated | - | Define time-domain visualization semantics. |
| OpticalFiber | special | experimental | covered | OpticalFiber.test.js, OpticsMath.test.js | Add mode-field and attenuation only after explicit model design. |
| ParabolicMirror | mirror | paraxial_approximation | covered | CurvedMirrors.test.js | Add non-parallel incident ray regression cases. |
| Photodiode | detector | educational_visualization | covered | ScreenPhotodiode.test.js | Add saturation/noise only as explicitly visualized assumptions. |
| PointSource | source | educational_visualization | unvalidated | - | Add emission count, angular spread, and intensity distribution tests. |
| PolarizationAnalyzer | detector | paraxial_approximation | unvalidated | - | Add Jones/Stokes analysis tests. |
| Polarizer | polarization | paraxial_approximation | covered | Polarizer.test.js, OpticalGoldenBaseline.test.js | Add finite extinction-ratio option only after tests. |
| PowerMeter | detector | educational_visualization | unvalidated | - | Add accumulated power and reset behavior tests. |
| Prism | special | exact_geometric | covered | Prism.test.js, OpticalGoldenBaseline.test.js | Add second-surface exit angle golden tests. |
| PulsedLaserSource | source | experimental | unvalidated | - | Define pulse semantics and add intensity/time behavior tests. |
| QuarterWavePlate | polarization | paraxial_approximation | covered | WavePlate.test.js, OpticalGoldenBaseline.test.js | Add handedness convention documentation. |
| RingMirror | mirror | educational_visualization | unvalidated | - | Add aperture/ring hit-region tests. |
| Screen | detector | educational_visualization | covered | ScreenPhotodiode.test.js | Add browser display accumulation smoke coverage. |
| Spectrometer | detector | visual_only | visual_only | - | Define spectral binning model before simulation claims. |
| SphericalMirror | mirror | paraxial_approximation | covered | CurvedMirrors.test.js | Add sign-convention and off-axis regression cases. |
| ThinLens | lens | paraxial_approximation | covered | ThinLens.test.js, OpticalGoldenBaseline.test.js, LensImaging.test.js | Keep advanced thick-lens presets clearly marked as non-validated. |
| VariableAttenuator | modulator | educational_visualization | unvalidated | - | Add intensity-scaling and polarization assumptions. |
| WavePlate | polarization | paraxial_approximation | covered | WavePlate.test.js, PolarizationSpecials.test.js | Add arbitrary retardance regression tests. |
| WhiteLightSource | source | educational_visualization | partial | OpticalSources.test.js | Validate multi-wavelength spread and color export behavior. |
| WollastonPrism | polarization | educational_visualization | covered | PolarizationSpecials.test.js | Add birefringence axis and angular-separation limits. |

## Policy

- New exported components must be added to `src/components/ComponentValidationMatrix.js`.
- Components with `exact_geometric` reliability must have focused tests.
- `visual_only` components must not be presented as simulation-accurate.
- Commercial or publication-quality claims must reference this matrix.
