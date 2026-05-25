struct Uniforms {
    deltaTime   : f32,
    time        : f32,
    canvasSize  : vec2f,
    emitterPos  : vec2f,
    emitterType : f32,
    emitterP1   : f32,
    emitterP2   : f32,
    sp0 : f32, sp1 : f32, sp2  : f32, sp3  : f32,
    sp4 : f32, sp5 : f32, sp6  : f32, sp7  : f32,
    sp8 : f32, sp9 : f32, sp10 : f32,
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

struct VertexOutput {
    @builtin(position) position : vec4f,
    @location(0)       color    : vec4f,
}

@group(0) @binding(0) var<uniform>       uniforms  : Uniforms;
@group(0) @binding(1) var<storage, read> particles : array<Particle>;

// Triangle offsets in local space (forward = +Y in local, tip at front)
const OFFSETS = array<vec2f, 3>(
    vec2f( 0.0,  1.0),   // tip
    vec2f( 0.5, -0.6),   // back right
    vec2f(-0.5, -0.6),   // back left
);

@vertex
fn vs_main(
    @builtin(vertex_index)   vertexIndex   : u32,
    @builtin(instance_index) instanceIndex : u32,
) -> VertexOutput {
    let p = particles[instanceIndex];

    // Orientation from velocity direction
    let speed   = length(p.velocity);
    var forward = vec2f(0.0, -1.0); // default facing up if stationary
    if (speed > 0.5) {
        forward = p.velocity / speed;
    }
    let right = vec2f(forward.y, -forward.x); // perpendicular

    // Rotate and scale local triangle offset into pixel space
    let local     = OFFSETS[vertexIndex];
    let pixelPos  = p.position
                  + forward * local.y * p.size
                  + right   * local.x * p.size;

    // Pixel space → clip space (Y flip for canvas coords)
    let clip = (pixelPos / uniforms.canvasSize) * 2.0 - 1.0;

    var output: VertexOutput;
    output.position = vec4f(clip.x, -clip.y, 0.0, 1.0);
    output.color    = p.color;
    return output;
}