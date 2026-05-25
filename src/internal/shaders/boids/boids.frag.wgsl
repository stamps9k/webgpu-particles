struct FragmentInput {
    @location(0) color : vec4f,
}

@fragment
fn fs_main(input: FragmentInput) -> @location(0) vec4f {
    return input.color;
}