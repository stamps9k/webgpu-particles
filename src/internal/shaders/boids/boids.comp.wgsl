struct Uniforms {
    deltaTime   : f32,
    time        : f32,
    canvasSize  : vec2f,
    emitterPos  : vec2f,
    emitterType : f32,
    emitterP1   : f32,
    emitterP2   : f32,
    sp0         : f32,  // perception radius (px)
    sp1         : f32,  // separation radius (px)
    sp2         : f32,  // separation weight
    sp3         : f32,  // alignment weight
    sp4         : f32,  // cohesion weight
    sp5         : f32,  // max speed (px/s)
    sp6         : f32,  // max force (px/s²)
    sp7         : f32,
    sp8         : f32,
    sp9         : f32,
    sp10        : f32,
}

struct Particle {
    position : vec2f,
    velocity : vec2f,
    color    : vec4f,
    seed     : f32,
    life     : f32,
    maxLife  : f32,
    size     : f32,
}

@group(0) @binding(0) var<uniform>             uniforms     : Uniforms;
@group(0) @binding(1) var<storage, read>       particlesIn  : array<Particle>;
@group(0) @binding(2) var<storage, read_write> particlesOut : array<Particle>;

fn clampMagnitude(v: vec2f, maxMag: f32) -> vec2f {
    let mag = length(v);
    if (mag > maxMag && mag > 0.0) {
        return (v / mag) * maxMag;
    }
    return v;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let count = arrayLength(&particlesIn);
    let index = id.x;

    if (index >= count) { return; }

    var p = particlesIn[index];

    let perceptionRadius = uniforms.sp0;
    let separationRadius = uniforms.sp1;
    let separationWeight = uniforms.sp2;
    let alignmentWeight  = uniforms.sp3;
    let cohesionWeight   = uniforms.sp4;
    let maxSpeed         = uniforms.sp5;
    let maxForce         = uniforms.sp6;

    var separation      = vec2f(0.0);
    var alignment       = vec2f(0.0);
    var cohesion        = vec2f(0.0);
    var neighborCount   = 0u;
    var separationCount = 0u;

    for (var i = 0u; i < count; i++) {
        if (i == index) { continue; }

        let other = particlesIn[i];
        let diff  = p.position - other.position;
        let dist  = length(diff);

        if (dist < perceptionRadius && dist > 0.0) {
            neighborCount++;
            alignment += other.velocity;
            cohesion  += other.position;

            if (dist < separationRadius) {
                separationCount++;
                let safeDist = max(dist, 1.0);
                separation += normalize(diff) / safeDist;
            }
        }
    }

    var steer = vec2f(0.0);

    if (neighborCount > 0u) {
        let n = f32(neighborCount);

        // Alignment: steer toward average velocity of neighbours
        let avgVelocity  = alignment / n;
        let desiredAlign = normalize(avgVelocity) * maxSpeed;
        steer += clampMagnitude((desiredAlign - p.velocity) * alignmentWeight, maxForce);

        // Cohesion: steer toward centre of mass
        let centerOfMass    = cohesion / n;
        let toCOM           = centerOfMass - p.position;
        let distToCOM       = length(toCOM);
        if (distToCOM > 0.0) {
            let desiredCohesion = normalize(toCOM) * maxSpeed;
            steer += clampMagnitude((desiredCohesion - p.velocity) * cohesionWeight, maxForce);
        }
    }

    if (separationCount > 0u) {
        let sepDir     = separation / f32(separationCount);
        let desiredSep = normalize(sepDir) * maxSpeed;
        steer += clampMagnitude((desiredSep - p.velocity) * separationWeight, maxForce);
    }

    // Integrate
    p.velocity += steer * uniforms.deltaTime;
    p.velocity  = clampMagnitude(p.velocity, maxSpeed);
    p.position += p.velocity * uniforms.deltaTime;

    // Wrap at canvas boundaries
    p.position.x = ((p.position.x % uniforms.canvasSize.x) + uniforms.canvasSize.x) % uniforms.canvasSize.x;
    p.position.y = ((p.position.y % uniforms.canvasSize.y) + uniforms.canvasSize.y) % uniforms.canvasSize.y;

    particlesOut[index] = p;
}