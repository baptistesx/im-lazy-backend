// Function to format dates
var format = require("date-fns/format");

// Return integers in the range betwenn start and end
export const range = (start, end) => {
  return Array(end - start + 1)
    .fill(end - start + 1)
    .map((_, idx) => start + idx);
};

// Get the current datetime with a specific format
export const getCurrentDateTime = () => format(new Date(), "d/M/Y, HH:mm:ss");

export const sleep = (ms) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
