struct VertexOut {
    @builtin(position) pos   : vec4f,
    @location(0)       uv    : vec2f,
    @location(1)       color : vec4f,
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
    let d = length(in.uv);
    if (d > 1.0) { discard; }

    // Tighter core than scatter — vortex energy concentrates at centre
    let core = 1.0 - smoothstep(0.0, 0.6, d);
    let glow  = pow(core, 2.0);

    // Life drives the colour gradient
    // life ≈ 1.0 → fresh particle: hot white-cyan
    // life ≈ 0.0 → dying particle: deep purple
    let life      = in.color.a;
    let hotColor  = vec3f(0.85, 1.00, 1.00);
    let coldColor = vec3f(0.15, 0.00, 0.40);
    let baseColor = mix(coldColor, hotColor, pow(life, 0.5));

    return vec4f(baseColor * glow, glow * life);
}