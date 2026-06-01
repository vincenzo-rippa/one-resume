export default class ParseError extends Error {
  file?: string;
  line?: number;
  constructor(message: string, opts: { file?: string; line?: number } = {}) {
    super(formatMessage(message, opts));
    this.name = "ParseError";
    this.file = opts.file;
    this.line = opts.line;
  }
}

function formatMessage(
  message: string,
  opts: { file?: string; line?: number },
): string {
  const prefix = opts.file
    ? `${opts.file}${opts.line ? `:${opts.line}` : ""}: `
    : "";
  return `${prefix}${message}`;
}
