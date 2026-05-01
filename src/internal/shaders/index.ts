// All shaders imported for reference in library
import scatter_fade_frag from './scatter-fade/scatter-fade.frag.wgsl';
import scatter_fade_vert from './scatter-fade/scatter-fade.vert.wgsl';
import scatter_fade_comp from './scatter-fade/scatter-fade.comp.wgsl';
import scatter_swirl_frag from './scatter-swirl/scatter-swirl.frag.wgsl';
import scatter_swirl_vert from './scatter-swirl/scatter-swirl.vert.wgsl';
import scatter_swirl_comp from './scatter-swirl/scatter-swirl.comp.wgsl';

// Registry for dynamic lookup
export const shader_registry = {
  scatter_fade_frag,
  scatter_fade_vert,
  scatter_fade_comp,
  scatter_swirl_frag,
  scatter_swirl_vert,
  scatter_swirl_comp,
} as const;

export type ShaderRegistry = typeof shader_registry;