import type { Token } from "marked";
import { isSkippable, tokenLine } from "../helpers/internals";
import ParseError from "./ParseError";

/**
 * A cursor over a marked token list that owns the original source text and an
 * optional diagnostic label (`sourceName`). Readers ask it for the next
 * meaningful token and build `ParseError`s through `error()`, so no parser
 * context object has to be threaded around.
 */
export default class TokenStream {
  private idx = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
    private readonly sourceName?: string,
  ) {}

  peek(): Token | undefined {
    return this.tokens[this.idx];
  }

  /** Peek the next meaningful token (skips space and html-comment tokens). */
  peekMeaningful(): Token | undefined {
    let i = this.idx;
    while (i < this.tokens.length && isSkippable(this.tokens[i])) i++;
    return this.tokens[i];
  }

  next(): Token | undefined {
    return this.tokens[this.idx++];
  }

  consumeSkippable(): void {
    while (
      this.idx < this.tokens.length &&
      isSkippable(this.tokens[this.idx])
    ) {
      this.idx++;
    }
  }

  consumeMeaningful(): Token {
    this.consumeSkippable();
    const token = this.tokens[this.idx++];
    if (!token) {
      throw this.error("unexpected end of file");
    }
    return token;
  }

  hasMore(): boolean {
    this.consumeSkippable();
    return this.idx < this.tokens.length;
  }

  /**
   * Build a ParseError tagged with this stream's source label and a line
   * number. The line is computed from `token` when given, else from the most
   * recently emitted token.
   */
  error(message: string, token?: Token): ParseError {
    const probe = token ?? this.tokens[Math.max(0, this.idx - 1)];
    return new ParseError(message, {
      sourceName: this.sourceName,
      line: tokenLine(probe, this.source),
    });
  }
}
