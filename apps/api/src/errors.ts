export class IoError extends Error {
  constructor(
    readonly status: number,
    override readonly message: string,
    /** Debug context, logged server-side. NEVER serialized to a client. */
    readonly data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "IoError";
  }

  /**
   * Defence-in-depth: only `status` + `message` ever serialize. `data` (which
   * may carry internal context) is excluded, so an accidental `JSON.stringify`
   * of an IoError can never leak it.
   */
  toJSON(): { status: number; message: string } {
    return { status: this.status, message: this.message };
  }
}
