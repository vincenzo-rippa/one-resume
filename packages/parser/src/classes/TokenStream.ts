import type { Token, Tokens } from "marked";
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
    while (i < this.tokens.length && this.isSkippable(this.tokens[i])) i++;
    return this.tokens[i];
  }

  next(): Token | undefined {
    return this.tokens[this.idx++];
  }

  consumeSkippable(): void {
    while (
      this.idx < this.tokens.length &&
      this.isSkippable(this.tokens[this.idx])
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

  peekedMeaningful_IsItalicOnlyParagraph(): boolean {
    const next = this.peekMeaningful();
    if (!next) return false;
    return this.isItalicOnlyParagraph(next);
  }

  consumedMeaningful_IsItalicOnlyParagraph(): Token | undefined {
    const next = this.consumeMeaningful();
    if (next && this.isItalicOnlyParagraph(next)) return next;
  }

  private isItalicOnlyParagraph(token: Token): boolean {
    if (token.type !== "paragraph") return false;
    const para = token as Tokens.Paragraph;
    if (!para.tokens || para.tokens.length !== 1) return false;
    return para.tokens[0].type === "em";
  }

  private isSkippable(token: Token | undefined): boolean {
    if (!token) return false;
    if (token.type === "space") return true;
    if (token.type === "html") {
      // HTML comments are skippable; other raw HTML is unexpected.
      const raw = (token as Tokens.HTML).raw ?? "";
      return /^\s*<!--[\s\S]*-->\s*$/.test(raw);
    }
    return false;
  }

  private tokenLine(token: Token): number | undefined {
    if (!token) return undefined;
    // Marked doesn't track line numbers directly; locate by raw text.
    const raw = (token as { raw?: string }).raw;
    if (!raw) return undefined;
    const idx = this.source.indexOf(raw);
    if (idx < 0) return undefined;
    return this.source.slice(0, idx).split("\n").length;
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
      line: this.tokenLine(probe),
    });
  }
}
