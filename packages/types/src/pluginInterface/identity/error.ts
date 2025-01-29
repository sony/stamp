export class IdentityPluginError extends Error {
  constructor(systemMessage: string, public userMessage?: string) {
    super(systemMessage);
  }
}
