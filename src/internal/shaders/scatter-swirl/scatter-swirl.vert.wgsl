struct Uniforms {
    deltaTime   : f32,
    time        : f32,
    canvasSize  : vec2f,
    emitterPos  : vec2f,
    emitterType : f32,
    emitterP1   : f32,
    emitterP2   : f32,
    sp0         : f32,
    sp1         : f32,
    sp2         : f32,
    sp3         : f32,
		sp4					: f32
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

struct VertexOut {
    @builtin(position) pos   : vec4f,
    @location(0)       uv    : vec2f,
    @location(1)       color : vec4f,
}

@group(0) @binding(0) var<uniform>       uniforms  : Uniforms;
@group(0) @binding(1) var<storage, read> particles : array<Particle>;

// Quad corners in UV space, two triangles
const QUAD = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f( 1.0, -1.0),
    vec2f(-1.0,  1.0),
    vec2f(-1.0,  1.0),
    vec2f( 1.0, -1.0),
    vec2f( 1.0,  1.0),
);

@vertex
fn vs_main(
    @builtin(vertex_index)   vertIdx : u32,
    @builtin(instance_index) instIdx : u32,
) -> VertexOut {
    let p      = particles[instIdx];
    let corner = QUAD[vertIdx];

    // Convert particle position from pixel space to clip space
    let pixelPos  = p.position + corner * p.size;
    let clipPos   = (pixelPos / uniforms.canvasSize) * 2.0 - 1.0;

    var out: VertexOut;
    out.pos   = vec4f(clipPos.x, -clipPos.y, 0.0, 1.0);
    out.uv    = corner;
    out.color = p.color;
    return out;
}