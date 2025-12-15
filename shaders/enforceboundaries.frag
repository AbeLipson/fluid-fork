//sets the velocities at the boundary cells

precision highp float;

varying vec2 v_coordinates;

uniform sampler2D u_velocityTexture;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform int u_hasObstacle;
uniform vec3 u_obstacleMin;
uniform vec3 u_obstacleMax;

void main () {
    vec3 velocity = texture2D(u_velocityTexture, v_coordinates).rgb;
    vec3 cellIndex = floor(get3DFragCoord(u_gridResolution + 1.0));
    
    // Convert cell index to world position
    vec3 worldPos = (cellIndex / u_gridResolution) * u_gridSize;

    // Grid boundary enforcement
    if (cellIndex.x < 0.5) {
        velocity.x = 0.0;
    }

    if (cellIndex.x > u_gridResolution.x - 0.5) {
        velocity.x = 0.0;
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

    // Obstacle boundary enforcement
    if (u_hasObstacle == 1) {
        // For staggered MAC grid:
        // x velocity is stored at [i, j+0.5, k+0.5] in grid space
        // y velocity is stored at [i+0.5, j, k+0.5] in grid space  
        // z velocity is stored at [i+0.5, j+0.5, k] in grid space
        
        // Convert to world space - account for staggered positions
        float cellSizeX = u_gridSize.x / u_gridResolution.x;
        float cellSizeY = u_gridSize.y / u_gridResolution.y;
        float cellSizeZ = u_gridSize.z / u_gridResolution.z;
        
        // x velocity position (at cellIndex.x, cellIndex.y+0.5, cellIndex.z+0.5)
        vec3 xVelWorldPos = vec3(
            (cellIndex.x / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
        );
        
        // Check if x velocity is at obstacle boundary
        if (xVelWorldPos.x >= u_obstacleMin.x - cellSizeX * 0.5 && xVelWorldPos.x <= u_obstacleMax.x + cellSizeX * 0.5 &&
            xVelWorldPos.y >= u_obstacleMin.y && xVelWorldPos.y <= u_obstacleMax.y &&
            xVelWorldPos.z >= u_obstacleMin.z && xVelWorldPos.z <= u_obstacleMax.z) {
            // At or inside obstacle boundary, set x velocity to 0
            if (xVelWorldPos.x <= u_obstacleMin.x + cellSizeX * 0.5 || xVelWorldPos.x >= u_obstacleMax.x - cellSizeX * 0.5) {
                velocity.x = 0.0;
            }
        }
        
        // y velocity position (at cellIndex.x+0.5, cellIndex.y, cellIndex.z+0.5)
        vec3 yVelWorldPos = vec3(
            ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
            (cellIndex.y / u_gridResolution.y) * u_gridSize.y,
            ((cellIndex.z + 0.5) / u_gridResolution.z) * u_gridSize.z
        );
        
        // Check if y velocity is at obstacle boundary
        if (yVelWorldPos.x >= u_obstacleMin.x && yVelWorldPos.x <= u_obstacleMax.x &&
            yVelWorldPos.y >= u_obstacleMin.y - cellSizeY * 0.5 && yVelWorldPos.y <= u_obstacleMax.y + cellSizeY * 0.5 &&
            yVelWorldPos.z >= u_obstacleMin.z && yVelWorldPos.z <= u_obstacleMax.z) {
            if (yVelWorldPos.y <= u_obstacleMin.y + cellSizeY * 0.5 || yVelWorldPos.y >= u_obstacleMax.y - cellSizeY * 0.5) {
                velocity.y = 0.0;
            }
        }
        
        // z velocity position (at cellIndex.x+0.5, cellIndex.y+0.5, cellIndex.z)
        vec3 zVelWorldPos = vec3(
            ((cellIndex.x + 0.5) / u_gridResolution.x) * u_gridSize.x,
            ((cellIndex.y + 0.5) / u_gridResolution.y) * u_gridSize.y,
            (cellIndex.z / u_gridResolution.z) * u_gridSize.z
        );
        
        // Check if z velocity is at obstacle boundary
        if (zVelWorldPos.x >= u_obstacleMin.x && zVelWorldPos.x <= u_obstacleMax.x &&
            zVelWorldPos.y >= u_obstacleMin.y && zVelWorldPos.y <= u_obstacleMax.y &&
            zVelWorldPos.z >= u_obstacleMin.z - cellSizeZ * 0.5 && zVelWorldPos.z <= u_obstacleMax.z + cellSizeZ * 0.5) {
            if (zVelWorldPos.z <= u_obstacleMin.z + cellSizeZ * 0.5 || zVelWorldPos.z >= u_obstacleMax.z - cellSizeZ * 0.5) {
                velocity.z = 0.0;
            }
        }
    }

    gl_FragColor = vec4(velocity, 0.0);
}
