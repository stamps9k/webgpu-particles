import { ParticleEffect } from "./ParticleEffect";
import { Particle } from "../Particle";
import { ShaderParams } from "../ShaderParams";
import { ParticleType } from "../enums/ParticleTypes";
import { ValidationRule, validate } from "../types/ValidationRule";

/**
 *
 * A class Representing the fireworks particle effect
 *
 */
export class BoidsEffect implements ParticleEffect {
  // #region --- The class properties ------------------------------------------
  readonly kind = "BOIDS" as const;
  private MAX_PARTICLES;
  private PERCEPTION_RADIUS;
  private SEPERATION_RADIUS;
  private SEPERATION_WEIGHT;
  private ALIGNMENT_WEIGHT;
  private COHESION_WEIGHT;
  private MAX_SPEED;
  private MAX_FORCE;
  private ping_pong = true;
  private frame_index = 0;

  private static rules: ValidationRule<BoidsEffect>[] = [
    {
      check: (e) => e.MAX_PARTICLES > 0,
      message: "Max Particles must be greater than 0",
    },
    {
      check: (e) => e.MAX_PARTICLES <= 100000,
      message: "Max particles must not exceed 100,000",
    },
  ];
  // #endregion ----------------------------------------------------------------

  /**
   * The class constructor. Takes the user definable properties and returns an instance of the class
   *
   * @param max_particles - The max number of particles for the effect
   * @param rocket_number - The max number of rockets for the effect
   */
  public constructor(
    max_particles: number,
    perception_radius: number,
    seperation_radius: number,
    seperation_weight: number,
    alignment_weight: number,
    cohesion_weight: number,
    max_speed: number,
    max_force: number,
  ) {
    this.MAX_PARTICLES = max_particles;
    this.PERCEPTION_RADIUS = perception_radius;
    this.SEPERATION_RADIUS = seperation_radius;
    this.SEPERATION_WEIGHT = seperation_weight;
    this.ALIGNMENT_WEIGHT = alignment_weight;
    this.COHESION_WEIGHT = cohesion_weight;
    this.MAX_SPEED = max_speed;
    this.MAX_FORCE = max_force;
  }

  /**
   * Generate all the particles for the intial buffering of the cpu.
   *
   * @returns - An array of particles with random initial values
   *
   */
  seed_particles(): Particle[] {
    return Array.from({ length: this.MAX_PARTICLES }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 300;

      return {
        position: [0, 0],
        velocity: [Math.cos(angle) * speed, Math.sin(angle) * speed],
        color: [Math.random(), Math.random(), Math.random(), 1.0],
        seed: Math.random(),
        maxLife: 1.0 + Math.random() * 2.0,
        life: 1.0 + Math.random() * 2.0,
        size: 2 + Math.random() * 6,
        type: ParticleType.Square,
      };
    });
  }

  /**
   * Get the various custom shader particle parameters
   *
   * @returns an object representing the custom shader params.
   */
  get_shader_params(): ShaderParams {
    return {
      sp0: this.PERCEPTION_RADIUS, // - Perception Radius
      sp1: this.SEPERATION_RADIUS, // - Separation radius
      sp2: this.SEPERATION_WEIGHT, // - Separation weight
      sp3: this.ALIGNMENT_WEIGHT, // - Alignment weight
      sp4: this.COHESION_WEIGHT, // - Cohesion weight
      sp5: this.MAX_SPEED, // - Max speed
      sp6: this.MAX_FORCE, // - Max force
      sp7: 0, // - Unused
      sp8: 0, // - Unused
      sp9: 0, // - Unused
      sp10: 0, // - Unused
    };
  }

  /**
   * Getter for the max_particles property.
   *
   * @returns - the maximum number of particles for the effect.
   */
  get_max_particles(): number {
    return this.MAX_PARTICLES;
  }

  /**
   * Fetch the name of the effect as a string
   *
   */
  get_effect_name(): string {
    return "boids";
  }

  get_frame_index(): number {
    return this.frame_index;
  }

  increment_frame_index() {
    this.frame_index = this.frame_index + 1;
  }

  /**
   * Check if the effect uses ping pong buffering or not. This is used by the engine to determine how to buffer the particles on the gpu.
   * @returns - a boolean representing whether the effect uses ping pong buffering or not.
   */
  is_ping_pong(): boolean {
    return this.ping_pong;
  }

  /**
   * Validate the object properties
   *
   * @returns
   */
  validate(): ValidationResult {
    return validate(this, BoidsEffect.rules);
  }
}
