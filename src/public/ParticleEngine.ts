import { WebGPUContext, WebGPUContextOptions } from "../internal/WebGPUContext";
import { ParticleType } from "./enums/ParticleTypes";
import { Emitter } from "./types/Emitters";

/** Manages the WebGPU particle simulation lifecycle */
export class ParticleEngine {
	private MAX_PARTICLES = 10000;
	private PARTICLE_STRIDE = 48
	private WORKGROUP_SIZE = 10;
	private emitter: Emitter;
	private canvas: HTMLCanvasElement;
	private ctx: WebGPUContext;
	private particle_count: number;
	private particle_type: ParticleType;
	private particle_size: number;
	private last_time: number = performance.now();

	/**
	 * 
	 * Construct a new particle engine instance.
	 * Called by the static init function to enable the async nature of the 
	 * generation of WebGPU contexts
	 * 
	 * @param ctx - the WebGPUContext created in the init function 
	 * @param max_particles - the max number of particles requested by the user
	 * @param particle_stride - The size of each particle in GPU memory
	 */
	private constructor(canvas: HTMLCanvasElement, ctx: WebGPUContext, emitter: Emitter, max_particles: number, particle_stride: number) {
		this.canvas = canvas;
		this.ctx = ctx;
		this.emitter = emitter;
		this.MAX_PARTICLES = max_particles;
		this.PARTICLE_STRIDE = particle_stride;
		this.particle_count = 0;
		this.particle_type = ParticleType.Square;
		this.particle_size = 1;
		this.last_time = performance.now();
	}

	/**
	 * 
	 * Start the animation of the particles
	 * 
	 */
	public start() {
    requestAnimationFrame(this.animate_particles);
  }

	/**
	 * 
	 * Handle each frame of animation tick.
	 * Passed to requestAnimationFrame to drive the particle simulation loop.
	 * Note use of arrow notation. This keeps this in scope at all times. 
	 * 
	 */
	public animate_particles = () => {
		const now       = performance.now();
    const deltaTime = (now - this.last_time) / 1000;  // seconds
    this.last_time        = now;

		const emitterData = this.generateEmitterData();

    // ── update uniforms ───────────────────────────────────────────────────────
    const uniform_data = new Float32Array([
			deltaTime, 
			now / 1000, 
			this.canvas.width, 
			this.canvas.height,
			emitterData[0],
			emitterData[1],
			emitterData[2],
			emitterData[3],
			emitterData[4],
			emitterData[5]
		]);
		this.ctx.writeBuffer("uniform_buffer", 0, uniform_data);

		const encoder = this.ctx.beginFrame();
    this.ctx.build_compute_pass(encoder, uniform_data, this.MAX_PARTICLES, this.WORKGROUP_SIZE);
		this.ctx.build_render_pass(encoder, uniform_data, this.MAX_PARTICLES);

		// ── submit ────────────────────────────────────────────────────────────────
    this.ctx.endFrame(encoder);
    requestAnimationFrame(this.animate_particles);
	}

	/**
	 * 
	 * Check that the context is operating as expected by turning the canvaas red.
	 * 
	 */
	context_check() {
		// ctx is defined here, and this runs whenever ctx updates
		const encoder = this.ctx.beginFrame();
		const pass = encoder.beginRenderPass(
				this.ctx.createRenderPassDescriptor({ r: 1, g: 0, b: 0, a: 1 })
		);
		pass.end();
		this.ctx.endFrame(encoder);
	}

