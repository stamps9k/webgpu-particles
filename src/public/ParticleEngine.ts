import { WebGPUContext, WebGPUContextOptions } from "../internal/WebGPUContext";
import { ParticleType } from "./enums/ParticleTypes";
import { Emitter } from "./types/Emitters";
import { ParticleEffect } from "./effects/ParticleEffect";
import { Particle } from "./Particle";
import { BoidsEffect } from "./effects/BoidsEffect";
import { EmitterConfig } from "./EmitterConfig";
import { EffectRendererFactory } from "../internal/EffectRenderer/EffectRendererFactory";
import { EffectRenderer } from "../internal/EffectRenderer/EffectRenderer";

/** Manages the WebGPU particle simulation lifecycle */
export class ParticleEngine {
  // #region --- The class properties ------------------------------------------
  private canvas: HTMLCanvasElement;
  private ctx: WebGPUContext;
  private emitter: Emitter;
  private effect: ParticleEffect;
  private renderer: EffectRenderer;

  // #endregion ----------------------------------------------------------------

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
  private constructor(
    canvas: HTMLCanvasElement,
    ctx: WebGPUContext,
    emitter: Emitter,
    effect: ParticleEffect,
    renderer: EffectRenderer,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.emitter = emitter;
    this.effect = effect;
    this.renderer = renderer;
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
    this.ctx.write_buffer(this.canvas, this.effect, this.emitter);

    const encoder = this.ctx.begin_frame();
    this.renderer.encode_compute_pass(encoder, this.effect);
    this.renderer.encode_render_pass(
      encoder,
      this.ctx.get_current_color_view(),
    );

    this.ctx.end_frame(encoder);
    requestAnimationFrame(this.animate_particles);
    if (this.effect instanceof BoidsEffect) {
      this.effect.increment_frame_index();
    }
  };

  /**
   *
   * Check that the context is operating as expected by turning the canvaas red.
   *
   */
  context_check() {
    // ctx is defined here, and this runs whenever ctx updates
    const encoder = this.ctx.begin_frame();
    const pass = encoder.beginRenderPass(
      this.ctx.create_render_pass_descriptor({ r: 1, g: 0, b: 0, a: 1 }),
    );
    pass.end();
    this.ctx.end_frame(encoder);
  }

  /**
   * Update the canvas on resize.
   *
   * @param canvas
   */
  public resize(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   *
   * Creates an emitter of a given shape for a given canvas.
   *
   * @param emitter_shape the shape of the emitter
   * @param canvas the canvas the emitter will use
   * @returns an emitter for particle drawing
   */
  private static generate_emitter(emitter_config: EmitterConfig): Emitter {
    return {
      type: emitter_config.emitter_type,
      pos: emitter_config.emitter_pos,
      p1: emitter_config.emitter_p1 ?? 50,
      p2: emitter_config.emitter_p2 ?? 50,
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
    effect: ParticleEffect,
    emitter_config: EmitterConfig,
    options: WebGPUContextOptions = {},
  ): Promise<ParticleEngine> {
    // #region --- Validate everything -----------------------------------------
    var valid_result = effect.validate();
    if (!valid_result.valid) throw new Error(valid_result.message);
    valid_result = emitter_config.validate();
    if (!valid_result.valid) throw new Error(valid_result.message);
    // #endregion --------------------------------------------------------------

    // #region --- Start up if there was no problems ---------------------------
    const tmp_ctx = await WebGPUContext.init(canvas, options);
    console.log("context device first:", tmp_ctx.device.label);
    const tmp_emitter = this.generate_emitter(emitter_config);
    const tmp_renderer = await EffectRendererFactory.initialize(
      effect,
      tmp_emitter,
      tmp_ctx.device,
      tmp_ctx.get_uniform_buffers(),
    );
    console.log("context device second:", tmp_ctx.device.label);
    const result: ParticleEngine = new ParticleEngine(
      canvas,
      tmp_ctx,
      tmp_emitter,
      effect,
      tmp_renderer,
    );
    // #endregion --------------------------------------------------------------

    return result;
  }
}
