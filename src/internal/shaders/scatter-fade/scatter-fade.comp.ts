export const compute_shader = `

// ── structs ──────────────────────────────────────────────────────────────────

struct Uniforms {
	deltaTime : f32,
	time      : f32,
	canvasSize: vec2f,
	emitterPos : vec2f,   // used by all types
	emitterType: f32,     // 0 = point, 1 = circle, 2 = rect
	emitterP1  : f32,     // circle: radius | rect: width
	emitterP2  : f32,     // rect: height
	_pad       : f32,
}

struct Particle {
	position : vec2f,
	velocity : vec2f,
	color    : vec4f,
	life     : f32,
	maxLife  : f32,
	size     : f32,
	_pad     : f32
}

// ── bindings ─────────────────────────────────────────────────────────────────

@group(0) @binding(0) var<uniform>            uniforms  : Uniforms;
@group(0) @binding(1) var<storage, read_write> particles : array<Particle>;

// ── helpers ──────────────────────────────────────────────────────────────────

// Cheap stateless RNG — returns a pseudo-random f32 in [0, 1)
fn rand(seed: f32) -> f32 {
	return fract(sin(seed * 127.1 + uniforms.time * 311.7) * 43758.5453);
}

fn respawn(i: u32) -> Particle {
	var p: Particle;
	let r1 = rand(f32(i) * 1.0);
	let r2 = rand(f32(i) * 2.0);
	let r3 = rand(f32(i) * 3.0);
	let r4 = rand(f32(i) * 4.0);
	let r5 = rand(f32(i) * 5.0);
	let r6 = rand(f32(i) * 6.0);
	let r7 = rand(f32(i) * 7.0);

	var spawnPos: vec2f;
	if (uniforms.emitterType == 0.0) {
		// point — spawn exactly at emitter position
		spawnPos = uniforms.emitterPos;
	} else if (uniforms.emitterType == 1.0) {
		// circle — random point within radius
		let angle  = rand(f32(i) * 7.0) * 6.2832;
		let radius = sqrt(rand(f32(i) * 8.0)) * uniforms.emitterP1;
		spawnPos   = uniforms.emitterPos + vec2f(cos(angle), sin(angle)) * radius;
	} else if (uniforms.emitterType == 2.0) {
		// rect — random point within width/height
		let rx = (rand(f32(i) * 7.0) - 0.5) * uniforms.emitterP1;
		let ry = (rand(f32(i) * 8.0) - 0.5) * uniforms.emitterP2;
		spawnPos = uniforms.emitterPos + vec2f(rx, ry);
	}

	p.position = spawnPos;   // random position across the full clip space [-1, 1]
	p.velocity = vec2f((r1 - 0.5) * 0.8, r2 * 0.8 + 0.2); // fan upward
	p.color    = vec4f(r3, r4, 1.0 - r3, 1.0);            // random hue
	p.life     = 1.0;                                     // fully alive
	p.maxLife  = r7 * 2.0 + 0.5;  												// 0.5–2.5 seconds
	p.size     = r1 * 8.0 + 4.0;                          // 4–12 px
	p._pad     = 0.0;
	return p;
}

// ── entry point ──────────────────────────────────────────────────────────────

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3u) {
	let i = id.x;
	if (i >= arrayLength(&particles)) { return; }

	var p = particles[i];

	// Age the particle
	p.life -= uniforms.deltaTime / p.maxLife;

	// If dead, respawn it immediately
	if (p.life <= 0.0) {
			particles[i] = respawn(i);
			return;
	}

	// Apply gravity
	p.velocity.y -= 0.4 * uniforms.deltaTime;

	// Integrate position
	p.position += p.velocity * uniforms.deltaTime;

	// Fade alpha as life drains
	p.color.a = p.life;

	particles[i] = p;
}
`