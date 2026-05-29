import { EmitterConfigPatch } from "./EmitterConfigPatch";
import { ValidationRule, validate } from "./types/ValidationRule";

/**
 * A class representing the values needed to create an emitter.
 */
export class EmitterConfig extends EmitterConfigPatch {
  // #region --- The class properties -----------------------------------------
  //
  public override type: string;
  public override pos: [number, number];
  protected static override rules: ValidationRule<EmitterConfigPatch>[] = [
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
    super(type, pos, p1, p2);
    this.type = type;
    this.pos = pos;
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
