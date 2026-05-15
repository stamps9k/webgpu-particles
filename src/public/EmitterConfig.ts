export class EmitterConfig {
  public emitter_type: string;
  public emitter_pos: [number, number];
  public emitter_p1: number | null;
  public emitter_p2: number | null;

  private static rules: ValidationRule<EmitterConfig>[] = [
    {
      check: (e) =>
        e.emitter_type !== "Rect" &&
        e.emitter_type !== "Circle" &&
        e.emitter_type !== "Point",
      message: "Emitter type must be Rectangle, Circle or Point",
    },
  ];

  public constructor(
    emitter_type: string,
    emitter_pos: [number, number],
    emitter_p1: number | null,
    emitter_p2: number | null,
  ) {
    this.emitter_type = emitter_type;
    this.emitter_pos = emitter_pos;
    this.emitter_p1 = emitter_p1;
    this.emitter_p2 = emitter_p2;
  }

  validate(): ValidationResult {
    return validate(this, EmitterConfig.rules);
  }
}
