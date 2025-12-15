# Breaking Wave Simulation Workplan

## Overview
Transform the current bounded fluid particle simulation into an open-ocean breaking wave simulation similar to Pipeline (Banzai Pipeline). The simulation will feature swell generation, bathymetry (depth variation), and open boundaries that behave like an infinite ocean.

---

## Current System Analysis

### Architecture
- **Grid-based FLIP simulation**: Uses staggered MAC grid for velocity field
- **Particle-based rendering**: Particles represent fluid volume
- **Bounded domain**: Hard walls at grid boundaries (0 to GRID_WIDTH/HEIGHT/DEPTH)
- **Gravity**: Applied uniformly downward (-40.0 * timeStep in Y direction)
- **Boundary enforcement**: `enforceboundaries.frag` sets velocities to 0 at edges
- **Particle clamping**: `advect.frag` clamps particles to grid bounds

### Key Files
- `simulator.js`: Core simulation logic
- `shaders/enforceboundaries.frag`: Boundary conditions
- `shaders/addforce.frag`: Gravity and mouse interaction
- `shaders/advect.frag`: Particle advection with boundary clamping
- `fluidparticles.js`: Main application, particle initialization
- `boxeditor.js`: Box editing interface (may need modification/removal)

---

## Required Changes

### 1. SWELL GENERATION
**Problem**: Need to create wave motion that propagates across the domain.

**Solution Options**:
- **Option A (Recommended)**: Add oscillating velocity/force at one boundary (incoming waves)
  - Modify `addforce.frag` to add periodic horizontal velocity based on position and time
  - Use sine/cosine waves: `velocity.x += amplitude * sin(frequency * time + waveNumber * position.z)`
  - This creates traveling waves from one side

- **Option B**: Initialize particles with wave-like displacement
  - Modify particle initialization in `fluidparticles.js` to create sinusoidal surface
  - Less dynamic, but simpler

- **Option C**: Add pressure-based wave generation
  - Modify pressure solve to include wave source terms
  - More complex, more physically accurate

**Implementation**:
- Add `u_time` uniform to `addforce.frag`
- Add wave parameters: `u_waveAmplitude`, `u_waveFrequency`, `u_waveNumber`, `u_waveDirection`
- Calculate wave velocity contribution based on position
- Pass time from `simulator.js` to shader

**Files to Modify**:
- `simulator.js`: Add time tracking, pass to shader
- `shaders/addforce.frag`: Add wave generation code
- `fluidparticles.js`: Add UI controls for wave parameters

---

### 2. BATHYMETRY (Depth Variation)
**Problem**: Need shallow obstacle on bottom to create breaking wave effect (like Pipeline reef).

**Solution**:
- Add depth field that varies with position
- Modify gravity/forces to account for depth
- Particles should "feel" the bottom when depth is shallow
- Create a reef-like obstacle: deep water → sudden shallow → deep again

**Implementation**:
- Create bathymetry texture or function: `getBathymetry(x, z) -> depth`
- Modify `addforce.frag` to:
  - Sample bathymetry at particle/grid position
  - Apply upward force when particle is below sea floor level
  - Optionally modify gravity based on depth gradient
- For Pipeline effect: create A-frame shape (deeper in middle, shallow on sides)

**Bathymetry Function** (example):
```glsl
float getBathymetry(vec3 worldPos) {
    float centerX = u_gridSize.x * 0.5;
    float centerZ = u_gridSize.z * 0.5;
    float distFromCenter = distance(worldPos.xz, vec2(centerX, centerZ));
    
    // Deep water baseline
    float baseDepth = u_gridSize.y * 0.7;
    
    // Shallow reef obstacle
    float reefWidth = 5.0;
    float reefDepth = u_gridSize.y * 0.3;
    
    if (distFromCenter < reefWidth) {
        return mix(reefDepth, baseDepth, smoothstep(0.0, reefWidth, distFromCenter));
    }
    
    return baseDepth;
}
```

**Files to Modify**:
- `shaders/addforce.frag`: Add bathymetry sampling and bottom force
- `shaders/common.frag`: Add bathymetry function (or create new shader include)
- `simulator.js`: Pass bathymetry parameters as uniforms
- `fluidparticles.js`: Add bathymetry configuration

---

### 3. OPEN BOUNDARIES (Infinite Ocean)
**Problem**: Current system has hard walls. Need open boundaries where particles can flow in/out naturally.

**Solution**:
- Remove hard boundary enforcement at edges
- Implement "open" boundary conditions:
  - **Incoming boundary** (one side): Allow flow in, generate waves
  - **Outgoing boundaries** (other sides): Allow flow out, no reflection
  - **Top boundary**: Open (particles can splash out)
  - **Bottom boundary**: Keep as solid (ocean floor)

**Implementation Strategy**:

#### 3.1 Modify Boundary Enforcement
- Change `enforceboundaries.frag` to:
  - Only enforce bottom boundary (Y = 0) as solid wall
  - Make top boundary (Y = max) open (no constraint)
  - Make X and Z boundaries open with different conditions:
    - **Incoming side** (e.g., X = 0): Allow inflow, optionally add wave velocity
    - **Outgoing sides**: Allow outflow, optionally dampen reflections

#### 3.2 Modify Particle Advection
- Change `advect.frag` line 56:
  - Remove hard clamping: `clamp(newPosition, vec3(0.01), u_gridSize - 0.01)`
  - Instead:
    - Allow particles to move beyond X and Z boundaries
    - Clamp only Y to prevent going below ocean floor
    - Implement "wrapping" or "recycling" for particles that leave domain:
      - Option A: Wrap particles around (toroidal)
      - Option B: Recycle particles from opposite side with new properties
      - Option C: Allow particles to leave and respawn at incoming boundary

