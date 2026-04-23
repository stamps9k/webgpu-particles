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
	readonly shaders: Record<string, GPUShaderModule>;
	readonly compute_pipeline: GPUComputePipeline;
	readonly render_pipeline: GPURenderPipeline;
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
		shaders: Record<string, GPUShaderModule>,
		buffers: Record<string, GPUBuffer>,
		compute_pipeline: GPUComputePipeline,
		render_pipeline: GPURenderPipeline,
		bind_groups: Record<string, GPUBindGroup>,
  ) {
    this.adapter = adapter;
    this.device = device;
    this.context = context;
    this.format = format;
		this.shaders = shaders;
		this.bind_groups = bind_groups;
		this.buffers = buffers;
		this.compute_pipeline = compute_pipeline;
		this.render_pipeline = render_pipeline;
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
		shaders_text: Record<string, string>,
		max_particles: number,
		particle_stride: number
  ): Promise<WebGPUContext> {
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
      console.error(`GPU device lost: ${info.message} (reason: ${info.reason})`);
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
		var shaders_compiled: Record<string, GPUShaderModule> = {};
		shaders_compiled["compute"] = device.createShaderModule({ 
			code: shaders_text["compute"], 
			label: "particle_compute_shader" 
		});
		this.log_shader_errors(shaders_compiled["compute"]);
		shaders_compiled["vert"] = device.createShaderModule({ 
			code: shaders_text["vert"], 
			label: "particle_vert_shader"
		});
		this.log_shader_errors(shaders_compiled["vert"]);
		shaders_compiled["frag"]	=	device.createShaderModule({ 
			code: shaders_text["frag"], 
			label: "particle_frag_shader"
		});
		this.log_shader_errors(shaders_compiled["frag"]);

		// -- Create the buffers
		var buffers: Record<string, GPUBuffer> = {};
		buffers["uniform_buffer"] = device.createBuffer({
				label: 'uniforms',
				size: 16,  // deltaTime(4) + time(4) + size (8)
				usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});
		buffers["particle_buffer"] = device.createBuffer({
			label: 'particles',
			size: max_particles * particle_stride,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		// -- Create the pipelines
		const compute_pipeline: GPUComputePipeline = this.createComputePipeline(
			device, 
			shaders_compiled, 
			"main", 
			"auto", 
			"compute_pipeline"
		);
		const render_pipeline: GPURenderPipeline = this.createRenderPipeline(
			device, 
			shaders_compiled
		);

		// -- Create the bind groups
		var bind_groups: Record<string, GPUBindGroup> = {};
		bind_groups["compute_bind_group"] = device.createBindGroup({
			layout: compute_pipeline.getBindGroupLayout(0),
    	entries: [
        { binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
        { binding: 1, resource: { buffer: buffers["particle_buffer"] } },
    	],	
		});
		bind_groups["render_bind_group"] = device.createBindGroup({
			layout: render_pipeline.getBindGroupLayout(0),
			entries: [
					{ binding: 0, resource: { buffer: buffers["uniform_buffer"] } },
					{ binding: 1, resource: { buffer: buffers["particle_buffer"] } },
			],
		});

		// -- Create an object to hold all variables
    return new WebGPUContext(
      adapter,
      device,
      context,
      format,
			shaders_compiled,
			buffers,
			compute_pipeline,
			render_pipeline,
			bind_groups,
    );
  }

  // -------------------------------------------------------------------------
  // Frame helpers
  // -------------------------------------------------------------------------

  /** Return the current swap-chain texture view to use as the render target. */
  getCurrentColorView(): GPUTextureView {
    return this.context.getCurrentTexture().createView();
  }

  /**
   * Create a basic render pass descriptor pointed at the current
   * swap-chain texture. Extend or replace as needed.
   */
  createRenderPassDescriptor(clearColor: GPUColor = { r: 0, g: 0, b: 0, a: 1 }): GPURenderPassDescriptor {
    return {
      colorAttachments: [
        {
          view: this.getCurrentColorView(),
          clearValue: clearColor,
          loadOp: "clear",
          storeOp: "store",
        },
      ]
    };
  }

	/**
	 * Create a command encoder to encode a list of commands to be consumed by the GPU
	 * 
	 * @returns 
	 */
  beginFrame(): GPUCommandEncoder {
    return this.device.createCommandEncoder();
  }

	/**
	 * Finish the encoder and pass to the device for processing
	 * 
	 * @param encoder 
	 */
  endFrame(encoder: GPUCommandEncoder): void {
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
	build_compute_pass(encoder: GPUCommandEncoder, uniform_data: Float32Array, max_particles: number, workgroup_size: number) {
		// compute pass — simulate
    var compute = encoder.beginComputePass();
    compute.setPipeline(this.compute_pipeline);
    compute.setBindGroup(0, this.bind_groups["compute_bind_group"]);
    compute.dispatchWorkgroups(Math.ceil(max_particles / workgroup_size));
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
	build_render_pass(encoder: GPUCommandEncoder, uniform_data: Float32Array, max_particles: number) {
		// render pass — draw
    const render = encoder.beginRenderPass({
			colorAttachments: [{
					view: this.context.getCurrentTexture().createView(),
					clearValue: { r: 0, g: 0, b: 0, a: 1 },
					loadOp:  'clear',
					storeOp: 'store',
			}],
    });
		render.setPipeline(this.render_pipeline);
    render.setBindGroup(0, this.bind_groups["render_bind_group"]);
    render.draw(6, max_particles);  // 6 vertices × N instances
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
  writeBuffer(buffer_name: string, bufferOffset = 0, data: BufferSource): void {
    this.device.queue.writeBuffer(this.buffers[buffer_name], bufferOffset, data);
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
	 * Create the compute pipeline
	 * 
	 * @param device - The device the pipeline will run on
	 * @param shaders - The shaders the pipeline will use
	 * @param entryPoint - The shader entrypoint
	 * @param layout - The GPUPipelineLayout
	 * @param label - The name for the pipeline
	 * @returns the copmute pipeline
	 */
	private static createComputePipeline(
	device: GPUDevice,
	shaders: Record<string, GPUShaderModule>,
	entryPoint: string,
	layout: GPUPipelineLayout | "auto" = "auto",
	label?: string): GPUComputePipeline {
	if (shaders["compute"] === null) { 
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
	 * @returns 
	 */
	private static createRenderPipeline(device: GPUDevice, shaders: Record<string, GPUShaderModule>): GPURenderPipeline {
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
                    srcFactor: 'src-alpha',
                    dstFactor: 'one-minus-src-alpha',
                    operation: 'add',
                },
                alpha: {
                    srcFactor: 'one',
                    dstFactor: 'one-minus-src-alpha',
                    operation: 'add',
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
				if (msg.type === 'error') {
					console.error(`shader error: ${msg.message} (line ${msg.lineNum})`);
				}
		}
	}
}