// Function to format dates
const format = require("date-fns/format");

// Return integers in the range betwenn start and end

type RangeProps = { start: number; end: number };

export const range = ({ start, end }: RangeProps): number[] => {
  return Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);
};

// Get the current datetime with a specific format
export const getCurrentDateTime = (): string =>
  format(new Date(), "d/M/Y, HH:mm:ss");

export const sleep = (delayMs: number) => {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
};
