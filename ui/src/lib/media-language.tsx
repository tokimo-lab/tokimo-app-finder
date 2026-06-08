import type { ReactNode } from "react";

export function formatChannels(
  channels: number | null | undefined,
  locale: string,
): string | null {
  if (channels == null) return null;
  const normalizedLocale = locale.toLowerCase();
  const isChinese = normalizedLocale.startsWith("zh");
  const isJapanese = normalizedLocale.startsWith("ja");

  if (channels === 1) {
    if (isChinese) return "单声道";
    if (isJapanese) return "モノラル";
    return "Mono";
  }
  if (channels === 2) {
    if (isChinese) return "立体声";
    if (isJapanese) return "ステレオ";
    return "Stereo";
  }

  if (isChinese) return `${channels} 声道`;
  if (isJapanese) return `${channels}チャンネル`;
  return `${channels} channels`;
}

export function normalizeLanguageCode(language: string): string {
  const normalized = language.trim().toLowerCase();
  switch (normalized) {
    case "eng":
      return "en";
    case "zho":
    case "chi":
    case "cmn":
      return "zh";
    case "jpn":
      return "ja";
    case "deu":
    case "ger":
      return "de";
    case "fra":
    case "fre":
      return "fr";
    case "spa":
      return "es";
    case "kor":
      return "ko";
    default:
      return normalized;
  }
}

export function formatLanguage(
  language: string | null | undefined,
  locale: string,
): string | null {
  if (!language || language === "und") return null;
  const code = normalizeLanguageCode(language);
  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(code) ??
      language.toUpperCase()
    );
  } catch {
    return language.toUpperCase();
  }
}

export function getLanguageCountryCode(
  language: string | null | undefined,
): string | null {
  if (!language || language === "und") return null;

  const code = normalizeLanguageCode(language);
  const countryByLanguage: Record<string, string> = {
    en: "US",
    zh: "CN",
    ja: "JP",
    ko: "KR",
    de: "DE",
    fr: "FR",
    es: "ES",
    it: "IT",
    pt: "PT",
    ru: "RU",
    ar: "SA",
    hi: "IN",
    th: "TH",
    vi: "VN",
  };

  return countryByLanguage[code] ?? null;
}

interface FlagBadgeProps {
  countryCode: string | null;
  className?: string;
}

