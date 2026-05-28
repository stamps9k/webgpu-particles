import { ValidationRule, validate } from "./types/ValidationRule";

/**
 * A class representing the values needed to create an emitter.
 */
export class EmitterConfig {
  // #region --- The class properties -----------------------------------------
  public type: string;
  public pos: [number, number];
  public p1: number | null;
  public p2: number | null;
  private static rules: ValidationRule<EmitterConfig>[] = [
    {
      check: (e) =>
        e.type !== "Rect" && e.type !== "Circle" && e.type !== "Point",
      message: "Emitter type must be Rectangle, Circle or Point",
    },
  ];
  // #endregion ---------------------------------------------------------------

  /**
   * The class constructor. Takes the user definable properties and returns an instance of the class
   *
   * @param emitter_type - the type of the emitter
   * @param emitter_pos - the position of the emitter
   * @param emitter_p1 - Custom variable 1 for the emitter. Purpose depends on the shape.
   * @param emitter_p2 - Custom variable 2 for the emitter. Purpose depends on the shape.
   */
  public constructor(
    type: string,
    pos: [number, number],
    p1: number | null,
    p2: number | null,
  ) {
    this.type = type;
    this.pos = pos;
    this.p1 = p1;
    this.p2 = p2;
  }

  /**
   * Validate the object properties
   *
   * @returns
   */
  validate(): ValidationResult {
    return validate(this, EmitterConfig.rules);
  }
}
