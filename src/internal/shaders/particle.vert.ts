export const vert_shader = `

// ── structs (shared with compute shader) ─────────────────────────────────────

struct Uniforms {
	deltaTime : f32,
	time      : f32,
}

struct Particle {
	position : vec2f,
	velocity : vec2f,
	color    : vec4f,
	life     : f32,
	maxLife  : f32,
	size     : f32,
	_pad     : f32,
}

// ── bindings ─────────────────────────────────────────────────────────────────

@group(0) @binding(0) var<uniform>         uniforms  : Uniforms;
@group(0) @binding(1) var<storage, read>   particles : array<Particle>;

// ── output to fragment shader ─────────────────────────────────────────────────

struct VertexOut {
	@builtin(position) clipPosition : vec4f,
	@location(0)       color        : vec4f,
	@location(1)       uv           : vec2f,
}

// ── quad geometry ─────────────────────────────────────────────────────────────

// Two triangles forming a quad, as local offsets in [-1, 1] space
//
//  3──2
//  │ /│
//  │/ │
//  0──1
//
const QUAD_POS = array<vec2f, 6>(
	vec2f(-1.0, -1.0), // 0  triangle 1
	vec2f( 1.0, -1.0), // 1
	vec2f( 1.0,  1.0), // 2
	vec2f(-1.0, -1.0), // 0  triangle 2
	vec2f( 1.0,  1.0), // 2
	vec2f(-1.0,  1.0), // 3
);

const QUAD_UV = array<vec2f, 6>(
	vec2f(0.0, 1.0),
	vec2f(1.0, 1.0),
	vec2f(1.0, 0.0),
	vec2f(0.0, 1.0),
	vec2f(1.0, 0.0),
	vec2f(0.0, 0.0),
);

// ── entry point ───────────────────────────────────────────────────────────────

@vertex
fn vs_main(
	@builtin(vertex_index)   vIdx : u32,
	@builtin(instance_index) pIdx : u32,
) -> VertexOut {
	let p      = particles[pIdx];
	let corner = QUAD_POS[vIdx];         // one of 6 corners for this vertex
	let uv     = QUAD_UV[vIdx];

	// Scale the unit quad by the particle's size (convert px → clip space)
	// Assumes a canvas of 800×600 — we'll move this into uniforms later
	let pixelScale = vec2f(p.size / 800.0, p.size / 600.0);
	let localPos   = corner * pixelScale;

	// Offset by the particle's world position (already in [-1, 1] clip space)
	let clipPos = vec4f(p.position + localPos, 0.0, 1.0);

	var out: VertexOut;
	out.clipPosition = clipPos;
	out.color        = p.color;
	out.uv           = uv;
	return out;
}
`