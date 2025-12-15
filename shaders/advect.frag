//advects particle positions with second order runge kutta

varying vec2 v_coordinates;

uniform sampler2D u_positionsTexture;
uniform sampler2D u_randomsTexture;

uniform sampler2D u_velocityGrid;

uniform vec3 u_gridResolution;
uniform vec3 u_gridSize;

uniform float u_timeStep;

uniform float u_frameNumber;

uniform vec2 u_particlesResolution;

uniform int u_hasObstacle;
uniform vec3 u_obstacleMin;
uniform vec3 u_obstacleMax;

float sampleXVelocity (vec3 position) {
    vec3 cellIndex = vec3(position.x, position.y - 0.5, position.z - 0.5);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).x;
}

float sampleYVelocity (vec3 position) {
    vec3 cellIndex = vec3(position.x - 0.5, position.y, position.z - 0.5);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).y;
}

float sampleZVelocity (vec3 position) {
    vec3 cellIndex = vec3(position.x - 0.5, position.y - 0.5, position.z);
    return texture3D(u_velocityGrid, (cellIndex + 0.5) / (u_gridResolution + 1.0), u_gridResolution + 1.0).z;
}

vec3 sampleVelocity (vec3 position) {
    vec3 gridPosition = (position / u_gridSize) * u_gridResolution;
    return vec3(sampleXVelocity(gridPosition), sampleYVelocity(gridPosition), sampleZVelocity(gridPosition));
}

void main () {
    vec3 position = texture2D(u_positionsTexture, v_coordinates).rgb;
    vec3 randomDirection = texture2D(u_randomsTexture, fract(v_coordinates + u_frameNumber / u_particlesResolution)).rgb;

    vec3 velocity = sampleVelocity(position);

    vec3 halfwayPosition = position + velocity * u_timeStep * 0.5;
    vec3 halfwayVelocity = sampleVelocity(halfwayPosition);

    vec3 step = halfwayVelocity * u_timeStep;

    step += 0.05 * randomDirection * length(velocity) * u_timeStep;

    //step = clamp(step, -vec3(1.0), vec3(1.0)); //enforce CFL condition

    vec3 newPosition = position + step;

    newPosition = clamp(newPosition, vec3(0.01), u_gridSize - 0.01);

    // Prevent particles from entering obstacle
    if (u_hasObstacle == 1) {
        // If particle would be inside obstacle, push it out
        if (newPosition.x > u_obstacleMin.x && newPosition.x < u_obstacleMax.x &&
            newPosition.y > u_obstacleMin.y && newPosition.y < u_obstacleMax.y &&
            newPosition.z > u_obstacleMin.z && newPosition.z < u_obstacleMax.z) {
            
            // Find the closest face and push particle out
            float distToMinX = newPosition.x - u_obstacleMin.x;
            float distToMaxX = u_obstacleMax.x - newPosition.x;
            float distToMinY = newPosition.y - u_obstacleMin.y;
            float distToMaxY = u_obstacleMax.y - newPosition.y;
            float distToMinZ = newPosition.z - u_obstacleMin.z;
            float distToMaxZ = u_obstacleMax.z - newPosition.z;
            
            float minDist = min(min(min(distToMinX, distToMaxX), min(distToMinY, distToMaxY)), min(distToMinZ, distToMaxZ));
            
            // Push particle out to the closest face (with small epsilon for float comparison)
            const float EPSILON = 0.001;
            if (abs(minDist - distToMinX) < EPSILON) {
                newPosition.x = u_obstacleMin.x - 0.01;
            } else if (abs(minDist - distToMaxX) < EPSILON) {
                newPosition.x = u_obstacleMax.x + 0.01;
            } else if (abs(minDist - distToMinY) < EPSILON) {
                newPosition.y = u_obstacleMin.y - 0.01;
            } else if (abs(minDist - distToMaxY) < EPSILON) {
                newPosition.y = u_obstacleMax.y + 0.01;
            } else if (abs(minDist - distToMinZ) < EPSILON) {
                newPosition.z = u_obstacleMin.z - 0.01;
            } else {
                newPosition.z = u_obstacleMax.z + 0.01;
            }
        }
    }

    gl_FragColor = vec4(newPosition, 0.0);
}