#### 3.3 Particle Recycling System
- Track particles that leave the domain
- Respawn them at incoming boundary with appropriate properties
- This maintains particle count while allowing infinite ocean feel

**Files to Modify**:
- `shaders/enforceboundaries.frag`: Change boundary conditions
- `shaders/advect.frag`: Remove hard clamping, add wrapping/recycling
- `simulator.js`: Add particle recycling logic (if needed)
- `fluidparticles.js`: Update grid size concept (may need larger domain)

---

### 4. PARTICLE INITIALIZATION
**Problem**: Currently particles initialize in user-defined boxes. For waves, need ocean-like initial state.

**Solution**:
- Initialize particles in a calm ocean state:
  - Fill lower portion of domain with particles (ocean)
  - Leave upper portion empty (air)
  - Optionally add initial wave displacement

**Implementation**:
- Modify `fluidparticles.js` `startSimulation()`:
  - Remove box-based initialization
  - Create ocean volume: particles from Y=0 to Y=seaLevel
  - Sea level should be above bathymetry but below top
  - Optionally add sinusoidal displacement for initial wave

**Files to Modify**:
- `fluidparticles.js`: Change particle initialization logic
- Remove or modify box editor dependency for wave mode

---

### 5. UI/UX CHANGES
**Problem**: Current UI is designed for box editing. Need wave-specific controls.

**Solution**:
- Add wave parameter controls:
  - Wave amplitude slider
  - Wave frequency/speed slider
  - Wave direction selector
  - Bathymetry depth controls
- Remove or hide box editor for wave mode
- Add "Wave Mode" toggle

**Files to Modify**:
- `index.html`: Add wave control UI elements
- `fluidparticles.js`: Add wave mode state, connect controls
- `flip.css`: Style new controls

---

## Implementation Order

### Phase 1: Foundation
1. **Remove hard boundaries** (except bottom)
   - Modify `enforceboundaries.frag`
   - Modify `advect.frag` to allow particles beyond X/Z bounds
   - Test that particles can flow out

2. **Add basic bathymetry**
   - Create bathymetry function
   - Add bottom force in `addforce.frag`
   - Test particles interacting with shallow bottom

### Phase 2: Wave Generation
3. **Implement swell generation**
   - Add time tracking in `simulator.js`
   - Add wave velocity to `addforce.frag`
   - Test wave propagation

4. **Particle initialization for ocean**
   - Modify initialization to create ocean volume
   - Test calm ocean state

### Phase 3: Integration & Polish
5. **Combine swell + bathymetry**
   - Test breaking wave formation
   - Tune parameters

6. **Particle recycling**
   - Implement if needed for performance
   - Test infinite ocean feel

7. **UI updates**
   - Add wave controls
   - Remove/hide box editor for wave mode

---

## Technical Considerations

### Performance
- Particle recycling may be needed if many particles leave domain
- Consider larger grid for better wave propagation
- May need to adjust particle density for wave simulation

### Physics Accuracy
- Current FLIP method is good for fluid simulation
- Wave generation is simplified (not full Navier-Stokes wave equations)
- Bathymetry interaction is approximated (particles feel bottom, but not full hydrostatic pressure)

### Edge Cases
- Particles leaving top boundary (splashing)
- Particles getting stuck in shallow areas
- Wave reflection at boundaries (should be minimal with open boundaries)

---

## Testing Strategy

1. **Unit Tests**:
   - Test bathymetry function at various positions
   - Test boundary conditions independently
   - Test wave generation function

2. **Integration Tests**:
   - Test swell propagating across domain
   - Test breaking on shallow obstacle
   - Test particle flow through boundaries

3. **Visual Verification**:
   - Observe wave formation
   - Check for unwanted reflections
   - Verify breaking wave shape (A-frame for Pipeline)

---

## Future Enhancements (Post-MVP)

1. **Multiple wave trains**: Superposition of waves
2. **Wind effects**: Add surface wind forces
3. **Foam generation**: Visual foam at breaking point
4. **Dynamic bathymetry**: Animated or procedurally generated bottom
5. **Camera following**: Auto-follow breaking wave
6. **Wave spectrum**: Realistic ocean wave spectrum (JONSWAP, etc.)

---

## Files Summary

### Files to Modify:
- `simulator.js` - Add time tracking, wave parameters
- `shaders/enforceboundaries.frag` - Open boundary conditions
- `shaders/addforce.frag` - Wave generation, bathymetry forces
- `shaders/advect.frag` - Remove hard clamping, add wrapping
- `shaders/common.frag` - Add bathymetry function (or new include)
- `fluidparticles.js` - Particle initialization, wave mode
- `index.html` - Wave controls UI
- `flip.css` - Style updates

### Files to Create (Optional):
- `shaders/bathymetry.frag` - Bathymetry function include
- `wavemode.js` - Wave-specific logic (if separating concerns)

---

## Key Parameters to Tune

- **Wave amplitude**: Height of swell (0.5 - 3.0)
- **Wave frequency**: Speed of waves (0.1 - 2.0 Hz)
- **Wave number**: Wavelength (spatial frequency)
- **Bathymetry depth**: Shallow obstacle depth (10-30% of grid height)
- **Reef width**: Size of shallow area (3-8 units)
- **Sea level**: Initial water height (50-70% of grid height)
- **Gravity**: May need adjustment for wave physics (-40.0 currently)

---

## Notes

- The current FLIP method is well-suited for this transformation
- Open boundaries are the most complex change
- Bathymetry can be simple function initially, enhanced later
- Wave generation can start simple (sine wave) and be enhanced
- Consider making this a separate "mode" initially, keeping box mode available
