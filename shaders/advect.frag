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

const int MAX_OBSTACLES = 8;
uniform int u_obstacleCount;
uniform vec3 u_obstacleMin[MAX_OBSTACLES];
uniform vec3 u_obstacleMax[MAX_OBSTACLES];

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

    // Domain boundary handling:
    // - Keep Y/Z clamped (still a "slice" of ocean).
    // - Keep X>=0 clamped (left side is not open yet).
    // - Allow X to flow out of +X and recycle back to the left (handled later).
    newPosition.yz = clamp(newPosition.yz, vec2(0.01), (u_gridSize - 0.01).yz);
    newPosition.x = max(newPosition.x, 0.01);

    // Prevent particles from entering obstacles (supports multiple obstacles)
    for (int i = 0; i < MAX_OBSTACLES; ++i) {
        if (i >= u_obstacleCount) break;
        vec3 omin = u_obstacleMin[i];
        vec3 omax = u_obstacleMax[i];

        if (newPosition.x > omin.x && newPosition.x < omax.x &&
            newPosition.y > omin.y && newPosition.y < omax.y &&
            newPosition.z > omin.z && newPosition.z < omax.z) {

            float distToMinX = newPosition.x - omin.x;
            float distToMaxX = omax.x - newPosition.x;
            float distToMinY = newPosition.y - omin.y;
            float distToMaxY = omax.y - newPosition.y;
            float distToMinZ = newPosition.z - omin.z;
            float distToMaxZ = omax.z - newPosition.z;

            const float DOMAIN_EPS = 0.011;
            const float BIG = 1.0e9;

            if (omin.x <= DOMAIN_EPS) distToMinX = BIG;
            if (omin.y <= DOMAIN_EPS) distToMinY = BIG;
            if (omin.z <= DOMAIN_EPS) distToMinZ = BIG;

            if (omax.x >= u_gridSize.x - DOMAIN_EPS) distToMaxX = BIG;
            if (omax.y >= u_gridSize.y - DOMAIN_EPS) distToMaxY = BIG;
            if (omax.z >= u_gridSize.z - DOMAIN_EPS) distToMaxZ = BIG;

            float minDist = min(
                min(min(distToMinX, distToMaxX), min(distToMinY, distToMaxY)),
                min(distToMinZ, distToMaxZ)
            );

            const float EPSILON = 0.001;
            if (abs(minDist - distToMinX) < EPSILON) {
                newPosition.x = omin.x - 0.01;
            } else if (abs(minDist - distToMaxX) < EPSILON) {
                newPosition.x = omax.x + 0.01;
            } else if (abs(minDist - distToMinY) < EPSILON) {
                newPosition.y = omin.y - 0.01;
            } else if (abs(minDist - distToMaxY) < EPSILON) {
                newPosition.y = omax.y + 0.01;
            } else if (abs(minDist - distToMinZ) < EPSILON) {
                newPosition.z = omin.z - 0.01;
            } else {
                newPosition.z = omax.z + 0.01;
            }

            newPosition.yz = clamp(newPosition.yz, vec2(0.01), (u_gridSize - 0.01).yz);
            newPosition.x = max(newPosition.x, 0.01);
        }
    }

    // +X open boundary + recycling:
    // If a particle goes out the right side, respawn it on the left in a thin "inflow strip".
    // We flag this in .a so the velocity pass can reset its velocity (avoids energy injection).
    float recycled = 0.0;
    if (newPosition.x > u_gridSize.x - 0.01) {
        recycled = 1.0;

        // Inflow strip width in world units. Keep small so it reads as "new water entering".
        const float INFLOW_WIDTH = 1.0;
        float r = clamp(randomDirection.x * 0.5 + 0.5, 0.0, 1.0);
        newPosition.x = 0.02 + r * INFLOW_WIDTH;

        // Keep y/z (clamped) so we don't change the vertical distribution abruptly.
        newPosition.yz = clamp(newPosition.yz, vec2(0.01), (u_gridSize - 0.01).yz);
    }

    gl_FragColor = vec4(newPosition, recycled);
}
