import { WebGPUContext, WebGPUContextOptions } from "../internal/WebGPUContext";

export class ParticleEngine {
	private ctx: WebGPUContext;

	private constructor(ctx: WebGPUContext) {
		this.ctx = ctx;
	}

	/**
	 * 
	 * Checks that the context is operating as expected by turning the canvaas red.
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
	 * Initiliasize the particle engine in preparation of use
	 * 
	 * @param canvas - the canvas element to tie the particles to.
	 * @param options - any special options
	 * @returns 
	 */
	static async init(
    canvas: HTMLCanvasElement,
    options: WebGPUContextOptions = {},
  ): Promise<ParticleEngine> {
		const tmp_ctx = await WebGPUContext.init(canvas, options);
		return new ParticleEngine(tmp_ctx);
	}
}