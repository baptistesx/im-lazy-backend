const format = require("date-fns/format");

type RangeProps = { start: number; end: number };

// Return integers in the range between start and end
export const range = ({ start, end }: RangeProps): number[] =>
  Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);

// Get the current datetime with a specific format
export const getCurrentDateTime = (): string =>
  format(new Date(), "d/M/Y, HH:mm:ss");

export const sleep = (delayMs: number): Promise<Function> => {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
};
