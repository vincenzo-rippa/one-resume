export class AppError extends Error {
  constructor(
    readonly status: number,
    override readonly message: string,
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON(): { status: number; message: string } {
    return { status: this.status, message: this.message };
  }
}
