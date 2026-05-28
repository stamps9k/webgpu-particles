import { WebGPUContext, WebGPUContextOptions } from "../internal/WebGPUContext";
import { ParticleEffect } from "./effects/ParticleEffect";
import { EmitterConfig } from "./EmitterConfig";
import { EffectRendererFactory } from "../internal/EffectRenderer/EffectRendererFactory";
import { EffectRenderer } from "../internal/EffectRenderer/EffectRenderer";
import { UniformValues } from "../internal/UniformValues";

/** Manages the WebGPU particle simulation lifecycle */
export class ParticleEngine {
  // #region --- The class properties ------------------------------------------
  private canvas: HTMLCanvasElement;
  private ctx: WebGPUContext;
  private uniform_values: UniformValues;
  private renderer: EffectRenderer;
  private last_time = performance.now();
  private paused = false;

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
    emitter_config: EmitterConfig,
    effect: ParticleEffect,
    renderer: EffectRenderer,
  ) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.uniform_values = this.generate_uniform_values(
      canvas,
      effect,
      emitter_config,
    );
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

  public pause() {
    this.paused = true;
  }

  public resume() {
    this.paused = false;
  }

  /**
   *
   * Handle each frame of animation tick.
   * Passed to requestAnimationFrame to drive the particle simulation loop.
   * Note use of arrow notation. This keeps this in scope at all times.
   *
   */
  public animate_particles = () => {
    const now = performance.now() / 1000;
    this.uniform_values.delta_time = this.paused ? 0 : now - this.last_time;
    this.uniform_values.time = now; // seconds
    this.last_time = now;

    this.ctx.write_buffer(this.canvas, this.uniform_values);

    const encoder = this.ctx.begin_frame();
    this.renderer.encode_compute_pass(encoder);
    this.renderer.encode_render_pass(
      encoder,
      this.ctx.get_current_color_view(),
    );

    this.ctx.end_frame(encoder);
    requestAnimationFrame(this.animate_particles);
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

  private generate_uniform_values(
    canvas: HTMLCanvasElement,
    effect: ParticleEffect,
    emitter_config: EmitterConfig,
  ): UniformValues {
    let emitter_type = 0;
    switch (emitter_config.type) {
      case "point":
        emitter_type = 0;
        break;
      case "circle":
        emitter_type = 1;
        break;
      case "rectangle":
        emitter_type = 2;
        break;
      default:
        emitter_type = 0;
        break;
    }

    const now = performance.now() / 1000; //seconds;
    const result: UniformValues = {
      delta_time: now - this.last_time,
      time: now,
      canvas_size: [canvas.width, canvas.height],
      emitter_pos: emitter_config.pos,
      emitter_type: emitter_type,
      emitter_p1: emitter_config.p1 ?? 0,
      emitter_p2: emitter_config.p2 ?? 0,
      sp0: effect.get_shader_params().sp0,
      sp1: effect.get_shader_params().sp1,
      sp2: effect.get_shader_params().sp2,
      sp3: effect.get_shader_params().sp3,
      sp4: effect.get_shader_params().sp4,
      sp5: effect.get_shader_params().sp5,
      sp6: effect.get_shader_params().sp6,
      sp7: effect.get_shader_params().sp7,
      sp8: effect.get_shader_params().sp8,
      sp9: effect.get_shader_params().sp9,
      sp10: effect.get_shader_params().sp10,
    };
    this.last_time = now;
    return result;
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
    const tmp_renderer = await EffectRendererFactory.initialize(
      effect,
      emitter_config,
      tmp_ctx.device,
      tmp_ctx.get_uniform_buffers(),
    );
    console.log("context device second:", tmp_ctx.device.label);
    const result: ParticleEngine = new ParticleEngine(
      canvas,
      tmp_ctx,
      emitter_config,
      effect,
      tmp_renderer,
    );
    // #endregion --------------------------------------------------------------

    return result;
  }
}
