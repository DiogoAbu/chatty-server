import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import User from '!/entities/User';

@ValidatorConstraint({ async: true })
export class IsEmailNotUniqueConstraint implements ValidatorConstraintInterface {
  async validate(email: string): Promise<boolean> {
    const found = await User.findOne({ email });
    return !found;
  }
  defaultMessage(_args: ValidationArguments): string {
    return 'Email already exists';
  }
}

export function IsEmailNotUnique(
  validationOptions?: ValidationOptions,
): (object: Record<string, unknown>, propertyName: string) => void {
  return (object, propertyName) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailNotUniqueConstraint,
    });
  };
}
