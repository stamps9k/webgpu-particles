import { ParticleEffect } from "../..";
import { Emitter } from "../../public/types/Emitters";

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
  write_particles_to_buffer(device: GPUDevice, emitter: Emitter): void;

  encode_compute_pass(encoder: GPUCommandEncoder, effect: ParticleEffect): void;

  encode_render_pass(encoder: GPUCommandEncoder, view: GPUTextureView): void;
}
