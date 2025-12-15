precision highp float;

attribute vec3 a_cubeVertexPosition;

uniform vec3 u_translation;
uniform vec3 u_scale;

uniform mat4 u_viewMatrix;
uniform mat4 u_projectionMatrix;

varying vec3 v_cubePosition;
varying float v_viewSpaceZ;

void main () {
    v_cubePosition = a_cubeVertexPosition;

    vec3 worldPos = a_cubeVertexPosition * u_scale + u_translation;
    vec4 viewPos = u_viewMatrix * vec4(worldPos, 1.0);
    v_viewSpaceZ = viewPos.z;

    gl_Position = u_projectionMatrix * viewPos;
}


