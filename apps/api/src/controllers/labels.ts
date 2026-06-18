import type { RouterContext } from "@koa/router";
import {
  pdfLabels,
  docxLabels,
  SUPPORTED_LOCALES,
  type Locale,
} from "@one-resume/localization";

function requireLocale(ctx: RouterContext): Locale {
  const locale = ctx.params.locale;
  ctx.assert(
    SUPPORTED_LOCALES.includes(locale),
    400,
    `'locale' parameter must be one of: ${SUPPORTED_LOCALES.join(", ")}`,
  );

  return locale;
}

export async function getPdfLabels(ctx: RouterContext): Promise<void> {
  ctx.body = pdfLabels(requireLocale(ctx));
}

export async function getDocxLabels(ctx: RouterContext): Promise<void> {
  ctx.body = docxLabels(requireLocale(ctx));
}
