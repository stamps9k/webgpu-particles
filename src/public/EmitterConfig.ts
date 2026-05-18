import { ValidationRule, validate } from "./types/ValidationRule";

/**
 * A class representing the values needed to create an emitter.
 */
export class EmitterConfig {
  // #region --- The class properties -----------------------------------------
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

  /**
   * Validate the object properties
   *
   * @returns
   */
  validate(): ValidationResult {
    return validate(this, EmitterConfig.rules);
  }
}
