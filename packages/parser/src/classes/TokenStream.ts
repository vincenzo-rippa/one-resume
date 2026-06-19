import type { Token, Tokens } from "marked";
import { ParseError } from "./ParseError.ts";

/**
 * A cursor over a marked token list that owns the original source text and an
 * optional diagnostic label (`sourceName`). It is the single home for
 * token-shape recognition (headings, italic paragraphs, rules); readers ask it
 * for typed tokens and build `ParseError`s through `error()`. It deals only in
 * tokens — text normalization (helpers/inline, helpers/normalize) is a separate
 * concern.
 */
export class TokenStream {
  private idx = 0;
  constructor(
    private readonly tokens: Token[],
    private readonly source: string,
    private readonly sourceName?: string,
  ) {}

  /** Peek the next meaningful token (skips space and html-comment tokens). */
  peekMeaningful(): Token | undefined {
    let i = this.idx;
    while (i < this.tokens.length && this.isSkippable(this.tokens[i])) i++;
    return this.tokens[i];
  }

  /** Consume and return the next meaningful token; throws at EOF. */
  consumeMeaningful(): Token {
    this.consumeSkippable();
    const token = this.tokens[this.idx++];
    if (!token) throw this.error("unexpected end of file");
    return token;
  }

  /** Consume a heading at one of `depths`, or throw a labelled error. */
  consumeHeading(depths: readonly number[], what: string): Tokens.Heading {
    const token = this.consumeMeaningful();
    if (
      token.type !== "heading" ||
      !depths.includes((token as Tokens.Heading).depth)
    ) {
      throw this.error(`expected ${what}, got ${token.type}`, token);
    }
    return token as Tokens.Heading;
  }

  /** Consume + return the next token iff it's an italic-only paragraph (`_…_`);
   *  otherwise leave it in place and return undefined. */
  consumeItalicParagraph(): Tokens.Paragraph | undefined {
    const next = this.peekMeaningful();
    if (!next || !this.isItalicOnlyParagraph(next)) return undefined;
    this.consumeMeaningful();
    return next as Tokens.Paragraph;
  }

  /** Skip an optional `---` horizontal rule (a presentational separator). */
  skipHorizontalRule(): void {
    if (this.peekMeaningful()?.type === "hr") this.consumeMeaningful();
  }

  private consumeSkippable(): void {
    while (
      this.idx < this.tokens.length &&
      this.isSkippable(this.tokens[this.idx])
    ) {
      this.idx++;
    }
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

  private isItalicOnlyParagraph(token: Token): boolean {
    if (token.type !== "paragraph") return false;
    const para = token as Tokens.Paragraph;
    return para.tokens?.length === 1 && para.tokens[0].type === "em";
  }

  private tokenLine(token: Token | undefined): number | undefined {
    const raw = (token as { raw?: string } | undefined)?.raw;
    if (!raw) return undefined;
    const idx = this.source.indexOf(raw);
    return idx < 0 ? undefined : this.source.slice(0, idx).split("\n").length;
  }

  /**
   * Build a ParseError tagged with this stream's source label and a line number
   * (from `token`, else the most recently emitted token).
   */
  error(message: string, token?: Token): ParseError {
    const probe = token ?? this.tokens[Math.max(0, this.idx - 1)];
    return new ParseError(message, {
      sourceName: this.sourceName,
      line: this.tokenLine(probe),
    });
  }
}
