import { describe, expect, it } from "vitest";
import { BoidsEffect } from "../src/public/effects/BoidsEffect";
import { FireworksEffect } from "../src/public/effects/FireworksEffect";
import { ScatterFadeEffect } from "../src/public/effects/ScatterFadeEffect";
import { ScatterSwirlEffect } from "../src/public/effects/ScatterSwirlEffect";
import { EmitterConfig } from "../src/public/EmitterConfig";
import { EmitterShape } from "../src/public/enums/EmitterShapes";
import { Particle } from "../src/public/Particle";

// Effects are pure CPU-side configuration (validation, seeding, shader
// params), so they can be tested without a GPU. Rendering is not covered.

const make_boids = (max: number) =>
  new BoidsEffect(max, 50, 20, 1.5, 1, 1, 4, 0.1);

// Each effect with a factory taking max_particles, so the shared checks
// below run against all four.
const effects = [
  { name: "boids", make: make_boids, kind: "BOIDS", ping_pong: true },
  {
    name: "fireworks",
    make: (max: number) => new FireworksEffect(max, 1),
    kind: "FIREWORKS",
    ping_pong: false,
  },
  {
    name: "scatter-fade",
    make: (max: number) => new ScatterFadeEffect(max),
    kind: "SCATTER_FADE",
    ping_pong: false,
  },
  {
    name: "scatter-swirl",
    make: (max: number) => new ScatterSwirlEffect(max),
    kind: "SCATTER_SWIRL",
    ping_pong: false,
  },
];

function expect_valid_particle(p: Particle) {
  expect(p.position).toEqual([0, 0]);
  const speed = Math.hypot(p.velocity[0], p.velocity[1]);
  expect(speed).toBeGreaterThanOrEqual(100 - 1e-9);
  expect(speed).toBeLessThanOrEqual(400 + 1e-9);
  for (const c of p.color.slice(0, 3)) {
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThan(1);
  }
  expect(p.color[3]).toBe(1);
  expect(p.life).toBeGreaterThanOrEqual(1);
  expect(p.life).toBeLessThanOrEqual(3);
  expect(p.maxLife).toBeGreaterThanOrEqual(1);
  expect(p.maxLife).toBeLessThanOrEqual(3);
  expect(p.size).toBeGreaterThanOrEqual(2);
  expect(p.size).toBeLessThanOrEqual(8);
}

describe.each(effects)("$name effect", ({ make, kind, ping_pong }) => {
  it("reports its kind, max particles and buffering mode", () => {
    const effect = make(1000);
    expect(effect.kind).toBe(kind);
    expect(effect.get_max_particles()).toBe(1000);
    expect(effect.is_ping_pong()).toBe(ping_pong);
  });

  it("accepts max particles from 2 to 100,000", () => {
    expect(make(2).validate()).toEqual({ valid: true });
    expect(make(100000).validate()).toEqual({ valid: true });
  });

  it("rejects zero and more than 100,000 max particles", () => {
    expect(make(0).validate()).toEqual({
      valid: false,
      message: "Max Particles must be greater than 0",
    });
    expect(make(100001).validate()).toEqual({
      valid: false,
      message: "Max particles must not exceed 100,000",
    });
  });

  it("returns all eleven shader params as numbers", () => {
    const params = make(1000).get_shader_params();
    for (let i = 0; i <= 10; i++) {
      expect(typeof params[`sp${i}` as keyof typeof params]).toBe("number");
    }
  });
});

describe("particle seeding", () => {
  it("seeds max_particles particles for boids and the scatter effects", () => {
    for (const effect of [
      make_boids(500),
      new ScatterFadeEffect(500),
      new ScatterSwirlEffect(500),
    ]) {
      const particles = effect.seed_particles();
      expect(particles).toHaveLength(500);
      particles.forEach(expect_valid_particle);
    }
  });

  it("seeds one particle per rocket for fireworks", () => {
    const particles = new FireworksEffect(1000, 12).seed_particles();
    expect(particles).toHaveLength(12);
    particles.forEach(expect_valid_particle);
  });
});

describe("shader params", () => {
  it("passes the boids constructor values through in order", () => {
    const params = new BoidsEffect(
      1000,
      50,
      20,
      1.5,
      1.2,
      0.8,
      4,
      0.1,
    ).get_shader_params();
    expect([
      params.sp0,
      params.sp1,
      params.sp2,
      params.sp3,
      params.sp4,
      params.sp5,
      params.sp6,
    ]).toEqual([50, 20, 1.5, 1.2, 0.8, 4, 0.1]);
  });

  it("passes the fireworks rocket count through as sp3", () => {
    const params = new FireworksEffect(1000, 12).get_shader_params();
    expect(params.sp3).toBe(12);
    expect(params.sp0).toBeGreaterThan(0);
  });

  it("has no custom params for scatter-fade", () => {
    expect(
      Object.values(new ScatterFadeEffect(10).get_shader_params()),
    ).toEqual(Array(11).fill(0));
  });
});

describe("fireworks validation", () => {
  it("allows up to half the max particles as rockets", () => {
    expect(new FireworksEffect(1000, 500).validate()).toEqual({ valid: true });
  });

  it("rejects more rockets than half the max particles", () => {
    expect(new FireworksEffect(1000, 501).validate()).toEqual({
      valid: false,
      message: "Rocket count must not exceed 1/2 the max particles",
    });
  });
});

describe("EmitterConfig", () => {
  it("keeps its constructor values and validates", () => {
    const config = new EmitterConfig(EmitterShape.Circle, [10, 20], 5, null);
    expect(config.shape).toBe(EmitterShape.Circle);
    expect(config.pos).toEqual([10, 20]);
    expect(config.p1).toBe(5);
    expect(config.p2).toBeNull();
    expect(config.validate()).toEqual({ valid: true });
  });
});
