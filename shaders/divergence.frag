precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_velocityTexture;
uniform sampler2D u_markerTexture;
uniform sampler2D u_weightTexture;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform float u_maxDensity;

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

void main () {
    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution));

    //divergence = 0 in air cells
    float fluidCell = texture3DNearest(u_markerTexture, (cellIndex + 0.5) / u_gridResolution, u_gridResolution).x;
    if (fluidCell == 0.0) discard;

    // Treat obstacle volume as SOLID: no divergence/pressure solve inside it.
    if (u_obstacleCount > 0) {
        vec3 centerWorld = ((cellIndex + 0.5) / u_gridResolution) * u_gridSize;
        if (isInsideObstacleWorld(centerWorld)) discard;
    }

    float leftX = texture3DNearest(u_velocityTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;
    float rightX = texture3DNearest(u_velocityTexture, (cellIndex + vec3(1.0, 0.0, 0.0) + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;

    float bottomY = texture3DNearest(u_velocityTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;
    float topY = texture3DNearest(u_velocityTexture, (cellIndex + vec3(0.0, 1.0, 0.0) + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;

    float backZ = texture3DNearest(u_velocityTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;
    float frontZ = texture3DNearest(u_velocityTexture, (cellIndex + vec3(0.0, 0.0, 1.0) + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;

    // If a MAC face sample lies inside the obstacle, treat that face velocity as 0.
    if (u_obstacleCount > 0) {
        vec3 leftXWorld = vec3(
            (cellIndex.x / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
        );
        vec3 rightXWorld = vec3(
            ((cellIndex.x + 1.0) / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
        );
        vec3 bottomYWorld = vec3(
            ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
            (cellIndex.y / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
        );
        vec3 topYWorld = vec3(
            ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 1.0) / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
        );
        vec3 backZWorld = vec3(
            ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
            (cellIndex.z / u_gridResolution.z) * u_gridSize.z
        );
        vec3 frontZWorld = vec3(
            ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 1.0) / u_gridResolution.z) * u_gridSize.z
        );

        if (isInsideObstacleWorld(leftXWorld)) leftX = 0.0;
        if (isInsideObstacleWorld(rightXWorld)) rightX = 0.0;
        if (isInsideObstacleWorld(bottomYWorld)) bottomY = 0.0;
        if (isInsideObstacleWorld(topYWorld)) topY = 0.0;
        if (isInsideObstacleWorld(backZWorld)) backZ = 0.0;
        if (isInsideObstacleWorld(frontZWorld)) frontZ = 0.0;
    }

    float divergence = ((rightX - leftX) + (topY - bottomY) + (frontZ - backZ)) / 1.0;

    float density = texture3DNearest(u_weightTexture, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).a;
    divergence -= max((density - u_maxDensity) * 1.0, 0.0); //volume conservation

    gl_FragColor = vec4(divergence, 0.0, 0.0, 0.0);
}
