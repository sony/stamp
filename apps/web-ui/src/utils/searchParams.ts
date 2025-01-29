export const getParamAsString = (searchParams: { [key: string]: string | string[] | undefined }, key: string): string | undefined => {
  const param = searchParams[key];
  if (typeof param === "string") {
    return param;
  }
  return undefined;
};
