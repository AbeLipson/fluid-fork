precision highp float;

varying vec3 v_cubePosition;
varying float v_viewSpaceZ;

uniform mat4 u_viewMatrix;

// Tag used in `composite.frag` to color obstacles beige.
const float OBSTACLE_SPEED_TAG = 1000000.0;

void main () {
    // Determine face normal in object space (cube is axis-aligned in [0,1]).
    float eps = 0.001;
    vec3 n = vec3(0.0, 1.0, 0.0);

    if (abs(v_cubePosition.x - 0.0) < eps) n = vec3(-1.0, 0.0, 0.0);
    else if (abs(v_cubePosition.x - 1.0) < eps) n = vec3(1.0, 0.0, 0.0);
    else if (abs(v_cubePosition.y - 0.0) < eps) n = vec3(0.0, -1.0, 0.0);
    else if (abs(v_cubePosition.y - 1.0) < eps) n = vec3(0.0, 1.0, 0.0);
    else if (abs(v_cubePosition.z - 0.0) < eps) n = vec3(0.0, 0.0, -1.0);
    else if (abs(v_cubePosition.z - 1.0) < eps) n = vec3(0.0, 0.0, 1.0);

    // Transform to view space (viewMatrix is rigid; vec4(...,0) removes translation).
    vec3 viewNormal = normalize((u_viewMatrix * vec4(n, 0.0)).xyz);

    gl_FragColor = vec4(viewNormal.x, viewNormal.y, OBSTACLE_SPEED_TAG, v_viewSpaceZ);
}


