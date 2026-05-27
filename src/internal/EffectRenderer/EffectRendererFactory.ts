import { ParticleEffect } from "../../public/effects/ParticleEffect";
import { EffectRenderer } from "./EffectRenderer";

import { BoidsEffect } from "../../public/effects/BoidsEffect";
import { ScatterFadeEffect } from "../../public/effects/ScatterFadeEffect";
import { ScatterSwirlEffect } from "../../public/effects/ScatterSwirlEffect";
import { FireworksEffect } from "../../public/effects/FireworksEffect";

import { ScatterFadeRenderer } from "./ScatterFadeRenderer";
import { FireworksRenderer } from "./FireworksRenderer";
import { BoidsRenderer } from "./BoidsRenderer";
import { ScatterSwirlRenderer } from "./ScatterSwirlRenderer";
import { Emitter } from "../../public/types/Emitters";

export class EffectRendererFactory {
  static async initialize(
    effect: ParticleEffect,
    emitter: Emitter,
    device: GPUDevice,
    uniform_buffers: Record<string, GPUBuffer>,
  ): Promise<EffectRenderer> {
    let result: EffectRenderer;

    switch (effect.kind) {
      case "BOIDS":
        result = BoidsRenderer.initialize(effect as BoidsEffect);
        break;
      case "FIREWORKS":
        result = FireworksRenderer.initialize(effect as FireworksEffect);
        break;
      case "SCATTER_FADE":
        result = ScatterFadeRenderer.initialize(effect as ScatterFadeEffect);
        break;
      case "SCATTER_SWIRL":
        result = ScatterSwirlRenderer.initialize(effect as ScatterSwirlEffect);
        break;
      default:
        throw new Error(`Unknown effect type: ${effect.kind}`);
    }

    console.log("device before shader compile:", device.label);
    await result.create_shaders(device);
    console.log("device after shader compile:", device.label);
    result.create_buffers(device);
    result.create_compute_pipelines(device);
    result.create_render_pipelines(device);
    result.create_bindgroups(device, uniform_buffers);
    result.write_particles_to_buffer(device, emitter);
    return result;
  }
}
