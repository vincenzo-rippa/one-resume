export default class ParseError extends Error {
  sourceName?: string;
  line?: number;
  constructor(
    message: string,
    opts: { sourceName?: string; line?: number } = {},
  ) {
    super(formatMessage(message, opts));
    this.name = "ParseError";
    this.sourceName = opts.sourceName;
    this.line = opts.line;
  }
}

function formatMessage(
  message: string,
  opts: { sourceName?: string; line?: number },
): string {
  const prefix = opts.sourceName
    ? `${opts.sourceName}${opts.line ? `:${opts.line}` : ""}: `
    : "";
  return `${prefix}${message}`;
}
