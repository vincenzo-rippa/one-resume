export class IoError extends Error {
  constructor(
    readonly status: number,
    readonly message: string,
    readonly data?: Record<string, any>,
  ) {
    super(message);
  }
}
