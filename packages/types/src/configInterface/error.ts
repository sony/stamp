export class ConfigError extends Error {
  constructor(systemMessage: string, public userMessage?: string) {
    super(systemMessage);
  }
}