	/**
	 * 
	 * Generate all the raw particle data for the initial set of particles
	 * 
	 */
	private seedParticleBuffer() {
		const data = new Float32Array(this.MAX_PARTICLES * 12);

		for (let i = 0; i < this.MAX_PARTICLES; i++) {
			const offset = i * 12;

			//Generate the particles position based on emitter type
			let x, y;
			switch (this.emitter.type) {
				case 'point':
					x = this.emitter.x;
					y = this.emitter.y;
					break;

				case 'circle':
					const angle  = Math.random() * Math.PI * 2;
					const radius = Math.sqrt(Math.random()) * this.emitter.radius;
					x = this.emitter.x + Math.cos(angle) * radius;
					y = this.emitter.y + Math.sin(angle) * radius;
					break;

				case 'rect':
					x = this.emitter.x + (Math.random() - 0.5) * this.emitter.width;
					y = this.emitter.y + (Math.random() - 0.5) * this.emitter.height;
					break;

				default:
					x = 0;
					y = 0;
			}

			// position (vec2f) — scatter randomly so they don't all spawn at once
			data[offset + 0] = x // x
			data[offset + 1] = y // y

			// velocity (vec2f)
			data[offset + 2] = (Math.random() - 0.5) * 0.8; // vx
			data[offset + 3] =  Math.random() * 0.8 + 0.2;  // vy

			// color (vec4f)
			data[offset + 4] = Math.random(); // r
			data[offset + 5] = Math.random(); // g
			data[offset + 6] = Math.random(); // b
			data[offset + 7] = 1.0;           // a

			// life — randomise so they don't all die on the same frame
			data[offset + 8]  = Math.random(); // life
			data[offset + 9]  = 1.0;           // maxLife
			data[offset + 10] = Math.random() * 8.0 + 4.0; // size (4–12px)
			data[offset + 11] = 0.0;           // _pad
		}

		this.ctx.writeBuffer("particle_buffer", 0, data);
	}


	private static generate_emitter(emitter_shape: string): Emitter {
 		switch (emitter_shape.toUpperCase()) {
			case "POINT":
				return { type: 'point', x: 0, y: 0 };
			case "CIRCLE":
				return { type: 'circle', x: 0, y: 0, radius: 0.5 };;
			case "RECTANGLE":
				return { type: 'rect',   x: 0, y: 0, width: 2, height: 2 };
			default:
				return { type: 'point', x: 0, y: 0 };
		}
	}

	/**
	 * 
	 * Convert the emitter object to a data format that can be ingested by the WebGPU Uniform Buffer.
	 * 
	 * @returns the generated Emitter data ready to be passed into the WebGPU buffer
	 * 
	 */
	private generateEmitterData(): Float32Array {
		switch (this.emitter.type) {
    	case 'point':
				return new Float32Array([
					this.emitter.x, // x
					this.emitter.y, // y
					0.0,						// Emitter type
					0.0,						// Not used by a point emitter
					0.0,						// Not used by a point emitter
					0.0							// Padding
				]);
    	case 'circle':
				return new Float32Array([
					this.emitter.x,				// x position
					this.emitter.y,				// y position
					1.0,									// Emitter type
					this.emitter.radius,	// Circle emitter radius
					0.0,									// Not used by a circle emitter
					0.0										// Padding
				]);
    	case 'rect':
				return new Float32Array([
					this.emitter.x,				// x
					this.emitter.y,				// y
					2.0,									// Emitter type
					this.emitter.width,		// Emitter width
					this.emitter.height,	// Emitter height
					0.0										// Padding
				]);
			};
		}

	/**
	 * 
	 * Initilize the particle engine in preparation of use
	 * 
	 * @param canvas - the canvas element to tie the particles to.
	 * @param max_particles - the number of particles to render.
	 * @param emitter_shape - The shape that the particles are emmited as.
	 * @param shader_set - the set of shaders to use.
	 * @param options - any special options.
	 * @returns - The created ParticleEngine
	 */
	static async init(
    canvas: HTMLCanvasElement,
		max_particles: number = 10000,
		emitter_shape: string,
		shader_set: string,
		options: WebGPUContextOptions = {},
  ): Promise<ParticleEngine> {
		const PARTICLE_STRIDE = 48

		const tmp_ctx = await WebGPUContext.init(
			canvas, 
			options,
			max_particles,
			shader_set,
			PARTICLE_STRIDE,
		);

		const result: ParticleEngine = new ParticleEngine(canvas, tmp_ctx, this.generate_emitter(emitter_shape), max_particles, PARTICLE_STRIDE);
		result.seedParticleBuffer();

		return result;
	}
}