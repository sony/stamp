export class DBError extends Error {
  constructor(systemMessage: string, public userMessage?: string) {
    super(systemMessage);
  }
}
