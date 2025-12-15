precision highp float;

varying vec2 v_coordinates;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform sampler2D u_pressureTexture;
uniform sampler2D u_divergenceTexture;
uniform sampler2D u_markerTexture;

const int MAX_OBSTACLES = 8;
uniform int u_obstacleCount;
uniform vec3 u_obstacleMin[MAX_OBSTACLES];
uniform vec3 u_obstacleMax[MAX_OBSTACLES];

bool isInsideObstacleWorld(vec3 worldPos) {
    for (int i = 0; i < MAX_OBSTACLES; ++i) {
        if (i >= u_obstacleCount) break;
        vec3 omin = u_obstacleMin[i];
        vec3 omax = u_obstacleMax[i];
        if (worldPos.x >= omin.x && worldPos.x <= omax.x &&
            worldPos.y >= omin.y && worldPos.y <= omax.y &&
            worldPos.z >= omin.z && worldPos.z <= omax.z) {
            return true;
        }
    }
    return false;
}

bool isSolidCellIndex(vec3 cellIndex) {
    vec3 centerWorld = ((cellIndex + 0.5) / u_gridResolution) * u_gridSize;
    return isInsideObstacleWorld(centerWorld);
}

void main () {
    vec3 centerCoords = get3DFragCoord(u_gridResolution) / u_gridResolution;
    vec3 centerCellIndex = floor(get3DFragCoord(u_gridResolution));

    //pressure = 0 in air cells
    float fluidCell = texture3DNearest(u_markerTexture, centerCoords, u_gridResolution).x;
    if (fluidCell == 0.0) discard; //if this is an air cell

    // No pressure solve inside solids.
    if (u_obstacleCount > 0 && isSolidCellIndex(centerCellIndex)) discard;

    vec3 delta = 1.0 / u_gridResolution;

    float divergenceCenter = texture3DNearest(u_divergenceTexture, centerCoords, u_gridResolution).r;

    float centerPressure = texture3DNearest(u_pressureTexture, centerCoords, u_gridResolution).r;

    float left = texture3DNearest(u_pressureTexture, centerCoords + vec3(-delta.x, 0.0, 0.0), u_gridResolution).r;
    float right = texture3DNearest(u_pressureTexture, centerCoords + vec3(delta.x, 0.0, 0.0), u_gridResolution).r;
    float bottom = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, -delta.y, 0.0), u_gridResolution).r;
    float top = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, delta.y, 0.0), u_gridResolution).r;
    float back = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, 0.0, -delta.z), u_gridResolution).r;
    float front = texture3DNearest(u_pressureTexture, centerCoords + vec3(0.0, 0.0, delta.z), u_gridResolution).r;

    // Solid boundaries: Neumann-like condition by mirroring center pressure when neighbor is solid.
    if (u_obstacleCount > 0) {
        if (isSolidCellIndex(centerCellIndex + vec3(-1.0, 0.0, 0.0))) left = centerPressure;
        if (isSolidCellIndex(centerCellIndex + vec3(1.0, 0.0, 0.0))) right = centerPressure;
        if (isSolidCellIndex(centerCellIndex + vec3(0.0, -1.0, 0.0))) bottom = centerPressure;
        if (isSolidCellIndex(centerCellIndex + vec3(0.0, 1.0, 0.0))) top = centerPressure;
        if (isSolidCellIndex(centerCellIndex + vec3(0.0, 0.0, -1.0))) back = centerPressure;
        if (isSolidCellIndex(centerCellIndex + vec3(0.0, 0.0, 1.0))) front = centerPressure;
    }

    float newPressure = (left + right + bottom + top + back + front - divergenceCenter) / 6.0;


    gl_FragColor = vec4(newPressure, 0.0, 0.0, 0.0);

}
