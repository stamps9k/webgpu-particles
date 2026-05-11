import { FlagAndOpenMode } from "fs/promises";
import { WebGPUContext, WebGPUContextOptions } from "../internal/WebGPUContext";
import { ParticleType } from "./enums/ParticleTypes";
import { Emitter } from "./types/Emitters";

/** Manages the WebGPU particle simulation lifecycle */
export class ParticleEngine {
	private MAX_PARTICLES = 10000;
	private WORKGROUP_SIZE = 10;
	private emitter: Emitter;
	private canvas: HTMLCanvasElement;
	private ctx: WebGPUContext;
	private particle_type: ParticleType;
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
	private constructor(canvas: HTMLCanvasElement, ctx: WebGPUContext) {
		this.canvas = canvas;
		this.ctx = ctx;
		this.emitter = this.generate_emitter(ctx.shader_config["emitter-shape"], canvas);
		this.MAX_PARTICLES = Number.parseInt(ctx.shader_config["max-particles"]);
		this.particle_type = ParticleType.Square;
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

		const emitterData = this.generate_emitter_data();
		const shader_params = this.generate_shader_params();

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
			shader_params[0],
			shader_params[1],
			shader_params[2],
			shader_params[3],
			shader_params[4],
		]);
		this.ctx.write_buffer("uniform_buffer", 0, uniform_data);

		const encoder = this.ctx.begin_frame();
    this.ctx.build_compute_pass(encoder, uniform_data, this.MAX_PARTICLES, this.WORKGROUP_SIZE);
		this.ctx.build_render_pass(encoder, uniform_data, this.MAX_PARTICLES);

		// ── submit ────────────────────────────────────────────────────────────────
    this.ctx.end_frame(encoder);
    requestAnimationFrame(this.animate_particles);
	}

	/**
	 * 
	 * Check that the context is operating as expected by turning the canvaas red.
	 * 
	 */
	context_check() {
		// ctx is defined here, and this runs whenever ctx updates
		const encoder = this.ctx.begin_frame();
		const pass = encoder.beginRenderPass(
				this.ctx.create_render_pass_descriptor({ r: 1, g: 0, b: 0, a: 1 })
		);
		pass.end();
		this.ctx.end_frame(encoder);
	}

	public resize(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.emitter = this.generate_emitter(this.emitter.type, canvas);
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
			data[offset + 2] = (Math.random() - 0.5) * 400; // vx
			data[offset + 3] =  Math.random() * 300 + 0.2;  // vy

			// color (vec4f)
			data[offset + 4] = Math.random(); // r
			data[offset + 5] = Math.random(); // g
			data[offset + 6] = Math.random(); // b
			data[offset + 7] = 1.0;           // a

			// life — randomise so they don't all die on the same frame
			data[offset + 8] = 0.0													// seed
			data[offset + 9]  = Math.random();							// life
			data[offset + 10]  = 1.0;           						// maxLife
			data[offset + 11] = Math.random() * 8.0 + 4.0;	// size (4–12px)
		}

		this.ctx.write_buffer("particle_buffer", 0, data);
	}

	/**
	 * 
	 * Creates an emitter of a given shape for a given canvas.
	 * 
	 * @param emitter_shape the shape of the emitter
	 * @param canvas the canvas the emitter will use
	 * @returns an emitter for particle drawing
	 */
	private generate_emitter(emitter_shape: string, canvas: HTMLCanvasElement): Emitter {
 		switch (emitter_shape.toUpperCase()) {
			case "POINT":
				return { type: 'point', x: canvas.width / 2, y: canvas.height / 2 };
			case "CIRCLE":
				return { type: 'circle', x: canvas.width / 2, y: canvas.height / 2, radius: canvas.width / 2 * 0.6 };
			case "RECTANGLE":
				return { type: 'rect',   x:canvas.width / 2 , y: canvas.height / 2, width: canvas.width, height: canvas.height };
			default:
				return { type: 'point', x: 0, y: 0 };
		}
	}

	/**
	 * 
	 * Generates the custom per shader parameters based on the currently operating shader set.
	 * 
	 * @returns an array of Float32 that correspond to shader variables sp0, sp1, sp2, sp3 and sp4.
	 */
	private generate_shader_params(): Float32Array {
		switch (this.ctx.shader_set) {
			case "scatter_fade":
				return new Float32Array([
					0.0,
					0.0,
					0.0,
					0.0,
					0.0
				])
			case "scatter_swirl":
				return new Float32Array([
					150.0,
					30.0,
					8.0,
					0.0,
					0.0
				])
			case "fireworks":
				return new Float32Array([
					400,	// sp0 - Launch speed
					300,	// sp1 - Spark speed
					200,		// sp2 - gravity
					Number.parseFloat(this.ctx.shader_config["rocket-count"]),			// sp3 - rocket count
					0.0
				])
			default:
				return new Float32Array([
					0.0,
					0.0,
					0.0,
					0.0,
					0.0
				])
		}
	}


	/**
	 * 
	 * Convert the emitter object to a data format that can be ingested by the WebGPU Uniform Buffer.
	 * 
	 * @returns the generated Emitter data ready to be passed into the WebGPU buffer
	 * 
	 */
	private generate_emitter_data(): Float32Array {
		switch (this.emitter.type) {
    	case 'point':
				return new Float32Array([
					this.emitter.x, // x
					this.emitter.y, // y
					0.0,						// Emitter type
					0.0,						// Not used by a point emitter
					0.0,						// Not used by a point emitter
				]);
    	case 'circle':
				return new Float32Array([
					this.emitter.x,				// x position
					this.emitter.y,				// y position
					1.0,									// Emitter type
					this.emitter.radius,	// Circle emitter radius
					0.0,									// Not used by a circle emitter
				]);
    	case 'rect':
				return new Float32Array([
					this.emitter.x,				// x
					this.emitter.y,				// y
					2.0,									// Emitter type
					this.emitter.width,		// Emitter width
					this.emitter.height,	// Emitter height
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
		shader_set: string,
		shader_config: Record<string, string>,
		options: WebGPUContextOptions = {},
  ): Promise<ParticleEngine> {
		shader_config = ParticleEngine.normalize_shader_config(shader_set, shader_config);

		const tmp_ctx = await WebGPUContext.init(
			canvas, 
			options,
			shader_set,
			shader_config
		);

		const result: ParticleEngine = new ParticleEngine(canvas, tmp_ctx);
		result.seedParticleBuffer();

		return result;
	}

	static normalize_shader_config(shader_set: string, shader_config: Record<string, string>): Record<string, string> {
		switch (shader_set) {
			case "scatter-fade":
				if (shader_config["max-particles"] === undefined)
					shader_config["max-particles"] = "500";
				if (shader_config["emitter-shape"] === undefined)
					shader_config["emitter-shape"] = "Rectangle";
				break;
			case "scatter-swirl":
				if (shader_config["max-particles"] === undefined)
					shader_config["max-particles"] = "500";
				if (shader_config["emitter-shape"] === undefined)
					shader_config["emitter-shape"] = "Rectangle";
				break;	
			case "fireworks":
				if (shader_config["max-particles"] === undefined)
					shader_config["max-particles"] = "500";
				if (shader_config["rocket-count"] === undefined)
					shader_config["rocket-count"] = "5";
				shader_config["emitter-shape"] = "Rectangle";
				break;
			default:
				throw new Error("Unknown shader-set type");
				break;
		}
		return shader_config;
	}
}