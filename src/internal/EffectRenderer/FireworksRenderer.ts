import { EffectRenderer } from "./EffectRenderer";
import { FireworksEffect } from "../../public/effects/FireworksEffect";
import { shader_registry } from "../shaders";
import { Emitter } from "../../public/types/Emitters";

export class FireworksRenderer implements EffectRenderer {
  private compute_pipelines: Record<string, GPUComputePipeline> = {};
  private render_pipelines: Record<string, GPURenderPipeline> = {};
  private buffers: Record<string, GPUBuffer> = {};
  private bindgroups: Record<string, GPUBindGroup> = {};
  private shaders: Record<string, GPUShaderModule> = {};
  private effect: FireworksEffect;
  private particle_stride = 32; // standard particle size
  private workgroup_size = 64; // standard workgroup size

  constructor(effect: FireworksEffect) {
    this.effect = effect;
    this.effect.seed_particles();
  }

  static initialize(effect: FireworksEffect) {
    let result = new FireworksRenderer(effect);

    return result;
  }

  async create_shaders(device: GPUDevice): Promise<void> {
    let shaders_text: Record<string, string> = this.load_shaders();
    let shaders_compiled: Record<string, GPUShaderModule> = {};

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

    this.shaders = shaders_compiled;
  }

  create_buffers(device: GPUDevice) {
    let buffers: Record<string, GPUBuffer> = {};
    buffers["particle_buffer_0"] = device.createBuffer({
      label: "particles",
      size: this.effect.get_max_particles() * this.particle_stride,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.buffers = buffers;
  }

  create_compute_pipelines(device: GPUDevice) {
    let results: Record<string, GPUComputePipeline> = {};
    results["rocket_pipeline"] = device.createComputePipeline({
      label: "rocket_pipeline",
      layout: "auto",
      compute: { module: this.shaders["compute"], entryPoint: "main_rockets" },
    });

    results["spark_pipeline"] = device.createComputePipeline({
      label: "sparks_pipeline",
      layout: "auto",
      compute: { module: this.shaders["compute"], entryPoint: "main_sparks" },
    });

    this.compute_pipelines = results;
  }

  create_render_pipelines(device: GPUDevice) {
    let results: Record<string, GPURenderPipeline> = {};
    results["render_pipeline"] = device.createRenderPipeline({
      vertex: {
        module: this.shaders["vert"],
        entryPoint: "vs_main",
      },
      fragment: {
        module: this.shaders["frag"],
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
    this.render_pipelines = results;
  }

  create_bindgroups(
    device: GPUDevice,
    uniform_buffers: Record<string, GPUBuffer>,
  ) {
    this.bindgroups["rocket_bind_group"] = device.createBindGroup({
      layout: this.compute_pipelines["rocket_pipeline"].getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform_buffers["uniform_buffer"] } },
        { binding: 1, resource: { buffer: this.buffers["particle_buffer_0"] } },
      ],
    });
    this.bindgroups["spark_bind_group"] = device.createBindGroup({
      layout: this.compute_pipelines["spark_pipeline"].getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform_buffers["uniform_buffer"] } },
        { binding: 1, resource: { buffer: this.buffers["particle_buffer_0"] } },
      ],
    });
    this.bindgroups["render_bind_group"] = device.createBindGroup({
      layout: this.render_pipelines["render_pipeline"].getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform_buffers["uniform_buffer"] } },
        { binding: 1, resource: { buffer: this.buffers["particle_buffer_0"] } },
      ],
    });
  }

  write_particles_to_buffer(device: GPUDevice, emitter: Emitter) {
    let data_array = new Float32Array(
      this.effect.get_max_particles() * (this.particle_stride / 4),
    );

    device.queue.writeBuffer(this.buffers["particle_buffer_0"], 0, data_array);
  }

  destroy() {
    /* release GPU resources */
  }

  encode_compute_pass(encoder: GPUCommandEncoder) {
    let compute = encoder.beginComputePass();
    compute.setPipeline(this.compute_pipelines["rocket_pipeline"]);
    compute.setBindGroup(0, this.bindgroups["rocket_bind_group"]);
    compute.dispatchWorkgroups(
      Math.ceil(this.effect.get_max_particles() / this.workgroup_size),
    );

    compute.setPipeline(this.compute_pipelines["spark_pipeline"]);
    compute.setBindGroup(0, this.bindgroups["spark_bind_group"]);
    compute.dispatchWorkgroups(
      Math.ceil(this.effect.get_max_particles() / this.workgroup_size),
    );
    compute.end();
  }

  encode_render_pass(encoder: GPUCommandEncoder, view: GPUTextureView) {
    const render = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: view,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    render.setPipeline(this.render_pipelines["render_pipeline"]);
    render.setBindGroup(0, this.bindgroups["render_bind_group"]);
    render.draw(6, this.effect.get_max_particles()); // 6 vertices × N instances
    render.end();
  }

  // #region --- Helper functions ----------------------------------------------
  /**
   *
   * Dynamically load the particle engine shaders
   *
   * @param name - The name for the shader set
   * @returns the shaders
   */
  private load_shaders() {
    var comp_s = `fireworks_comp`;
    var vert_s = `fireworks_vert`;
    var frag_s = `fireworks_frag`;

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
   * Log any errors reported during shader creation
   *
   * @param shader - The shader to do error reporting for
   */
  private async log_shader_errors(shader: GPUShaderModule) {
    const info = await shader.getCompilationInfo();
    for (const msg of info.messages) {
      if (msg.type === "error") {
        console.error(`shader error: ${msg.message} (line ${msg.lineNum})`);
      }
    }
  }
  // #endregion ----------------------------------------------------------------
}
