struct Uniforms {
    deltaTime   : f32,
    time        : f32,
    canvasSize  : vec2f,
    emitterPos  : vec2f,
    emitterType : f32,
    emitterP1   : f32,
    emitterP2   : f32,
    sp0         : f32,		// spin strength
    sp1         : f32,		// pull strength
    sp2         : f32,   
    sp3         : f32,
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

fn rand(seed: f32) -> f32 {
    return fract(sin(seed * 127.1 + 311.7) * 43758.5453);
}

fn respawn(i: u32) -> Particle {
    var p: Particle;
    let r     = rand(f32(i) * 1.3 + uniforms.time) * uniforms.emitterP1;
    let angle = rand(f32(i) * 2.7 + uniforms.time) * 6.2831853;
    p.position = uniforms.emitterPos + vec2f(cos(angle), sin(angle)) * r;
    p.velocity = vec2f(0.0);
    p.seed     = rand(f32(i) * 3.9 + uniforms.time);
    p.life     = 1.0;
    p.maxLife  = rand(f32(i) * 5.1 + uniforms.time) * 2.0 + 1.0;
    p.color    = vec4f(1.0);
    p.size     = 6.0;
    return p;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
    let i = id.x;
    if (i >= arrayLength(&particles)) { return; }

    var p = particles[i];

    p.life -= uniforms.deltaTime / p.maxLife;

    if (p.life <= 0.0) {
        particles[i] = respawn(i);
        return;
    }

    // Vector from particle to vortex center
    let toCenter = uniforms.emitterPos - p.position;
    let dist     = max(length(toCenter), 1.0);
    let radial   = toCenter / dist;

    // Tangent is radial rotated 90° — drives the spin
    let tangent  = vec2f(-radial.y, radial.x);

    // Inner particles spin faster, matching a real vortex
    let spin = tangent * uniforms.sp0 / sqrt(dist);
    let pull = radial  * uniforms.sp1;

    p.velocity += (spin + pull) * uniforms.deltaTime;
    p.position += p.velocity    * uniforms.deltaTime;

    // Fade alpha as life runs out
    p.color.a = p.life;

    particles[i] = p;
}