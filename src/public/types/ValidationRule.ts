type ValidationRule<T> = {
  check: (value: T) => boolean;
  message: string;
};

function validate<T>(value: T, rules: ValidationRule<T>[]): ValidationResult {
  for (const rule of rules) {
    if (!rule.check(value)) {
      return { valid: false, message: rule.message };
    }
  }
  return { valid: true };
}
