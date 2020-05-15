// https://stackoverflow.com/a/27725806
export default function randomInteger(length: number): number {
  return Math.floor(
    Math.pow(10, length - 1) +
      Math.random() * (Math.pow(10, length) - Math.pow(10, length - 1) - 1),
  );
}
