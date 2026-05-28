import { EffectRenderer } from "./EffectRenderer";
import { BoidsEffect } from "../../public/effects/BoidsEffect";
import { shader_registry } from "../shaders";
import { EmitterConfig } from "../../public/EmitterConfig";

export class BoidsRenderer implements EffectRenderer {
  private compute_pipelines: Record<string, GPUComputePipeline> = {};
  private render_pipelines: Record<string, GPURenderPipeline> = {};
  private buffers: Record<string, GPUBuffer> = {};
  private bindgroups: Record<string, GPUBindGroup> = {};
  private shaders: Record<string, GPUShaderModule> = {};
  private frame_index = 0;
  private max_particles;
  private particle_stride = 32; // standard particle size
  private workgroup_size = 64; // standard workgroup size

  constructor(effect: BoidsEffect) {
    this.max_particles = effect.get_max_particles();
    effect.seed_particles();
  }

  static initialize(effect: BoidsEffect) {
    let result = new BoidsRenderer(effect);
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
      label: "particles-0",
      size: this.max_particles * this.particle_stride,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    buffers["particle_buffer_1"] = device.createBuffer({
      label: "particles-1",
      size: this.max_particles * this.particle_stride,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.buffers = buffers;
  }

  create_compute_pipelines(device: GPUDevice) {
    let results: Record<string, GPUComputePipeline> = {};
    results["compute_pipeline"] = device.createComputePipeline({
      label: "compute_pipeline",
      layout: "auto",
      compute: { module: this.shaders["compute"], entryPoint: "main" },
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
    this.bindgroups["compute_bind_group_0"] = device.createBindGroup({
      layout: this.compute_pipelines["compute_pipeline"].getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform_buffers["uniform_buffer"] } }, // write
        { binding: 1, resource: { buffer: this.buffers["particle_buffer_0"] } },
        { binding: 2, resource: { buffer: this.buffers["particle_buffer_1"] } }, // read
      ],
    });
    this.bindgroups["compute_bind_group_1"] = device.createBindGroup({
      layout: this.compute_pipelines["compute_pipeline"].getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform_buffers["uniform_buffer"] } }, // read
        { binding: 1, resource: { buffer: this.buffers["particle_buffer_1"] } }, // write
        { binding: 2, resource: { buffer: this.buffers["particle_buffer_0"] } },
      ],
    });
    this.bindgroups["render_bind_group_0"] = device.createBindGroup({
      layout: this.render_pipelines["render_pipeline"].getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: uniform_buffers["uniform_buffer"] } },
        { binding: 1, resource: { buffer: this.buffers["particle_buffer_1"] } },
      ],
    });
  }

  write_particles_to_buffer(device: GPUDevice, emitter_config: EmitterConfig) {
    let data = new Float32Array(
      this.max_particles * (this.particle_stride / 4),
    );

    for (let i = 0; i < this.max_particles; i++) {
      const offset = i * 12;

      // #region --- Generate the particles position based on emitter type -----
      let x, y;
      switch (emitter_config.type) {
        case "point":
          x = emitter_config.pos[0];
          y = emitter_config.pos[1];
          break;

        case "circle":
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.sqrt(Math.random()) * (emitter_config.p1 ?? 0);
          x = emitter_config.pos[0] + Math.cos(angle) * radius;
          y = emitter_config.pos[1] + Math.sin(angle) * radius;
          break;

        case "rect":
          x =
            emitter_config.pos[0] +
            (Math.random() - 0.5) * (emitter_config.p1 ?? 1);
          y =
            emitter_config.pos[1] +
            (Math.random() - 0.5) * (emitter_config.p2 ?? 0);
          break;

        default:
          x = 0;
          y = 0;
      }
      // #endregion ------------------------------------------------------------

      // #region --- Add to the buffer array -----------------------------------
      // position (vec2f) — scatter randomly so they don't all spawn at once
      data[offset + 0] = x; // x
      data[offset + 1] = y; // y

      // velocity (vec2f)
      data[offset + 2] = (Math.random() - 0.5) * 400; // vx
      data[offset + 3] = Math.random() * 300 + 0.2; // vy

      // color (vec4f)
      data[offset + 4] = Math.random(); // r
      data[offset + 5] = Math.random(); // g
      data[offset + 6] = Math.random(); // b
      data[offset + 7] = 1.0; // a

      data[offset + 8] = 0.0; // seed
      data[offset + 9] = Math.random(); // life
      data[offset + 10] = 1.0; // maxLife
      data[offset + 11] = Math.random() * 8.0 + 4.0; // size (4–12px)
      // #endregion
    }

    device.queue.writeBuffer(this.buffers["particle_buffer_0"], 0, data);
  }

  destroy() {
    /* release GPU resources */
  }

  encode_compute_pass(encoder: GPUCommandEncoder) {
    let compute = encoder.beginComputePass();
    const bind_group = "compute_bind_group_" + (this.frame_index % 2);
    compute.setPipeline(this.compute_pipelines["compute_pipeline"]);
    compute.setBindGroup(0, this.bindgroups[bind_group]);
    compute.dispatchWorkgroups(
      Math.ceil(this.max_particles / this.workgroup_size),
    );
    compute.end();
    this.frame_index++;
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
    render.setBindGroup(0, this.bindgroups["render_bind_group_0"]);
    render.draw(6, this.max_particles); // 6 vertices × N instances
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
    var comp_s = `boids_comp`;
    var vert_s = `boids_vert`;
    var frag_s = `boids_frag`;

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
