//sets the velocities at the boundary cells

precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_velocityTexture;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

const int MAX_OBSTACLES = 8;
uniform int u_obstacleCount;
uniform vec3 u_obstacleMin[MAX_OBSTACLES];
uniform vec3 u_obstacleMax[MAX_OBSTACLES];

void main () {
    vec3 velocity = texture2D(u_velocityTexture, v_coordinates).rgb;
    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution + 1.0));
    
    // Convert cell index to world position
    vec3 worldPos = (cellIndex / u_gridResolution) * u_gridSize;

    // Sponge layer near +X to absorb outgoing energy and reduce reflections.
    // This is a "relaxation zone" rather than a hard kill at the boundary.
    const float SPONGE_WIDTH = 6.0;     // world units
    const float SPONGE_STRENGTH = 0.6;  // fraction of velocity removed at the boundary end (0..1)
    float spongeT = clamp((worldPos.x - (u_gridSize.x - SPONGE_WIDTH)) / SPONGE_WIDTH, 0.0, 1.0);
    float spongeFactor = 1.0 - SPONGE_STRENGTH * spongeT;
    velocity *= spongeFactor;

    // Grid boundary enforcement
    if (cellIndex.x < 0.5) {
        velocity.x = 0.0;
    }

    if (cellIndex.x > u_gridResolution.x - 0.5) {
        // Open +X boundary: allow outflow but prevent inflow (reduces backwash).
        velocity.x = max(velocity.x, 0.0);
    }

    if (cellIndex.y < 0.5) {
        velocity.y = 0.0;
    }

    if (cellIndex.y > u_gridResolution.y - 0.5) {
        velocity.y = min(velocity.y, 0.0);
    }

    if (cellIndex.z < 0.5) {
        velocity.z = 0.0;
    }

    if (cellIndex.z > u_gridResolution.z - 0.5) {
        velocity.z = 0.0;
    }

    // Obstacle boundary enforcement (supports multiple obstacles)
    // For staggered MAC grid:
    // x velocity is stored at [i, j+0.5, k+0.5] in grid space
    // y velocity is stored at [i+0.5, j, k+0.5] in grid space
    // z velocity is stored at [i+0.5, j+0.5, k] in grid space
    float cellSizeX = u_gridSize.x / u_gridResolution.x;
    float cellSizeY = u_gridSize.y / u_gridResolution.y;
    float cellSizeZ = u_gridSize.z / u_gridResolution.z;

    vec3 xVelWorldPos = vec3(
        (cellIndex.x / u_gridResolution.x) * u_gridSize.x,
        ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
        ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
    );

    vec3 yVelWorldPos = vec3(
        ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
        (cellIndex.y / u_gridResolution.y) * u_gridSize.y,
        ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
    );

    vec3 zVelWorldPos = vec3(
        ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
        ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
        (cellIndex.z / u_gridResolution.z) * u_gridSize.z
    );

    for (int i = 0; i < MAX_OBSTACLES; ++i) {
        if (i >= u_obstacleCount) break;
        vec3 omin = u_obstacleMin[i];
        vec3 omax = u_obstacleMax[i];

        // Zero samples inside solid volume (prevents interpolation leaks near corners)
        if (xVelWorldPos.x >= omin.x && xVelWorldPos.x <= omax.x &&
            xVelWorldPos.y >= omin.y && xVelWorldPos.y <= omax.y &&
            xVelWorldPos.z >= omin.z && xVelWorldPos.z <= omax.z) {
            velocity.x = 0.0;
        }
        if (yVelWorldPos.x >= omin.x && yVelWorldPos.x <= omax.x &&
            yVelWorldPos.y >= omin.y && yVelWorldPos.y <= omax.y &&
            yVelWorldPos.z >= omin.z && yVelWorldPos.z <= omax.z) {
            velocity.y = 0.0;
        }
        if (zVelWorldPos.x >= omin.x && zVelWorldPos.x <= omax.x &&
            zVelWorldPos.y >= omin.y && zVelWorldPos.y <= omax.y &&
            zVelWorldPos.z >= omin.z && zVelWorldPos.z <= omax.z) {
            velocity.z = 0.0;
        }

        // Boundary checks (no-penetration near obstacle faces)
        if (xVelWorldPos.x >= omin.x - cellSizeX * 0.5 && xVelWorldPos.x <= omax.x + cellSizeX * 0.5 &&
            xVelWorldPos.y >= omin.y && xVelWorldPos.y <= omax.y &&
            xVelWorldPos.z >= omin.z && xVelWorldPos.z <= omax.z) {
            if (xVelWorldPos.x <= omin.x + cellSizeX * 0.5 || xVelWorldPos.x >= omax.x - cellSizeX * 0.5) {
                velocity.x = 0.0;
            }
        }
        if (yVelWorldPos.x >= omin.x && yVelWorldPos.x <= omax.x &&
            yVelWorldPos.y >= omin.y - cellSizeY * 0.5 && yVelWorldPos.y <= omax.y + cellSizeY * 0.5 &&
            yVelWorldPos.z >= omin.z && yVelWorldPos.z <= omax.z) {
            if (yVelWorldPos.y <= omin.y + cellSizeY * 0.5 || yVelWorldPos.y >= omax.y - cellSizeY * 0.5) {
                velocity.y = 0.0;
            }
        }
        if (zVelWorldPos.x >= omin.x && zVelWorldPos.x <= omax.x &&
            zVelWorldPos.y >= omin.y && zVelWorldPos.y <= omax.y &&
            zVelWorldPos.z >= omin.z - cellSizeZ * 0.5 && zVelWorldPos.z <= omax.z + cellSizeZ * 0.5) {
            if (zVelWorldPos.z <= omin.z + cellSizeZ * 0.5 || zVelWorldPos.z >= omax.z - cellSizeZ * 0.5) {
                velocity.z = 0.0;
            }
        }
    }

    gl_FragColor = vec4(velocity, 0.0);
}
