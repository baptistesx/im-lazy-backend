// Return integers in the range betwenn start and end
export const range = (start, end) => {
  return Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);
};
