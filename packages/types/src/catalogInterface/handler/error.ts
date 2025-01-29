export type HandlerErrorCode = "INTERNAL_SERVER_ERROR" | "BAD_REQUEST" | "NOT_FOUND";
export class HandlerError extends Error {
  constructor(public systemMessage: string, public code: HandlerErrorCode, public userMessage?: string) {
    super(systemMessage);
  }
}
