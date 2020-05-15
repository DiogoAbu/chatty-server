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
  async validate(email: string) {
    const found = await User.findOne({ email });
    return !found;
  }
  defaultMessage(_args: ValidationArguments) {
    return 'Email already exists';
  }
}

export function IsEmailNotUnique(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsEmailNotUniqueConstraint,
    });
  };
}
