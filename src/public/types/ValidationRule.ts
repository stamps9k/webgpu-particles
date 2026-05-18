/** The ValidationRule type and its fields */
export type ValidationRule<T> = {
  check: (value: T) => boolean;
  message: string;
};

/**
 * The static validate function used to check all the validation rules of a type
 *
 * @param value - the object to be checked
 * @param rules - the rules to check it against
 * @returns - a ValidationResult either true or false with failure message.
 */
export function validate<T>(
  value: T,
  rules: ValidationRule<T>[],
): ValidationResult {
  for (const rule of rules) {
    if (!rule.check(value)) {
      return { valid: false, message: rule.message };
    }
  }
  return { valid: true };
}
