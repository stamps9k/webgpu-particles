export const frag_shader = `
// ── input from vertex shader ──────────────────────────────────────────────────

struct FragmentIn {
    @location(0) color : vec4f,
    @location(1) uv    : vec2f,
}

// ── entry point ───────────────────────────────────────────────────────────────

@fragment
fn fs_main(in: FragmentIn) -> @location(0) vec4f {

    // Remap UV from [0,1] to [-1,1] so the center is (0,0)
    let centered = in.uv * 2.0 - 1.0;

    // Distance from center — 0.0 at core, 1.0 at edge
    let dist = length(centered);

    // Discard corners of the quad to make a circle
    if (dist > 1.0) { discard; }

    // Soft falloff — bright core, fades to transparent edge
    let alpha = smoothstep(1.0, 0.0, dist) * in.color.a;

    return vec4f(in.color.rgb, alpha);
}
`