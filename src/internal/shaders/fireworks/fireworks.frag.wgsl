struct VertexOut {
    @builtin(position) pos   : vec4f,
    @location(0)       uv    : vec2f,
    @location(1)       color : vec4f,
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
	let isSpark = in.uv.y > 5.0;
	let uv      = select(in.uv, vec2f(in.uv.x, in.uv.y - 10.0), isSpark);

	if (!isSpark) {
    let d    = length(uv);
    if (d > 1.0) { discard; }

    let core = 1.0 - smoothstep(0.0, 0.5, d);
    let glow = pow(core, 2.0);

    let col = mix(vec3f(1.0, 0.8, 0.2), vec3f(1.0, 1.0, 1.0), core);
    return vec4f(col * glow, glow);

	} else {
    let crossSection = 1.0 - smoothstep(0.0, 1.0, abs(uv.x));

    let tip   = 1.0 - smoothstep(0.0, 0.6, uv.y);
    let tail  = 1.0 - smoothstep(-1.0, 0.2, uv.y);
    let along = tip * tail;

    let intensity = crossSection * along;
    if (intensity < 0.01) { discard; }

    let hotColor = vec3f(1.0, 1.0, 0.9);
    let col      = mix(in.color.rgb, hotColor, pow(intensity, 3.0));

    return vec4f(col * intensity, intensity * in.color.a);
	}
}