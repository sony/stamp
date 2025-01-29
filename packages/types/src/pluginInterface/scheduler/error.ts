export class SchedulerError extends Error {
  constructor(systemMessage: string, public userMessage?: string) {
    super(systemMessage);
  }
}
