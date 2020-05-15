import { ValidationArguments } from 'class-validator';

export const messageNotEmpty = 'Should not be empty';

function getPlural(value: number) {
  return value > 1 ? 's' : '';
}

export function messageLength(args: ValidationArguments) {
  const [min, max] = args.constraints;
  if (min > args.value.length) {
    return `Too short, minimum length is ${min} character${getPlural(min)}`;
  } else if (max < args.value.length) {
    return `Too long, maximum length is ${max} character${getPlural(max)}`;
  }
  return `Length should be between ${min} and ${max} characters`;
}
