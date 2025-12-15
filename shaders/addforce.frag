precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_velocityTexture;

uniform vec3 u_mouseVelocity;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform vec3 u_mouseRayOrigin;
uniform vec3 u_mouseRayDirection;

uniform float u_timeStep;

uniform int u_waveActive;
uniform float u_waveTime;
uniform float u_waveDuration;
uniform float u_waveFrequency;
uniform float u_waveStrength;
uniform float u_waveWidth;
uniform float u_waveX0;

const float PI = 3.1415926535897932384626433832795;

float kernel (vec3 position, float radius) {
    vec3 worldPosition = (position / u_gridResolution) * u_gridSize;

    float distanceToMouseRay = length(cross(u_mouseRayDirection, worldPosition - u_mouseRayOrigin));

    float normalizedDistance = max(0.0, distanceToMouseRay / radius);
    return smoothstep(1.0, 0.9, normalizedDistance);
}

float waveKernel (vec3 position) {
    // position is in grid-space; convert to world-space.
    vec3 worldPosition = (position / u_gridResolution) * u_gridSize;

    // spatial localization near the left boundary
    float dx = worldPosition.x - u_waveX0;
    float xWeight = exp(-(dx * dx) / (2.0 * u_waveWidth * u_waveWidth));

    // Apply through (almost) the whole water column.
    // The prior version biased strongly toward the top of the domain, which reads like a surface "slap"
    // and doesn't build a rolling swell well.
    return xWeight;
}

void main () {
    vec3 velocity = texture2D(u_velocityTexture, v_coordinates).rgb;

    vec3 newVelocity = velocity + vec3(0.0, -40.0 * u_timeStep, 0.0); //add gravity

    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution + 1.0));
    vec3 xPosition = vec3(cellIndex.x, cellIndex.y + 0.5, cellIndex.z + 0.5);
    vec3 yPosition = vec3(cellIndex.x + 0.5, cellIndex.y, cellIndex.z + 0.5);
    vec3 zPosition = vec3(cellIndex.x + 0.5, cellIndex.y + 0.5, cellIndex.z);

    float mouseRadius = 5.0;
    vec3 kernelValues = vec3(kernel(xPosition, mouseRadius), kernel(yPosition, mouseRadius), kernel(zPosition, mouseRadius));

    newVelocity += u_mouseVelocity * kernelValues * 3.0 * smoothstep(0.0, 1.0 / 200.0, u_timeStep);

    // Wave maker: short oscillatory forcing in a thin strip near the left boundary.
    if (u_waveActive == 1) {
        float t = clamp(u_waveTime, 0.0, u_waveDuration);
        float s = clamp(t / max(u_waveDuration, 1e-6), 0.0, 1.0);

        // Single "piston" pulse: always pushes +X (good for a single swell that travels right).
        // 0 -> 1 -> 0 with zero slope at the ends (no clicks).
        float pulse = sin(PI * s);

        // smooth fade-in/out to avoid artifacts at very short durations
        float env = smoothstep(0.0, 0.08, s) * (1.0 - smoothstep(0.92, 1.0, s));

        float ax = u_waveStrength * pulse * env;        // horizontal accel (+X)
        float ay = 0.15 * u_waveStrength * pulse * env; // small upward bias to help form a crest

        vec3 waveValues = vec3(waveKernel(xPosition), waveKernel(yPosition), waveKernel(zPosition));
        newVelocity.x += ax * waveValues.x * u_timeStep;
        newVelocity.y += ay * waveValues.y * u_timeStep;
    }

    gl_FragColor = vec4(newVelocity * 1.0, 0.0);
}
