import { EmitterConfig } from "../..";

export interface EffectRenderer {
  destroy(): void;

  create_shaders(device: GPUDevice): void;
  create_buffers(device: GPUDevice): void;
  create_compute_pipelines(device: GPUDevice): void;
  create_render_pipelines(device: GPUDevice): void;
  create_bindgroups(
    device: GPUDevice,
    uniform_buffers: Record<string, GPUBuffer>,
  ): void;
  write_particles_to_buffer(
    device: GPUDevice,
    emitter_config: EmitterConfig,
  ): void;

  encode_compute_pass(encoder: GPUCommandEncoder): void;

  encode_render_pass(encoder: GPUCommandEncoder, view: GPUTextureView): void;
}
