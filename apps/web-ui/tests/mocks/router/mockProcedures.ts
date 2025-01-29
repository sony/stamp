type OutputType<T> = T extends { _def: { _output_out: infer O } } ? O : never;

export function createMockProcedure<OriginalProcedure>(mockData: OutputType<OriginalProcedure>) {
  return () => mockData;
}
