import { ValidationRule, validate } from "./types/ValidationRule";
import { EmitterConfig } from "./EmitterConfig";

/**
 * A class representing the values needed to create an emitter.
 */
export class EmitterConfigPatch {
  // #region --- The class properties -----------------------------------------
  public type: string | null;
  public pos: [number | null, number | null] | null;
  public p1: number | null;
  public p2: number | null;
  protected static rules: ValidationRule<EmitterConfigPatch>[] = [
    {
      check: (e) => false,
      message:
        "This is a dummy validation rule that should never trigger. TODO replace with proper validation check",
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
    type: string | null,
    pos: [number | null, number | null] | null,
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
    return validate(this, EmitterConfigPatch.rules);
  }
}
