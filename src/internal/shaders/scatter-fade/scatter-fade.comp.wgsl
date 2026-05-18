// ── structs ──────────────────────────────────────────────────────────────────

struct Uniforms {
	deltaTime : f32,
	time      : f32,
	canvasSize: vec2f,
	emitterPos : vec2f,   // used by all types
	emitterType: f32,     // 0 = point, 1 = circle, 2 = rect
	emitterP1  : f32,     // circle: radius | rect: width
	emitterP2  : f32,     // rect: height
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
	seed		 : u32,
	life     : f32,
	maxLife  : f32,
	size     : f32,
}

// ── bindings ─────────────────────────────────────────────────────────────────

@group(0) @binding(0) var<uniform>            uniforms  : Uniforms;
@group(0) @binding(1) var<storage, read_write> particles : array<Particle>;

// ── helpers ──────────────────────────────────────────────────────────────────
// -- RNG ----------------------------------------------------------
fn pcg(v: u32) -> u32 {
    let state = v * 747796405u + 2891336453u;
    let word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return (word >> 22u) ^ word;
}

fn rand_f32(seed: u32) -> f32 {
    return f32(pcg(seed)) / f32(0xffffffffu);
}
// -----------------------------------------------------------------------------

fn respawn(i: u32) -> Particle {
	var p: Particle;
	let r1 = rand_f32(pcg(i));
	let r2 = rand_f32(pcg(i + 100000u));
	let r3 = rand_f32(pcg(i + 200000u));
	let r4 = rand_f32(pcg(i + 300000u));
	let r5 = rand_f32(pcg(i + 400000u));
	let r6 = rand_f32(pcg(i + 500000u));
	let r7 = rand_f32(pcg(i + 600000u));

	var spawnPos: vec2f;
	if (uniforms.emitterType == 0.0) {
		// point — spawn exactly at emitter position
		spawnPos = uniforms.emitterPos;
	} else if (uniforms.emitterType == 1.0) {
		// circle — random point within radius
		let angle  = rand_f32(i * 7) * 6.2832;
		let radius = sqrt(rand_f32(i * 8)) * uniforms.emitterP1;
		spawnPos   = uniforms.emitterPos + vec2f(cos(angle), sin(angle)) * radius;
	} else if (uniforms.emitterType == 2.0) {
		// rect — random point within width/height
		let rx = (rand_f32(i * 7) - 0.5) * uniforms.emitterP1;
		let ry = (rand_f32(i * 8) - 0.5) * uniforms.emitterP2;
		spawnPos = uniforms.emitterPos + vec2f(rx, ry);
	}

	p.position = spawnPos;   // random position across the full clip space [-1, 1]
	p.velocity = vec2f((r1 - 0.5) * 400.0, -(r2 * 300.0 + 100.0));
	p.color    = vec4f(r3, r4, 1.0 - r3, 1.0);            // random hue
	p.seed 		 = pcg(i + u32(uniforms.time * 1000.0));		// random seed
	p.life     = 1.0;                                     // fully alive
	p.maxLife  = r7 * 2.0 + 0.5;  												// 0.5–2.5 seconds
	p.size     = r1 * 8.0 + 4.0;                          // 4–12 px
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
	p.velocity.y += 100 * uniforms.deltaTime;

	// Integrate position
	p.position += p.velocity * uniforms.deltaTime;

	// Fade alpha as life drains
	p.color.a = p.life;

	particles[i] = p;
}