export function FlagBadge({ countryCode, className }: FlagBadgeProps) {
  if (!countryCode) return null;

  const mergedClassName =
    className ??
    "h-3.5 w-[18px] shrink-0 overflow-hidden rounded-[2px] border border-black/10";
  const commonProps = {
    viewBox: "0 0 18 12",
    className: mergedClassName,
    "aria-hidden": true,
  } as const;

  switch (countryCode) {
    case "US":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#fff" />
          <rect y="0" width="18" height="1" fill="#B22234" />
          <rect y="2" width="18" height="1" fill="#B22234" />
          <rect y="4" width="18" height="1" fill="#B22234" />
          <rect y="6" width="18" height="1" fill="#B22234" />
          <rect y="8" width="18" height="1" fill="#B22234" />
          <rect y="10" width="18" height="1" fill="#B22234" />
          <rect width="7.6" height="6.5" fill="#3C3B6E" />
        </svg>
      );
    case "CN":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#DE2910" />
          <circle cx="4.5" cy="3.5" r="1.6" fill="#FFDE00" />
        </svg>
      );
    case "JP":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#fff" />
          <circle cx="9" cy="6" r="3.1" fill="#BC002D" />
        </svg>
      );
    case "KR":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#fff" />
          <path d="M9 3a3 3 0 0 1 0 6 3 3 0 0 1 0-6Z" fill="#CD2E3A" />
          <path d="M9 9a3 3 0 0 1 0-6 3 3 0 0 0 0 6Z" fill="#0047A0" />
        </svg>
      );
    case "DE":
      return (
        <svg {...commonProps}>
          <rect width="18" height="4" fill="#000" />
          <rect y="4" width="18" height="4" fill="#DD0000" />
          <rect y="8" width="18" height="4" fill="#FFCE00" />
        </svg>
      );
    case "FR":
      return (
        <svg {...commonProps}>
          <rect width="6" height="12" fill="#0055A4" />
          <rect x="6" width="6" height="12" fill="#fff" />
          <rect x="12" width="6" height="12" fill="#EF4135" />
        </svg>
      );
    case "ES":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#AA151B" />
          <rect y="3" width="18" height="6" fill="#F1BF00" />
        </svg>
      );
    case "IT":
      return (
        <svg {...commonProps}>
          <rect width="6" height="12" fill="#009246" />
          <rect x="6" width="6" height="12" fill="#fff" />
          <rect x="12" width="6" height="12" fill="#CE2B37" />
        </svg>
      );
    case "PT":
      return (
        <svg {...commonProps}>
          <rect width="7" height="12" fill="#006600" />
          <rect x="7" width="11" height="12" fill="#FF0000" />
        </svg>
      );
    case "RU":
      return (
        <svg {...commonProps}>
          <rect width="18" height="4" fill="#fff" />
          <rect y="4" width="18" height="4" fill="#0039A6" />
          <rect y="8" width="18" height="4" fill="#D52B1E" />
        </svg>
      );
    case "SA":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#006C35" />
          <rect x="4" y="8.2" width="10" height="0.8" fill="#fff" />
        </svg>
      );
    case "IN":
      return (
        <svg {...commonProps}>
          <rect width="18" height="4" fill="#FF9933" />
          <rect y="4" width="18" height="4" fill="#fff" />
          <rect y="8" width="18" height="4" fill="#138808" />
          <circle cx="9" cy="6" r="1.1" fill="#000080" />
        </svg>
      );
    case "TH":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#A51931" />
          <rect y="2" width="18" height="2" fill="#F4F5F8" />
          <rect y="4" width="18" height="4" fill="#2D2A4A" />
          <rect y="8" width="18" height="2" fill="#F4F5F8" />
        </svg>
      );
    case "VN":
      return (
        <svg {...commonProps}>
          <rect width="18" height="12" fill="#DA251D" />
          <circle cx="9" cy="6" r="1.8" fill="#FFDE00" />
        </svg>
      );
    default:
      return (
        <span className="inline-flex h-3.5 w-[18px] shrink-0 items-center justify-center rounded-[2px] border border-border-base bg-white text-[8px] font-bold text-fg-secondary dark:bg-white/10">
          {countryCode}
        </span>
      );
  }
}

interface LanguageLabelProps {
  language: string | null | undefined;
  locale: string;
  fallback?: ReactNode;
  className?: string;
  textClassName?: string;
  flagClassName?: string;
}

export function LanguageLabel({
  language,
  locale,
  fallback = "未知",
  className,
  textClassName,
  flagClassName,
}: LanguageLabelProps) {
  const label = formatLanguage(language, locale);
  if (!label) return <>{fallback}</>;

  return (
    <span
      className={
        className ?? "inline-flex items-center gap-1 align-middle leading-none"
      }
    >
      <FlagBadge
        countryCode={getLanguageCountryCode(language)}
        className={flagClassName}
      />
      <span className={textClassName ?? "leading-none"}>{label}</span>
    </span>
  );
}

export function formatSubtitleSourceType(
  sourceType: string | null | undefined,
  locale: string,
): string | null {
  if (!sourceType) return null;

  const normalizedLocale = locale.toLowerCase();
  const isChinese = normalizedLocale.startsWith("zh");
  const isJapanese = normalizedLocale.startsWith("ja");

  switch (sourceType.toLowerCase()) {
    case "embedded":
      if (isChinese) return "内置";
      if (isJapanese) return "内蔵";
      return "Embedded";
    case "downloaded":
      if (isChinese) return "下载";
      if (isJapanese) return "下载";
      return "Downloaded";
    case "external":
      if (isChinese) return "外挂";
      if (isJapanese) return "外部";
      return "External";
    default:
      return sourceType;
  }
}

export function formatSubtitleFormat(
  format: string | null | undefined,
  locale: string,
): string {
  if (!format) return "未知";

  const normalizedLocale = locale.toLowerCase();
  const isChinese = normalizedLocale.startsWith("zh");
  const isJapanese = normalizedLocale.startsWith("ja");
  const normalized = format.trim().toLowerCase();

  switch (normalized) {
    case "pgs":
      if (isChinese) return "蓝光 PGS 图片字幕";
      if (isJapanese) return "Blu-ray PGS 画像字幕";
      return "Blu-ray PGS image subtitles";
    default:
      return format.toUpperCase();
  }
}
