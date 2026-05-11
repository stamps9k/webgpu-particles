struct Uniforms {
    deltaTime   : f32,
    time        : f32,
    canvasSize  : vec2f,
    emitterPos  : vec2f,
    emitterType : f32,
    emitterP1   : f32,
    emitterP2   : f32,
    sp0         : f32,   // rocket launch speed
    sp1         : f32,   // spark explosion speed
    sp2         : f32,   // gravity strength
    sp3         : f32,   // rocket count
    sp4         : f32,
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

@group(0) @binding(0) var<uniform>             uniforms  : Uniforms;
@group(0) @binding(1) var<storage, read_write> particles : array<Particle>;

// ── helpers ───────────────────────────────────────────────────────────────────

fn rand(seed: f32) -> f32 {
    return fract(sin(seed * 127.1 + 311.7) * 43758.5453);
}

fn dormantSpark() -> Particle {
    var p: Particle;
    p.position = vec2f(-99999.0);
    p.velocity = vec2f(0.0);
    p.color    = vec4f(0.0);
    p.seed     = 1.0;
    p.life     = 0.0;
    p.maxLife  = 1.0;
    p.size     = 0.0;
    return p;
}

fn respawnRocket(i: u32) -> Particle {
    var p: Particle;

    let r1 = rand(f32(i) * 1.1 + uniforms.time);
    let r2 = rand(f32(i) * 2.3 + uniforms.time);
    let r3 = rand(f32(i) * 3.7 + uniforms.time);
    let r4 = rand(f32(i) * 4.9 + uniforms.time);
    let r5 = rand(f32(i) * 5.3 + uniforms.time);

    let angle  = (r2 - 0.5) * 0.4;
		let mod_speed = (0.8 + (r2 * 0.2)) * -uniforms.sp0;
    p.position = uniforms.emitterPos + vec2f((r1 - 0.5) * uniforms.emitterP1, uniforms.emitterP2 / 2);
    p.velocity = vec2f(sin(angle) * uniforms.sp0 * 0.3, mod_speed);
    p.color    = vec4f(r3, r4, r5, 1.0);
    p.seed     = 0.0;   // rocket in flight
    p.life     = 1.0;
    p.maxLife  = 1.0;
    p.size     = 15.0;
    return p;
}

// ── rocket pass ───────────────────────────────────────────────────────────────

@compute @workgroup_size(64)
fn main_rockets(@builtin(global_invocation_id) id: vec3u) {
    let i           = id.x;
    let rocketCount = u32(uniforms.sp3);

    // Only process rocket slots
    if (i >= rocketCount) { return; }

    var p = particles[i];

    // Previous frame this rocket peaked and signalled sparks — now respawn it
    if (p.seed == 0.25) {
        particles[i] = respawnRocket(i);
        return;
    }

    // Apply gravity and integrate position
    p.velocity.y += uniforms.sp2 * uniforms.deltaTime;
    p.position   += p.velocity   * uniforms.deltaTime;

    // Peak reached when vertical velocity crosses zero
    if (p.velocity.y >= 0.0) {
        p.seed = 0.25;  // signal to spark pass — lasts one frame
    }

    particles[i] = p;
}

// ── spark pass ────────────────────────────────────────────────────────────────

@compute @workgroup_size(64)
fn main_sparks(@builtin(global_invocation_id) id: vec3u) {
    let i              = id.x;
    let rocketCount    = u32(uniforms.sp3);
    let totalParticles = arrayLength(&particles);

    // Only process spark slots
    if (i < rocketCount || i >= totalParticles) { return; }

    // Guard against divide by zero
    if (rocketCount == 0u) { return; }

    let sparksPerRocket = (totalParticles - rocketCount) / rocketCount;

    // Guard against zero sparks per rocket
    if (sparksPerRocket == 0u) { return; }

    var p = particles[i];

    // Find owner rocket for this spark slot
    let rocketIdx = (i - rocketCount) / sparksPerRocket;

    // Discard remainder slots that fall outside even distribution
    if (rocketIdx >= rocketCount) { return; }

    let rocket = particles[rocketIdx];

    // Owner rocket just peaked — activate this spark
    if (rocket.seed == 0.25 && p.size == 0.0) {
        let s = i;
        let angle = rand(f32(s) * 7.3 + uniforms.time) * 6.2831853;
        let speed = rand(f32(s) * 8.1 + uniforms.time) * uniforms.sp1
                  + uniforms.sp1 * 0.3;

        p.position = rocket.position;
        p.velocity = vec2f(cos(angle), sin(angle)) * speed;
        p.color    = vec4f(rocket.color.rgb, 1.0);
        p.seed     = 1.0;
        p.life     = 1.0;
        p.maxLife  = rand(f32(s) * 9.3  + uniforms.time) * 1.5 + 0.5;
        p.size     = rand(f32(s) * 10.7 + uniforms.time) * 9.0 + 6.0;
        particles[i] = p;
        return;
    }

    // Dormant — waiting for rocket to peak
    if (p.size == 0.0) { return; }

    // Active spark simulation
    p.life -= uniforms.deltaTime / p.maxLife;

    if (p.life <= 0.0) {
        particles[i] = dormantSpark();
        return;
    }

    p.velocity   *= 0.98;
    p.velocity.y += uniforms.sp2 * uniforms.deltaTime;
    p.position   += p.velocity   * uniforms.deltaTime;
    p.color.a     = p.life;

    particles[i] = p;
}