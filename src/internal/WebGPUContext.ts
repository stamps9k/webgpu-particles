import { shader_registry } from "./shaders";
import { ParticleEffect } from "../public/effects/ParticleEffect";
import { ScatterFadeEffect } from "../public/effects/ScatterFadeEffect";
import { ShaderParams } from "../public/ShaderParams";
import { FireworksEffect } from "../public/effects/FireworksEffect";
import { ScatterSwirlEffect } from "../public/effects/ScatterSwirlEffect";
import { BoidsEffect } from "../public/effects/BoidsEffect";
import { Emitter } from "../public/types/Emitters";
import { UniformValues } from "./UniformValues";

/** Custom options that the I may want to use */
export interface WebGPUContextOptions {
  powerPreference?: GPUPowerPreference;
  antialias?: boolean;
}

/** Manages the various items required by the WebGPU API */
export class WebGPUContext {
  readonly adapter: GPUAdapter;
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;

  // -- The buffers used in simulation
  private uniform_buffers: Record<string, GPUBuffer>;

  // -- Timing
  private last_time = performance.now();

  /**
   *
   * Construct a new particle engine instance.
   * Called by the static init function to enable the async nature of the
   * generation of WebGPU contexts
   *
   * @param adapter - The standard WebGPU Adapter
   * @param device - The standard WebGPU device
   * @param context - The standard WebGPU context
   * @param format  - The standard WebGPU Texture format
   * @param shaders - A list of all shaders used by WebGPU
   * @param buffers - A list of all buffers used by WebGPU
   * @param compute_pipeline - The standard WebGPU Compute Pipeline
   * @param render_pipeline - The standard WebGPU Render Pipeline
   * @param bind_groups - A list of all bindgroups used by WebGPU
   */
  private constructor(
    adapter: GPUAdapter,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
    uniform_buffers: Record<string, GPUBuffer>,
  ) {
    this.adapter = adapter;
    this.device = device;
    this.context = context;
    this.format = format;
    this.uniform_buffers = uniform_buffers;
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  /**
   *
   * asyncronous init code
   *
   * @param canvas - The canvas element in the browser DOM
   * @param options - Any WebGPU options provided by the user
   * @param shaders_text - The text of each shader used by the program
   * @param max_particles - The max number of particles requested by the user
   * @param particle_stride - The stride of each particle
   * @returns
   */
  static async init(
    canvas: HTMLCanvasElement,
    options: WebGPUContextOptions = {},
  ): Promise<WebGPUContext> {
    const particle_stride = 48;

    // #region --- Create and configure the context ----------------------------
    if (!navigator.gpu) {
      throw new Error("WebGPU is not supported in this environment.");
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: options.powerPreference ?? "high-performance",
    });

    if (!adapter) {
      throw new Error("No GPUAdapter found. WebGPU may not be available.");
    }

    const device = await adapter.requestDevice({
      label: "webgpu-main-device",
      requiredFeatures: [],
      requiredLimits: {},
    });

    device.lost.then((info) => {
      console.error(
        `GPU device lost: ${info.message} (reason: ${info.reason})`,
      );
    });

    const context = canvas.getContext("webgpu") as GPUCanvasContext;
    if (!context) {
      throw new Error("Failed to get WebGPU canvas context.");
    }

    const format = navigator.gpu.getPreferredCanvasFormat();

    context.configure({
      device,
      format,
      alphaMode: "premultiplied",
    });
    // #endregion --------------------------------------------------------------

    // #region --- Create the uniform buffer -----------------------------------
    let uniform_buffers: Record<string, GPUBuffer> = {};
    /*
     * Uniform buffer is size 80 with the structure:
     * deltaTime(4) + time(4) + canvasSize(8) +
     * emitterType(4) + emitterPos(8) + emitterP1(4) + emitterP2(4) +
     * all sp_params (44)
     */
    uniform_buffers["uniform_buffer"] = device.createBuffer({
      label: "uniforms",
      size: 80,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // #endregion --------------------------------------------------------------

    // #region --- Return an object to hold all variables ----------------------
    return new WebGPUContext(adapter, device, context, format, uniform_buffers);
    // #endregion --------------------------------------------------------------
  }

  // -------------------------------------------------------------------------
  // Frame helpers
  // -------------------------------------------------------------------------

  /**
   *
   * Return the current swap-chain texture view to use as the render target.
   *
   * @returns the current swap-chain texture view
   *
   */
  get_current_color_view(): GPUTextureView {
    return this.context.getCurrentTexture().createView();
  }

  /**
   * Create a basic render pass descriptor pointed at the current
   * swap-chain texture. Extend or replace as needed.
   *
   * @param clearColor - the clear color
   * @returns the GPU Render Pass
   *
   */
  create_render_pass_descriptor(
    clearColor: GPUColor = { r: 0, g: 0, b: 0, a: 1 },
  ): GPURenderPassDescriptor {
    return {
      colorAttachments: [
        {
          view: this.get_current_color_view(),
          clearValue: clearColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    };
  }

  /**
   * Create a command encoder to encode a list of commands to be consumed by the GPU
   *
   * @returns a command encoder
   */
  begin_frame(): GPUCommandEncoder {
    return this.device.createCommandEncoder({ label: "frame-encoder" });
  }

  /**
   * Finish the encoder and pass to the device for processing
   *
   * @param encoder - the encoder to close
   */
  end_frame(encoder: GPUCommandEncoder): void {
    this.device.queue.submit([encoder.finish()]);
  }

  // -------------------------------------------------------------------------
  // Resource helpers
  // -------------------------------------------------------------------------

  /**
   *
   * Write some data the GPU's buffer
   *
   * @param buffer_name - The buffer to write to
   * @param bufferOffset - How much to offset the write command
   * @param data - The data to write to the buffer
   */
  write_buffer(canvas: HTMLCanvasElement, uniform_values: UniformValues): void {
    // #region --- Update the shader uniforms ----------------------------------
    const uniform_data = new Float32Array([
      uniform_values.delta_time,
      uniform_values.time,
      canvas.width,
      canvas.height,
      uniform_values.emitter_pos[0],
      uniform_values.emitter_pos[1],
      uniform_values.emitter_type,
      uniform_values.emitter_p1,
      uniform_values.emitter_p2,
      uniform_values.sp0,
      uniform_values.sp1,
      uniform_values.sp2,
      uniform_values.sp3,
      uniform_values.sp4,
      uniform_values.sp5,
      uniform_values.sp6,
      uniform_values.sp7,
      uniform_values.sp8,
      uniform_values.sp9,
      uniform_values.sp10,
    ]);
    // #endregion --------------------------------------------------------------

    this.device.queue.writeBuffer(
      this.uniform_buffers["uniform_buffer"],
      0,
      uniform_data,
    );
  }

  get_uniform_buffers = (): Record<string, GPUBuffer> => {
    return this.uniform_buffers;
  };

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /** Clean up the WebGPU context when finished */
  destroy(): void {
    this.context.unconfigure();
    this.device.destroy();
  }
}
