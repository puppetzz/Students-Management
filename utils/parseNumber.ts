export const parseNumber = (s: string | number): number | undefined => {
  if (isNaN(Number(s))) {
    return undefined;
  }

  return Number(s);
};
