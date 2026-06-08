import React from "react";

export function formatLanguage(
  language: string | undefined,
  locale: string,
): string {
  if (!language) return "未知";
  try {
    return (
      new Intl.DisplayNames([locale], { type: "language" }).of(language) ??
      language
    );
  } catch {
    return language;
  }
}

export function formatChannels(
  channels: number | null | undefined,
  _locale: string,
): string | null {
  if (channels == null) return null;
  if (channels === 1) return "Mono";
  if (channels === 2) return "Stereo";
  if (channels === 6) return "5.1";
  if (channels === 8) return "7.1";
  return `${channels}ch`;
}

export function formatSubtitleFormat(
  format: string | null | undefined,
  _locale: string,
): string {
  if (!format) return "未知";
  return format.toUpperCase();
}

export function formatSubtitleSourceType(
  sourceType: string | null | undefined,
  _locale: string,
): string | null {
  if (!sourceType) return null;
  const map: Record<string, string> = {
    embedded: "内封",
    external: "外挂",
  };
  return map[sourceType] ?? sourceType;
}

export function LanguageLabel({
  language,
  locale,
}: {
  language: string | undefined;
  locale: string;
}) {
  return React.createElement("span", null, formatLanguage(language, locale));
}
