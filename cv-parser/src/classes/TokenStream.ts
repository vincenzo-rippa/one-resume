import type { Token } from "marked";
import type Ctx from "../Ctx.ts";
import { isSkippable, tokenLine } from "../helpers/internals";
import err from "../helpers/error";

export default class TokenStream {
  private idx = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly ctx: Ctx,
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
      throw err(this.ctx, "unexpected end of file", { line: this.lastLine() });
    }
    return token;
  }

  /** Approximate line number of the most recently emitted token (for errors). */
  lastLine(): number | undefined {
    const probe = this.tokens[Math.max(0, this.idx - 1)];
    return tokenLine(probe, this.ctx.source);
  }

  hasMore(): boolean {
    this.consumeSkippable();
    return this.idx < this.tokens.length;
  }

  ctxRef(): Ctx {
    return this.ctx;
  }
}
