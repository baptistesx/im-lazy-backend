export const range = (start, end) => {
  return Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);
};
