import type Ctx from "../Ctx.ts";
import ParseError from "../classes/ParseError";

export default function err(
  ctx: Ctx,
  message: string,
  opts: { line?: number } = {},
): ParseError {
  return new ParseError(message, { file: ctx.file, line: opts.line });
}
