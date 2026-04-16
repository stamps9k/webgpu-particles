export interface WebGPUContextOptions {
  powerPreference?: GPUPowerPreference;
  antialias?: boolean;
}

export class WebGPUContext {
  readonly canvas: HTMLCanvasElement;
  readonly adapter: GPUAdapter;
  readonly device: GPUDevice;
  readonly context: GPUCanvasContext;
  readonly format: GPUTextureFormat;

  private depthTexture: GPUTexture;
  private depthView: GPUTextureView;

  private constructor(
    canvas: HTMLCanvasElement,
    adapter: GPUAdapter,
    device: GPUDevice,
    context: GPUCanvasContext,
    format: GPUTextureFormat,
    depthTexture: GPUTexture,
    depthView: GPUTextureView,
  ) {
    this.canvas = canvas;
    this.adapter = adapter;
    this.device = device;
    this.context = context;
    this.format = format;
    this.depthTexture = depthTexture;
    this.depthView = depthView;
  }

  // -------------------------------------------------------------------------
  // Initialisation
  // -------------------------------------------------------------------------

  static async init(
    canvas: HTMLCanvasElement,
    options: WebGPUContextOptions = {},
  ): Promise<WebGPUContext> {
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

    const { depthTexture, depthView } = WebGPUContext.createDepthTexture(
      device,
      canvas.width,
      canvas.height,
    );

    return new WebGPUContext(
      canvas,
      adapter,
      device,
      context,
      format,
      depthTexture,
      depthView,
    );
  }

  // -------------------------------------------------------------------------
  // Frame helpers
  // -------------------------------------------------------------------------

  /** Returns the current swap-chain texture view to use as the render target. */
  getCurrentColorView(): GPUTextureView {
    return this.context.getCurrentTexture().createView();
  }

  getDepthView(): GPUTextureView {
    return this.depthView;
  }

  /**
   * Creates a basic render pass descriptor pointed at the current
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
      ],
      depthStencilAttachment: {
        view: this.depthView,
        depthClearValue: 1.0,
        depthLoadOp: "clear",
        depthStoreOp: "store",
      },
    };
  }

  beginFrame(): GPUCommandEncoder {
    return this.device.createCommandEncoder();
  }

  endFrame(encoder: GPUCommandEncoder): void {
    this.device.queue.submit([encoder.finish()]);
  }

  // -------------------------------------------------------------------------
  // Resource helpers
  // -------------------------------------------------------------------------

  createBuffer(
    size: number,
    usage: GPUBufferUsageFlags,
    label?: string,
  ): GPUBuffer {
    return this.device.createBuffer({ size, usage, label });
  }

  writeBuffer(buffer: GPUBuffer, data: BufferSource, bufferOffset = 0): void {
    this.device.queue.writeBuffer(buffer, bufferOffset, data);
  }

  createShaderModule(code: string, label?: string): GPUShaderModule {
    return this.device.createShaderModule({ code, label });
  }

  createBindGroupLayout(
    entries: GPUBindGroupLayoutEntry[],
    label?: string,
  ): GPUBindGroupLayout {
    return this.device.createBindGroupLayout({ entries, label });
  }

  createBindGroup(
    layout: GPUBindGroupLayout,
    entries: GPUBindGroupEntry[],
    label?: string,
  ): GPUBindGroup {
    return this.device.createBindGroup({ layout, entries, label });
  }

  createComputePipeline(
    shaderModule: GPUShaderModule,
    entryPoint: string,
    layout: GPUPipelineLayout | "auto" = "auto",
    label?: string,
  ): GPUComputePipeline {
    return this.device.createComputePipeline({
      label,
      layout,
      compute: { module: shaderModule, entryPoint },
    });
  }

  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline {
    return this.device.createRenderPipeline(descriptor);
  }

  // -------------------------------------------------------------------------
  // Resize
  // -------------------------------------------------------------------------

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;

    this.depthTexture.destroy();

    const { depthTexture, depthView } = WebGPUContext.createDepthTexture(
      this.device,
      width,
      height,
    );

    this.depthTexture = depthTexture;
    this.depthView = depthView;
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  destroy(): void {
    this.depthTexture.destroy();
    this.context.unconfigure();
    this.device.destroy();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  private static createDepthTexture(
    device: GPUDevice,
    width: number,
    height: number,
  ): { depthTexture: GPUTexture; depthView: GPUTextureView } {
    const depthTexture = device.createTexture({
      size: { width, height },
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
      label: "depth-texture",
    });

    return { depthTexture, depthView: depthTexture.createView() };
  }
}