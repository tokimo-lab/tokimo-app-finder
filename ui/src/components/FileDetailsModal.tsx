import { Modal, Tag, useDateFormat } from "@tokimo/ui";
import {
  Captions,
  FolderTree,
  ShieldCheck,
  Video,
  Volume2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { getMediaFileLocator } from "../lib/media-file-locator";
import {
  formatChannels,
  formatLanguage,
  formatSubtitleFormat,
  formatSubtitleSourceType,
  LanguageLabel,
} from "../lib/media-language";
import { posterThumbUrl } from "../lib/thumb";
import type { MediaFileOutput } from "../types";

// Re-export for backward compatibility
export { getMediaFileLocator } from "../lib/media-file-locator";

/** Raw ffprobe video stream fields. */
type FfprobeVideoStream = Record<string, unknown> & {
  codec_name?: string | null;
  profile?: string | null;
  width?: number | null;
  height?: number | null;
  pix_fmt?: string | null;
  color_transfer?: string | null;
  color_primaries?: string | null;
  field_order?: string | null;
  r_frame_rate?: string | null;
  avg_frame_rate?: string | null;
  bit_rate?: string | null;
  bits_per_raw_sample?: string | null;
  closed_captions?: number | null;
  film_grain?: number | null;
  extradata_size?: number | null;
  view_ids_available?: string | null;
  view_pos_available?: string | null;
  tags?: { language?: string; title?: string } | null;
  disposition?: Record<string, number> | null;
  side_data_list?: Array<Record<string, unknown>> | null;
};

type VideoStreamDetails = {
  codec?: string | null;
  profile?: string | null;
  width?: number | null;
  height?: number | null;
  pixelFormat?: string | null;
  colorSpace?: string | null;
  colorTransfer?: string | null;
  colorPrimaries?: string | null;
  fieldOrder?: string | null;
  title?: string | null;
  language?: string | null;
  frameRate?: number | null;
  averageFrameRate?: number | null;
  bitrate?: number | null;
  bitDepth?: number | null;
  isInterlaced?: boolean;
  closedCaptions?: boolean;
  filmGrain?: boolean;
  extradataSize?: number | null;
  viewIdsAvailable?: string | null;
  viewPosAvailable?: string | null;
  dvVersionMajor?: number | null;
  dvVersionMinor?: number | null;
  dvProfile?: number | null;
  dvLevel?: number | null;
  dvBlCompatibilityId?: number | null;
  dvRpuPresent?: boolean | null;
  dvElPresent?: boolean | null;
  dvBlPresent?: boolean | null;
};

type AudioStreamDetails = {
  streamIndex: number;
  language?: string;
  codec?: string;
  profile?: string | null;
  title?: string | null;
  channels?: number | null;
  sampleRate?: number | null;
  bitrate?: number | null;
  bitDepth?: number | null;
  isDefault?: boolean;
  isForced?: boolean;
};

interface FileDetailsModalProps {
  file: MediaFileOutput | null;
  open: boolean;
  onClose: () => void;
  posterPath?: string | null;
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(2)} TB`;
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
  return `${(bytes / 1e3).toFixed(0)} KB`;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes > 0) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function formatResolutionLabel(
  height: number | null | undefined,
): string | null {
  if (height == null) return null;
  if (height >= 2160) return "4K";
  if (height >= 1440) return "1440P";
  if (height >= 1080) return "1080P";
  if (height >= 720) return "720P";
  if (height >= 480) return "480P";
  return `${height}P`;
}

function parseFrameRate(s: string | null | undefined): number | null {
  if (!s) return null;
  const parts = s.split("/");
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (den > 0) return Math.round((num / den) * 1000) / 1000;
    return null;
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseVideoStreamDetails(value: unknown): VideoStreamDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as FfprobeVideoStream;
  const fieldOrder = raw.field_order ?? null;
  const isInterlaced =
    fieldOrder != null &&
    fieldOrder !== "progressive" &&
    fieldOrder !== "unknown" &&
    fieldOrder !== "";
  const dvData = raw.side_data_list?.find(
    (s) => s.side_data_type === "DOVI configuration record",
  );
  return {
    codec: raw.codec_name ?? null,
    profile: raw.profile ?? null,
    width: raw.width ?? null,
    height: raw.height ?? null,
    pixelFormat: raw.pix_fmt ?? null,
    colorTransfer: raw.color_transfer ?? null,
    colorPrimaries: raw.color_primaries ?? null,
    fieldOrder,
    title: raw.tags?.title ?? null,
    language: raw.tags?.language ?? null,
    frameRate: parseFrameRate(raw.r_frame_rate),
    averageFrameRate: parseFrameRate(raw.avg_frame_rate),
    bitrate: raw.bit_rate ? Math.round(Number(raw.bit_rate) / 1000) : null,
    bitDepth: raw.bits_per_raw_sample ? Number(raw.bits_per_raw_sample) : null,
    isInterlaced,
    closedCaptions: raw.closed_captions === 1,
    filmGrain: raw.film_grain === 1,
    extradataSize: raw.extradata_size ?? null,
    viewIdsAvailable: raw.view_ids_available ?? null,
    viewPosAvailable: raw.view_pos_available ?? null,
    dvProfile: (dvData?.dv_profile as number) ?? null,
    dvLevel: (dvData?.dv_level as number) ?? null,
    dvBlCompatibilityId: (dvData?.bl_signal_compatibility_id as number) ?? null,
    dvVersionMajor: (dvData?.dv_version_major as number) ?? null,
    dvVersionMinor: (dvData?.dv_version_minor as number) ?? null,
    dvRpuPresent: dvData?.rpu_present_flag === 1 ? true : null,
    dvElPresent: dvData?.el_present_flag === 1 ? true : null,
    dvBlPresent: dvData?.bl_present_flag === 1 ? true : null,
  };
}

function parseAudioStreams(value: unknown): AudioStreamDetails[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null && !Array.isArray(item),
    )
    .map((raw, streamIndex) => {
      const tags = raw.tags as Record<string, unknown> | undefined;
      const disposition = raw.disposition as
        | Record<string, unknown>
        | undefined;
      return {
        streamIndex,
        codec: (raw.codec_name as string) ?? undefined,
        profile: (raw.profile as string) ?? null,
        title: (tags?.title as string) ?? null,
        language: (tags?.language as string) ?? undefined,
        channels: (raw.channels as number) ?? null,
        sampleRate:
          typeof raw.sample_rate === "string" ? Number(raw.sample_rate) : null,
        bitrate:
          typeof raw.bit_rate === "string"
            ? Math.round(Number(raw.bit_rate) / 1000)
            : null,
        bitDepth:
          typeof raw.bits_per_raw_sample === "string"
            ? Number(raw.bits_per_raw_sample)
            : null,
        isDefault: disposition?.default === 1,
        isForced: disposition?.forced === 1,
      };
    });
}

function formatHdrType(hdrType: string | null | undefined): string {
  if (!hdrType || hdrType === "sdr") return "SDR";
  const map: Record<string, string> = {
    hdr10: "HDR10",
    hdr10plus: "HDR10+",
    hlg: "HLG",
    dolby_vision: "Dolby Vision",
    dolby_vision_hdr10: "Dolby Vision + HDR10",
    dolby_vision_hdr10_plus: "Dolby Vision + HDR10+",
    dolby_vision_hlg: "Dolby Vision + HLG",
    dolby_vision_sdr: "Dolby Vision + SDR",
    dolby_vision_el: "Dolby Vision (EL)",
    dolby_vision_el_hdr10_plus: "Dolby Vision (EL) + HDR10+",
    dovi_invalid: "Dolby Vision (Invalid)",
  };
  return map[hdrType.toLowerCase()] ?? hdrType.toUpperCase().replace(/_/g, " ");
}

function formatDvProfile(video: VideoStreamDetails | null): string | null {
  if (!video?.dvProfile) return null;
  const parts = [`Profile ${video.dvProfile}`];
  if (video.dvLevel != null) parts.push(`Level ${video.dvLevel}`);
  if (video.dvBlCompatibilityId != null)
    parts.push(`Compat ${video.dvBlCompatibilityId}`);
  if (video.dvVersionMajor != null)
    parts.push(`v${video.dvVersionMajor}.${video.dvVersionMinor ?? 0}`);
  const flags: string[] = [];
  if (video.dvRpuPresent) flags.push("RPU");
  if (video.dvElPresent) flags.push("EL");
  if (video.dvBlPresent) flags.push("BL");
  if (flags.length > 0) parts.push(`(${flags.join("+")})`);
  return parts.join(" · ");
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border-base bg-white/70 p-2.5 shadow-sm dark:bg-white/5">
      <div className="mb-1.5 flex items-center gap-1.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          {icon}
        </span>
        <h3 className="text-[12px] font-semibold text-fg-primary">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function DetailGroup({
  label,
  items,
}: {
  label: string;
  items: Array<{ label: string; value: React.ReactNode }>;
}) {
  if (items.length === 0) return null;
  return (
    <div className="rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]">
      <div className="mb-1.5 text-[10px] font-semibold text-fg-muted">
        {label}
      </div>
      <InlineFacts items={items} />
    </div>
  );
}

function OverviewCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue?: string | null;
}) {
  return (
    <div className="rounded-xl border border-border-base bg-gradient-to-br from-white to-[var(--color-surface-base)] p-2.5 shadow-sm dark:from-white/8 dark:to-white/4">
      <div className="text-[10px] font-medium uppercase tracking-wide text-fg-muted">
        {label}
      </div>
      <div className="mt-1 text-[14px] font-semibold text-fg-primary">
        {value}
      </div>
      {subValue ? (
        <div className="mt-0.5 text-[10px] text-fg-muted">{subValue}</div>
      ) : null}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border-base px-2.5 py-3 text-center text-[11px] text-fg-muted">
      {text}
    </div>
  );
}

function InlineFacts({
  items,
  wrap = true,
}: {
  items: Array<{
    label: string;
    value: React.ReactNode;
  }>;
  wrap?: boolean;
}) {
  return (
    <div
      className={
        wrap
          ? "flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] leading-5"
          : "flex min-w-max items-center gap-4 whitespace-nowrap text-[12px] leading-5"
      }
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex min-w-0 items-center text-fg-secondary"
        >
          <span className="shrink-0 text-[10px] font-medium leading-none text-fg-muted">
            {item.label}
          </span>
          <span className="mx-1 shrink-0 leading-none text-fg-muted">·</span>
          <span className="inline-flex min-w-0 items-center font-medium leading-none text-fg-primary">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}

export function FileDetailsTooltipContent({ file }: { file: MediaFileOutput }) {
  const { i18n } = useTranslation();
  const { formatLong } = useDateFormat();
  if (!file) return null;

  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en-US";
  const locator = getMediaFileLocator(file);
  const video = parseVideoStreamDetails(file.videoStreams);
  const audioStreams = parseAudioStreams(file.audioStreams);
  const videoSummary = [
    file.videoCodec ? file.videoCodec.toUpperCase() : null,
    formatResolutionLabel(file.videoHeight),
    file.hdrType && file.hdrType !== "sdr" ? formatHdrType(file.hdrType) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const containerFormat = file.path?.split(".").pop()?.toUpperCase();
  const overviewAudio = audioStreams
    .map((stream) =>
      [
        formatLanguage(stream.language, locale),
        stream.codec ? stream.codec.toUpperCase() : null,
        formatChannels(stream.channels, locale),
      ]
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");

  return (
    <div className="space-y-2.5 text-[12px]">
      <section className="rounded-xl border border-border-base bg-gradient-to-br from-[var(--color-accent)]/8 to-white p-2.5 shadow-sm dark:to-white/5">
        <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-fg-primary">
          <FolderTree className="h-4 w-4 text-[var(--color-accent)]" />
          完整文件路径
        </div>
        <div className="break-all rounded-lg bg-black/5 px-2.5 py-1.5 font-mono text-[10px] text-fg-secondary dark:bg-white/5">
          {locator}
        </div>
      </section>

      <div className="grid grid-cols-4 gap-1.5">
        <OverviewCard
          label="文件大小"
          value={file.size != null ? formatFileSize(file.size) : "未知"}
          subValue={file.mimeType ?? null}
        />
        <OverviewCard
          label="时长"
          value={file.duration != null ? formatDuration(file.duration) : "未知"}
        />
        <OverviewCard
          label="视频规格"
          value={videoSummary || "未识别"}
          subValue={
            file.videoWidth != null && file.videoHeight != null
              ? `${file.videoWidth} × ${file.videoHeight}${containerFormat ? ` · ${containerFormat}` : ""}`
              : (containerFormat ?? null)
          }
        />
        <OverviewCard
          label="音轨 / 字幕"
          value={`${audioStreams.length} / ${file.subtitles?.length ?? 0}`}
          subValue={overviewAudio || "暂无音轨摘要"}
        />
      </div>

      <div className="space-y-2.5">
        <SectionCard title="视频画面" icon={<Video className="h-4 w-4" />}>
          <div className="space-y-1.5">
            <DetailGroup
              label="编解码"
              items={[
                {
                  label: "编码格式",
                  value: file.videoCodec?.toUpperCase() ?? "未知",
                },
                { label: "Profile", value: file.videoProfile ?? "未知" },
                ...(video?.extradataSize != null
                  ? [
                      {
                        label: "Extradata",
                        value: `${video.extradataSize} B`,
                      },
                    ]
                  : []),
                ...(video?.closedCaptions
                  ? [{ label: "隐藏字幕", value: "有" }]
                  : []),
                ...(video?.filmGrain
                  ? [{ label: "胶片颗粒", value: "有" }]
                  : []),
                ...(video?.viewIdsAvailable
                  ? [
                      {
                        label: "View IDs",
                        value: video.viewIdsAvailable,
                      },
                    ]
                  : []),
                ...(video?.viewPosAvailable
                  ? [
                      {
                        label: "View Pos",
                        value: video.viewPosAvailable,
                      },
                    ]
                  : []),
              ]}
            />
            <DetailGroup
              label="画面"
              items={[
                {
                  label: "分辨率",
                  value:
                    file.videoWidth != null && file.videoHeight != null
                      ? `${file.videoWidth} × ${file.videoHeight}`
                      : "未知",
                },
                {
                  label: "帧率",
                  value:
                    typeof video?.frameRate === "number"
                      ? `${video.frameRate} fps`
                      : "未知",
                },
                ...(typeof video?.averageFrameRate === "number" &&
                video.averageFrameRate !== video?.frameRate
                  ? [
                      {
                        label: "平均帧率",
                        value: `${video.averageFrameRate} fps`,
                      },
                    ]
                  : []),
                ...(video?.isInterlaced
                  ? [
                      {
                        label: "扫描方式",
                        value: `隔行 (${video.fieldOrder ?? "interlaced"})`,
                      },
                    ]
                  : [{ label: "扫描方式", value: "逐行" }]),
              ]}
            />
            <DetailGroup
              label="质量"
              items={[
                {
                  label: "码率",
                  value:
                    typeof video?.bitrate === "number"
                      ? `${video.bitrate} kbps`
                      : "未知",
                },
                {
                  label: "位深",
                  value:
                    typeof video?.bitDepth === "number"
                      ? `${video.bitDepth} bit`
                      : "未知",
                },
                {
                  label: "像素格式",
                  value: video?.pixelFormat ?? "未知",
                },
              ]}
            />
            <DetailGroup
              label="色彩"
              items={[
                {
                  label: "HDR",
                  value: formatHdrType(file.hdrType),
                },
                ...(video?.dvProfile != null
                  ? [
                      {
                        label: "DV Profile",
                        value: formatDvProfile(video) ?? "未知",
                      },
                    ]
                  : []),
                {
                  label: "色彩空间",
                  value: video?.colorSpace ?? "未知",
                },
                {
                  label: "色彩传输",
                  value: video?.colorTransfer ?? "未知",
                },
                {
                  label: "色彩原色",
                  value: video?.colorPrimaries ?? "未知",
                },
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="音轨信息" icon={<Volume2 className="h-4 w-4" />}>
          {audioStreams.length > 0 ? (
            <div className="space-y-1.5">
              {audioStreams.map((stream) => (
                <div
                  key={`audio-${stream.streamIndex}`}
                  className="overflow-x-auto rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]"
                >
                  <InlineFacts
                    wrap={false}
                    items={[
                      {
                        label: "音轨",
                        value: `${stream.streamIndex + 1}${stream.isDefault ? " ★" : ""}`,
                      },
                      ...(stream.title
                        ? [{ label: "标题", value: stream.title }]
                        : []),
                      {
                        label: "语言",
                        value: (
                          <LanguageLabel
                            language={stream.language}
                            locale={locale}
                          />
                        ),
                      },
                      {
                        label: "编码",
                        value: stream.codec
                          ? stream.codec.toUpperCase()
                          : "未知",
                      },
                      ...(stream.profile
                        ? [{ label: "Profile", value: stream.profile }]
                        : []),
                      {
                        label: "声道",
                        value:
                          formatChannels(stream.channels, locale) ?? "未知",
                      },
                      ...(stream.sampleRate != null
                        ? [
                            {
                              label: "采样率",
                              value: `${stream.sampleRate} Hz`,
                            },
                          ]
                        : []),
                      ...(stream.bitDepth != null
                        ? [
                            {
                              label: "位深",
                              value: `${stream.bitDepth} bit`,
                            },
                          ]
                        : []),
                      {
                        label: "码率",
                        value:
                          typeof stream.bitrate === "number"
                            ? `${stream.bitrate} kbps`
                            : "未知",
                      },
                    ]}
                  />
                </div>
              ))}
            </div>
          ) : (
            <EmptyHint text="暂无音轨信息" />
          )}
        </SectionCard>

        <SectionCard title="字幕信息" icon={<Captions className="h-4 w-4" />}>
          {file.subtitles && file.subtitles.length > 0 ? (
            <div className="space-y-1.5">
              {file.subtitles.map((subtitle, index) => {
                const subtitleSourceType = formatSubtitleSourceType(
                  subtitle.sourceType,
                  locale,
                );

                return (
                  <div
                    key={subtitle.id}
                    className="overflow-x-auto rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]"
                  >
                    <InlineFacts
                      wrap={false}
                      items={[
                        {
                          label: "字幕",
                          value: [
                            subtitle.title || `${index + 1}`,
                            subtitle.isDefault ? "★" : null,
                            subtitle.isForced ? "⚡" : null,
                            subtitle.isHearingImpaired ? "👂" : null,
                          ]
                            .filter(Boolean)
                            .join(" "),
                        },
                        {
                          label: "语言",
                          value: (
                            <LanguageLabel
                              language={subtitle.language}
                              locale={locale}
                            />
                          ),
                        },
                        {
                          label: "格式",
                          value: formatSubtitleFormat(subtitle.format, locale),
                        },
                        {
                          label: "类型",
                          value: subtitleSourceType ?? "未知",
                        },
                      ]}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyHint text="暂无字幕信息" />
          )}
        </SectionCard>

        {file.chapters && file.chapters.length > 0 ? (
          <SectionCard
            title="章节信息"
            icon={<ShieldCheck className="h-4 w-4" />}
          >
            <div className="grid gap-1.5">
              {file.chapters.map((chapter) => (
                <div
                  key={chapter.id}
                  className="flex items-start gap-2.5 rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-1.5 dark:bg-white/[0.02]"
                >
                  {chapter.thumbPath && (
                    <img
                      src={posterThumbUrl(chapter.thumbPath, 200)}
                      alt={chapter.title || `第 ${chapter.index} 章`}
                      className="mt-0.5 h-10 w-[72px] shrink-0 rounded object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-fg-primary">
                      {chapter.title || `Chapter ${chapter.index}`}
                    </div>
                    <div className="mt-0.5 text-[10px] text-fg-muted">
                      第 {chapter.index} 章
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-[11px] font-medium text-fg-secondary">
                    <div>{formatDuration(chapter.startTime)}</div>
                    {chapter.endTime != null && (
                      <div className="mt-0.5 text-[10px] font-normal text-fg-muted">
                        → {formatDuration(chapter.endTime)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        ) : null}
      </div>
      {file.scannedAt ? (
        <div className="pt-0.5 text-center text-[10px] text-fg-muted">
          扫描时间：{formatLong(file.scannedAt)}
        </div>
      ) : null}
    </div>
  );
}

export default function FileDetailsModal({
  file,
  open,
  onClose,
  posterPath,
}: FileDetailsModalProps) {
  const { i18n } = useTranslation();
  const { formatLong } = useDateFormat();
  if (!file) return null;

  const locale = i18n.resolvedLanguage ?? i18n.language ?? "en-US";
  const locator = getMediaFileLocator(file);
  const video = parseVideoStreamDetails(file.videoStreams);
  const audioStreams = parseAudioStreams(file.audioStreams);
  const videoSummary = [
    file.videoCodec ? file.videoCodec.toUpperCase() : null,
    formatResolutionLabel(file.videoHeight),
    file.hdrType && file.hdrType !== "sdr" ? formatHdrType(file.hdrType) : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const containerFormat = file.path?.split(".").pop()?.toUpperCase();
  const overviewAudio = audioStreams
    .map((stream) =>
      [
        formatLanguage(stream.language, locale),
        stream.codec ? stream.codec.toUpperCase() : null,
        formatChannels(stream.channels, locale),
      ]
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .slice(0, 2)
    .join(" / ");

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={1180}
      centered
      destroyOnClose
      title={
        <div className="flex min-w-0 items-center gap-3">
          <div className="h-11 w-8 flex-shrink-0 overflow-hidden rounded-md border border-border-base bg-black/[0.04] dark:bg-white/[0.05]">
            {posterPath ? (
              <img
                src={posterThumbUrl(posterPath, 300)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] text-fg-muted">
                封面
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="truncate text-[15px] font-semibold text-[var(--color-fg-primary)]">
                文件详情
              </span>
              {file.sourceName ? (
                <Tag color="default">{file.sourceName}</Tag>
              ) : null}
              {file.sourceType ? (
                <Tag color="default">{file.sourceType.toUpperCase()}</Tag>
              ) : null}
              {file.isAvailable ? <Tag color="success">可用</Tag> : null}
            </div>
            <p className="mt-0.5 truncate text-[13px] font-medium text-fg-primary">
              {file.filename}
            </p>
          </div>
        </div>
      }
      styles={{
        body: {
          maxHeight: "calc(88vh - 56px)",
          overflowY: "auto",
          scrollbarWidth: "thin",
          scrollbarColor: "rgba(128,128,128,0.4) transparent",
        },
      }}
    >
      <div className="space-y-2.5 text-[12px]">
        <section className="rounded-xl border border-border-base bg-gradient-to-br from-[var(--color-accent)]/8 to-white p-2.5 shadow-sm dark:to-white/5">
          <div className="mb-1 flex items-center gap-1.5 text-[12px] font-semibold text-fg-primary">
            <FolderTree className="h-4 w-4 text-[var(--color-accent)]" />
            完整文件路径
          </div>
          <div className="break-all rounded-lg bg-black/5 px-2.5 py-1.5 font-mono text-[10px] text-fg-secondary dark:bg-white/5">
            {locator}
          </div>
        </section>

        <div className="grid gap-1.5 md:grid-cols-4">
          <OverviewCard
            label="文件大小"
            value={file.size != null ? formatFileSize(file.size) : "未知"}
            subValue={file.mimeType ?? null}
          />
          <OverviewCard
            label="时长"
            value={
              file.duration != null ? formatDuration(file.duration) : "未知"
            }
          />
          <OverviewCard
            label="视频规格"
            value={videoSummary || "未识别"}
            subValue={
              file.videoWidth != null && file.videoHeight != null
                ? `${file.videoWidth} × ${file.videoHeight}${containerFormat ? ` · ${containerFormat}` : ""}`
                : (containerFormat ?? null)
            }
          />
          <OverviewCard
            label="音轨 / 字幕"
            value={`${audioStreams.length} / ${file.subtitles?.length ?? 0}`}
            subValue={overviewAudio || "暂无音轨摘要"}
          />
        </div>

        <div className="space-y-2.5">
          <SectionCard title="视频画面" icon={<Video className="h-4 w-4" />}>
            <div className="space-y-1.5">
              <DetailGroup
                label="编解码"
                items={[
                  {
                    label: "编码格式",
                    value: file.videoCodec?.toUpperCase() ?? "未知",
                  },
                  { label: "Profile", value: file.videoProfile ?? "未知" },
                  ...(video?.extradataSize != null
                    ? [
                        {
                          label: "Extradata",
                          value: `${video.extradataSize} B`,
                        },
                      ]
                    : []),
                  ...(video?.closedCaptions
                    ? [{ label: "隐藏字幕", value: "有" }]
                    : []),
                  ...(video?.filmGrain
                    ? [{ label: "胶片颗粒", value: "有" }]
                    : []),
                  ...(video?.viewIdsAvailable
                    ? [
                        {
                          label: "View IDs",
                          value: video.viewIdsAvailable,
                        },
                      ]
                    : []),
                  ...(video?.viewPosAvailable
                    ? [
                        {
                          label: "View Pos",
                          value: video.viewPosAvailable,
                        },
                      ]
                    : []),
                ]}
              />
              <DetailGroup
                label="画面"
                items={[
                  {
                    label: "分辨率",
                    value:
                      file.videoWidth != null && file.videoHeight != null
                        ? `${file.videoWidth} × ${file.videoHeight}`
                        : "未知",
                  },
                  {
                    label: "帧率",
                    value:
                      typeof video?.frameRate === "number"
                        ? `${video.frameRate} fps`
                        : "未知",
                  },
                  ...(typeof video?.averageFrameRate === "number" &&
                  video.averageFrameRate !== video?.frameRate
                    ? [
                        {
                          label: "平均帧率",
                          value: `${video.averageFrameRate} fps`,
                        },
                      ]
                    : []),
                  ...(video?.isInterlaced
                    ? [
                        {
                          label: "扫描方式",
                          value: `隔行 (${video.fieldOrder ?? "interlaced"})`,
                        },
                      ]
                    : [{ label: "扫描方式", value: "逐行" }]),
                ]}
              />
              <DetailGroup
                label="质量"
                items={[
                  {
                    label: "码率",
                    value:
                      typeof video?.bitrate === "number"
                        ? `${video.bitrate} kbps`
                        : "未知",
                  },
                  {
                    label: "位深",
                    value:
                      typeof video?.bitDepth === "number"
                        ? `${video.bitDepth} bit`
                        : "未知",
                  },
                  {
                    label: "像素格式",
                    value: video?.pixelFormat ?? "未知",
                  },
                ]}
              />
              <DetailGroup
                label="色彩"
                items={[
                  {
                    label: "HDR",
                    value: formatHdrType(file.hdrType),
                  },
                  ...(video?.dvProfile != null
                    ? [
                        {
                          label: "DV Profile",
                          value: formatDvProfile(video) ?? "未知",
                        },
                      ]
                    : []),
                  {
                    label: "色彩空间",
                    value: video?.colorSpace ?? "未知",
                  },
                  {
                    label: "色彩传输",
                    value: video?.colorTransfer ?? "未知",
                  },
                  {
                    label: "色彩原色",
                    value: video?.colorPrimaries ?? "未知",
                  },
                ]}
              />
            </div>
          </SectionCard>

          <SectionCard title="音轨信息" icon={<Volume2 className="h-4 w-4" />}>
            {audioStreams.length > 0 ? (
              <div className="space-y-1.5">
                {audioStreams.map((stream) => (
                  <div
                    key={`audio-${stream.streamIndex}`}
                    className="overflow-x-auto rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]"
                  >
                    <InlineFacts
                      wrap={false}
                      items={[
                        {
                          label: "音轨",
                          value: `${stream.streamIndex + 1}${stream.isDefault ? " ★" : ""}`,
                        },
                        ...(stream.title
                          ? [{ label: "标题", value: stream.title }]
                          : []),
                        {
                          label: "语言",
                          value: (
                            <LanguageLabel
                              language={stream.language}
                              locale={locale}
                            />
                          ),
                        },
                        {
                          label: "编码",
                          value: stream.codec
                            ? stream.codec.toUpperCase()
                            : "未知",
                        },
                        ...(stream.profile
                          ? [{ label: "Profile", value: stream.profile }]
                          : []),
                        {
                          label: "声道",
                          value:
                            formatChannels(stream.channels, locale) ?? "未知",
                        },
                        ...(stream.sampleRate != null
                          ? [
                              {
                                label: "采样率",
                                value: `${stream.sampleRate} Hz`,
                              },
                            ]
                          : []),
                        ...(stream.bitDepth != null
                          ? [
                              {
                                label: "位深",
                                value: `${stream.bitDepth} bit`,
                              },
                            ]
                          : []),
                        {
                          label: "码率",
                          value:
                            typeof stream.bitrate === "number"
                              ? `${stream.bitrate} kbps`
                              : "未知",
                        },
                      ]}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyHint text="暂无音轨信息" />
            )}
          </SectionCard>

          <SectionCard title="字幕信息" icon={<Captions className="h-4 w-4" />}>
            {file.subtitles && file.subtitles.length > 0 ? (
              <div className="space-y-1.5">
                {file.subtitles.map((subtitle, index) => {
                  const subtitleSourceType = formatSubtitleSourceType(
                    subtitle.sourceType,
                    locale,
                  );

                  return (
                    <div
                      key={subtitle.id}
                      className="overflow-x-auto rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-2 dark:bg-white/[0.02]"
                    >
                      <InlineFacts
                        wrap={false}
                        items={[
                          {
                            label: "字幕",
                            value: [
                              subtitle.title || `${index + 1}`,
                              subtitle.isDefault ? "★" : null,
                              subtitle.isForced ? "⚡" : null,
                              subtitle.isHearingImpaired ? "👂" : null,
                            ]
                              .filter(Boolean)
                              .join(" "),
                          },
                          {
                            label: "语言",
                            value: (
                              <LanguageLabel
                                language={subtitle.language}
                                locale={locale}
                              />
                            ),
                          },
                          {
                            label: "格式",
                            value: formatSubtitleFormat(
                              subtitle.format,
                              locale,
                            ),
                          },
                          {
                            label: "类型",
                            value: subtitleSourceType ?? "未知",
                          },
                        ]}
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyHint text="暂无字幕信息" />
            )}
          </SectionCard>

          {file.chapters && file.chapters.length > 0 ? (
            <SectionCard
              title="章节信息"
              icon={<ShieldCheck className="h-4 w-4" />}
            >
              <div className="grid gap-1.5">
                {file.chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-start gap-2.5 rounded-lg border border-border-base bg-black/[0.02] px-2.5 py-1.5 dark:bg-white/[0.02]"
                  >
                    {chapter.thumbPath && (
                      <img
                        src={posterThumbUrl(chapter.thumbPath, 200)}
                        alt={chapter.title || `第 ${chapter.index} 章`}
                        className="mt-0.5 h-10 w-[72px] shrink-0 rounded object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-medium text-fg-primary">
                        {chapter.title || `Chapter ${chapter.index}`}
                      </div>
                      <div className="mt-0.5 text-[10px] text-fg-muted">
                        第 {chapter.index} 章
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] font-medium text-fg-secondary">
                      <div>{formatDuration(chapter.startTime)}</div>
                      {chapter.endTime != null && (
                        <div className="mt-0.5 text-[10px] font-normal text-fg-muted">
                          → {formatDuration(chapter.endTime)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          ) : null}
        </div>
        {file.scannedAt ? (
          <div className="pt-0.5 text-center text-[10px] text-fg-muted">
            扫描时间：{formatLong(file.scannedAt)}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
