//import { scatter_fade_comp, scatter_fade_vert, scatter_fade_frag } from './shaders';
import { resourceLimits } from "node:worker_threads";
import { shader_registry } from "./shaders";
import { ParticleEffect } from "../public/effects/ParticleEffect";
import { ScatterFadeEffect } from "../public/effects/ScatterFadeEffect";
import { ShaderParams } from "../public/ShaderParams";
import { FireworksEffect } from "../public/effects/FireworksEffect";
import { ScatterSwirlEffect } from "../public/effects/ScatterSwirlEffect";

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
  readonly shader_set: string;
  readonly shader_config: ShaderParams;
  readonly shaders: Record<string, GPUShaderModule>;
  readonly compute_pipelines: Record<string, GPUComputePipeline>;
  readonly render_pipelines: Record<string, GPURenderPipeline>;
  readonly bind_groups: Record<string, GPUBindGroup>;

  // -- The buffers used in simulation
  private buffers: Record<string, GPUBuffer>;

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
    shader_set: string,
    shader_config: ShaderParams,
    shaders: Record<string, GPUShaderModule>,
    buffers: Record<string, GPUBuffer>,
    compute_pipelines: Record<string, GPUComputePipeline>,
    render_pipelines: Record<string, GPURenderPipeline>,
    bind_groups: Record<string, GPUBindGroup>,
  ) {
    this.adapter = adapter;
    this.device = device;
    this.context = context;
    this.format = format;
    this.shader_set = shader_set;
    this.shader_config = shader_config;
    this.shaders = shaders;
    this.bind_groups = bind_groups;
    this.buffers = buffers;
    this.compute_pipelines = compute_pipelines;
    this.render_pipelines = render_pipelines;
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
    effect: ParticleEffect,
  ): Promise<WebGPUContext> {
    const particle_stride = 48;

    // -- Create and configure the context
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

    // -- Create the shaders
    var shaders_text: Record<string, string> = await this.load_shaders(effect);
    var shaders_compiled: Record<string, GPUShaderModule> = {};
    shaders_compiled["compute"] = device.createShaderModule({
      code: shaders_text["compute"],
      label: "particle_compute_shader",
    });
    await this.log_shader_errors(shaders_compiled["compute"]);
    shaders_compiled["vert"] = device.createShaderModule({
      code: shaders_text["vert"],
      label: "particle_vert_shader",
    });
    await this.log_shader_errors(shaders_compiled["vert"]);
    shaders_compiled["frag"] = device.createShaderModule({
      code: shaders_text["frag"],
      label: "particle_frag_shader",
    });
    await this.log_shader_errors(shaders_compiled["frag"]);

    // -- Create the buffers
    var buffers: Record<string, GPUBuffer> = {};
    /*
     * Uniform buffer is size 40 with the structure:
     * deltaTime(4) + time(4) + canvasSize(8) +
     * emitterType(4) + emitterPos(8) + emitterP1(4) + emitterP2(4) +
     * _pad(4)
     */
    buffers["uniform_buffer"] = device.createBuffer({
      label: "uniforms",
      size: 56,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    buffers["particle_buffer"] = device.createBuffer({
      label: "particles",
      size: effect.get_max_particles() * particle_stride,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // -- Create the pipelines
    var compute_pipelines: Record<string, GPUComputePipeline> =
      this.create_compute_pipelines(
        device,
        effect.get_effect_name(),
        shaders_compiled,
      );
    var render_pipelines: Record<string, GPURenderPipeline> =
      this.create_render_pipelines(
        device,
        effect.get_effect_name(),
        shaders_compiled,
      );

    // -- Create the bind groups
    var bind_groups: Record<string, GPUBindGroup> = this.create_bind_groups(
      device,
      effect.get_effect_name(),
      compute_pipelines,
      render_pipelines,
      buffers,
    );

    // -- Create an object to hold all variables
    return new WebGPUContext(
      adapter,
      device,
      context,
      format,
      effect.get_effect_name(),
      effect.get_shader_params(),
      shaders_compiled,
      buffers,
      compute_pipelines,
      render_pipelines,
      bind_groups,
    );
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
    return this.device.createCommandEncoder();
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
   * Define everything to be used in the compute pass
   *
   * @param encoder - The encoder that will encode the commands
   * @param uniform_data - The data that will be passed to the copmuter shader
   * @param max_particles - The max number of particles to render
   * @param workgroup_size - The size of each workgroup that the GPU processes
   */
  build_compute_pass(
    encoder: GPUCommandEncoder,
    uniform_data: Float32Array,
    max_particles: number,
    workgroup_size: number,
  ) {
    // compute pass — simulate
    var compute = encoder.beginComputePass();

    switch (this.shader_set) {
      case "fireworks":
        compute.setPipeline(this.compute_pipelines["rocket_pipeline"]);
        compute.setBindGroup(0, this.bind_groups["rocket_bind_group"]);
        compute.dispatchWorkgroups(Math.ceil(max_particles / workgroup_size));

        compute.setPipeline(this.compute_pipelines["spark_pipeline"]);
        compute.setBindGroup(0, this.bind_groups["spark_bind_group"]);
        compute.dispatchWorkgroups(Math.ceil(max_particles / workgroup_size));
        break;
      default:
        compute.setPipeline(this.compute_pipelines["compute_pipeline"]);
        compute.setBindGroup(0, this.bind_groups["compute_bind_group"]);
        compute.dispatchWorkgroups(Math.ceil(max_particles / workgroup_size));
        break;
    }
    compute.end();
  }

  /**
   *
   * Define everything to be used in the render pass
   *
   * @param encoder - The encoder that will encode the commands
   * @param uniform_data - The data that will be passed to the vertex shader
   * @param max_particles - The max number of particles to render
   */
  build_render_pass(
    encoder: GPUCommandEncoder,
    uniform_data: Float32Array,
    max_particles: number,
  ) {
    // render pass — draw
    const render = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    render.setPipeline(this.render_pipelines["render_pipeline"]);
    render.setBindGroup(0, this.bind_groups["render_bind_group"]);
    render.draw(6, max_particles); // 6 vertices × N instances
    render.end();
  }

  /**
   *
   * Write some data the GPU's buffer
   *
   * @param buffer_name - The buffer to write to
   * @param bufferOffset - How much to offset the write command
   * @param data - The data to write to the buffer
   */
  write_buffer(
    buffer_name: string,
    bufferOffset = 0,
    data: BufferSource,
  ): void {
    this.device.queue.writeBuffer(
      this.buffers[buffer_name],
      bufferOffset,
      data,
    );
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  /** Clean up the WebGPU context when finished */
  destroy(): void {
    this.context.unconfigure();
    this.device.destroy();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   *
   * Dynamically load the particle engine shaders
   *
   * @param name - The name for the shader set
   * @returns the shaders
   */
  private static async load_shaders(effect: ParticleEffect) {
    var comp_s = "";
    var vert_s = "";
    var frag_s = "";

    switch (true) {
      case effect instanceof ScatterFadeEffect:
        comp_s = `scatter_fade_comp`;
        vert_s = `scatter_fade_vert`;
        frag_s = `scatter_fade_frag`;
        break;
      case effect instanceof ScatterSwirlEffect:
        comp_s = `scatter_swirl_comp`;
        vert_s = `scatter_swirl_vert`;
        frag_s = `scatter_swirl_frag`;
        break;
      case effect instanceof FireworksEffect:
        comp_s = `fireworks_comp`;
        vert_s = `fireworks_vert`;
        frag_s = `fireworks_frag`;
        break;
    }

    if (comp_s === "" || vert_s === "" || frag_s === "") {
      throw new Error(`Unknown shader effect passed to WebGPUContext`);
    }

    const comp_key = comp_s as keyof typeof shader_registry;
    const vert_key = vert_s as keyof typeof shader_registry;
    const frag_key = frag_s as keyof typeof shader_registry;

    const compute = shader_registry[comp_key];
    const vert = shader_registry[vert_key];
    const frag = shader_registry[frag_key];

    if (!compute || !vert || !frag) {
      throw new Error(
        `No shaders found for "${name}". Available: ${Object.keys(shader_registry).join(", ")}`,
      );
    }

    return { compute, vert, frag };
  }

  /**
   *
   * Create all needed compute pipelines. Different number of pipelines are made
   * depending on the particle affect required.
   *
   * @param device - The device that the piepline
   * @param shader_set - The effect that is being created
   * @param shaders_compiled - The shaders associated with the affect
   * @returns - a set of pipelines for the effect
   */
  private static create_compute_pipelines(
    device: GPUDevice,
    shader_set: string,
    shaders_compiled: Record<string, GPUShaderModule>,
  ): Record<string, GPUComputePipeline> {
    var result: Record<string, GPUComputePipeline> = {};

    switch (shader_set) {
      case "fireworks":
        result["rocket_pipeline"] = this.create_compute_pipeline(
          device,
          shaders_compiled,
          "main_rockets",
          "auto",
          "rocket_pipeline",
        );
        result["spark_pipeline"] = this.create_compute_pipeline(
          device,
          shaders_compiled,
          "main_sparks",
          "auto",
          "spark_pipeline",
        );
        break;
      default:
        result["compute_pipeline"] = this.create_compute_pipeline(
          device,
          shaders_compiled,
          "main",
          "auto",
          "compute_pipeline",
        );
        break;
    }

    return result;
  }

  private static create_render_pipelines(
    device: GPUDevice,
    shader_set: string,
    shaders_compiled: Record<string, GPUShaderModule>,
  ): Record<string, GPURenderPipeline> {
    var result: Record<string, GPURenderPipeline> = {};

    switch (shader_set) {
      default:
        result["render_pipeline"] = this.create_render_pipeline(
          device,
          shaders_compiled,
        );
        break;
    }

    return result;
  }

  private static create_bind_groups(
    device: GPUDevice,
    shader_set: string,
    compute_pipelines: Record<string, GPUComputePipeline>,
    render_pipelines: Record<string, GPURenderPipeline>,
    buffers: Record<string, GPUBuffer>,
  ): Record<string, GPUBindGroup> {
    var result: Record<string, GPUBindGroup> = {};

    switch (shader_set) {
      case "fireworks":
        result["rocket_bind_group"] = device.createBindGroup({
          layout: compute_pipelines["rocket_pipeline"].getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
            { binding: 1, resource: { buffer: buffers["particle_buffer"] } },
          ],
        });
        result["spark_bind_group"] = device.createBindGroup({
          layout: compute_pipelines["spark_pipeline"].getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
            { binding: 1, resource: { buffer: buffers["particle_buffer"] } },
          ],
        });
        result["render_bind_group"] = device.createBindGroup({
          layout: render_pipelines["render_pipeline"].getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
            { binding: 1, resource: { buffer: buffers["particle_buffer"] } },
          ],
        });
        break;
      default:
        result["compute_bind_group"] = device.createBindGroup({
          layout: compute_pipelines["compute_pipeline"].getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
            { binding: 1, resource: { buffer: buffers["particle_buffer"] } },
          ],
        });
        result["render_bind_group"] = device.createBindGroup({
          layout: render_pipelines["render_pipeline"].getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
            { binding: 1, resource: { buffer: buffers["particle_buffer"] } },
          ],
        });
    }

    return result;
  }

  /**
   * Create the compute pipeline
   *
   * @param device - The device the pipeline will run on
   * @param shaders - The shaders the pipeline will use
   * @param entryPoint - The shader entrypoint
   * @param layout - The GPUPipelineLayout
   * @param label - The name for the pipeline
   * @returns the copmute pipeline
   */
  private static create_compute_pipeline(
    device: GPUDevice,
    shaders: Record<string, GPUShaderModule>,
    entryPoint: string,
    layout: GPUPipelineLayout | "auto" = "auto",
    label?: string,
  ): GPUComputePipeline {
    if (!shaders["compute"]) {
      throw new Error("No compute shader defined.");
    }

    return device.createComputePipeline({
      label,
      layout,
      compute: { module: shaders["compute"], entryPoint },
    });
  }

  /**
   *
   * Create the render pipeline
   *
   * @param device - The device the pipeline will run on
   * @param shaders - The shaders the pipeline will use
   * @returns the render pipeline
   */
  private static create_render_pipeline(
    device: GPUDevice,
    shaders: Record<string, GPUShaderModule>,
  ): GPURenderPipeline {
    return device.createRenderPipeline({
      vertex: {
        module: shaders["vert"],
        entryPoint: "vs_main",
      },
      fragment: {
        module: shaders["frag"],
        entryPoint: "fs_main",
        targets: [
          {
            format: navigator.gpu.getPreferredCanvasFormat(),
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
              alpha: {
                srcFactor: "one",
                dstFactor: "one-minus-src-alpha",
                operation: "add",
              },
            },
          },
        ],
      },
      primitive: {
        topology: "triangle-list",
      },
      layout: "auto",
    });
  }

  /**
   * Log any errors reported during shader creation
   *
   * @param shader - The shader to do error reporting for
   */
  private static async log_shader_errors(shader: GPUShaderModule) {
    const info = await shader.getCompilationInfo();
    for (const msg of info.messages) {
      if (msg.type === "error") {
        console.error(`shader error: ${msg.message} (line ${msg.lineNum})`);
      }
    }
  }
}
