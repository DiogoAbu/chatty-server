import { ValidationArguments } from 'class-validator';

export function messageLength(args: ValidationArguments): string {
  const [min, max] = args.constraints;
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${min ?? 0},${max ?? 0}`;
}
