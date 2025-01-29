export class NotificationError extends Error {
  constructor(systemMessage: string, public userMessage?: string) {
    super(systemMessage);
  }
}
