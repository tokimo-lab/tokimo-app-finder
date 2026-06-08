export type AppType =
  | "movie"
  | "tv"
  | "anime"
  | "documentary"
  | "variety"
  | "concert"
  | "online_course"
  | "music"
  | "audiobook"
  | "podcast"
  | "book"
  | "manga"
  | "ebook"
  | "docs"
  | "online_video"
  | "photo"
  | "adult";

/** Common interface for domain-specific library outputs (VideoOutput, MusicOutput, etc.) */
export interface MediaLibrary {
  id: string;
  name: string;
  type: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  posterPath?: string | null;
  sortOrder: number;
  settings?: unknown;
  syncStatus?: string;
  lastSyncAt?: string | null;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VideoItemOutput {
  id: string;
  appId: string;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  releaseDate?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  rating?: number | null;
  isAdult: boolean;
  isFavorite?: boolean;
  scrapedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TvShowOutput {
  id: string;
  appId: string;
  title: string;
  originalTitle?: string | null;
  year?: number | null;
  firstAirDate?: string | null;
  posterPath?: string | null;
  backdropPath?: string | null;
  overview?: string | null;
  rating?: number | null;
  isFavorite?: boolean;
  status?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PersonOutput {
  id: string;
  name: string;
  originalName?: string | null;
  profilePath?: string | null;
}

export interface CreditOutput {
  id: string;
  role: string;
  character?: string | null;
  sortOrder: number;
  person: PersonOutput;
}

export interface GenreOutput {
  id: string;
  tmdbGenreId: number;
  name: string;
}

export interface SubtitleOutput {
  id: string;
  language: string;
  title?: string | null;
  sourceType: string;
  format: string;
  isDefault: boolean;
  isForced: boolean;
  isHearingImpaired: boolean;
  streamIndex?: number | null;
  storageUrl?: string | null;
  source?: string | null;
  createdAt?: string;
}

export interface ChapterOutput {
  id: string;
  index: number;
  title?: string | null;
  startTime: number;
  endTime?: number | null;
  thumbPath?: string | null;
}

export interface MediaFileOutput {
  id: string;
  path: string;
  filename: string;
  streamKey?: string | null;
  size?: number | null;
  mimeType?: string | null;
  duration?: number | null;
  checksum?: string | null;
  videoCodec?: string | null;
  videoWidth?: number | null;
  videoHeight?: number | null;
  videoProfile?: string | null;
  hdrType?: string | null;
  videoStreams?: unknown | null;
  audioStreams?: unknown | null;
  ffprobeRaw?: unknown | null;
  sourceName?: string | null;
  sourceType?: string | null;
  sourceAddress?: string | null;
  isAvailable?: boolean;
  subtitles?: SubtitleOutput[];
  chapters?: ChapterOutput[];
  scannedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface CollectionOutput {
  id: string;
  name: string;
  posterPath?: string | null;
  overview?: string | null;
}

export interface PersonDetailOutput {
  id: string;
  name: string;
  originalName?: string | null;
  profilePath?: string | null;
  profileKey?: string | null;
  biography?: string | null;
  birthday?: string | null;
  deathday?: string | null;
  birthplace?: string | null;
  gender?: string | null;
  aliases?: string[];
  tmdbId?: string | null;
  imdbId?: string | null;
  knownForDepartment?: string | null;
  popularity?: number | null;
  credits?: {
    id: string;
    role: string;
    character?: string | null;
    sortOrder: number;
    videoItemId?: string | null;
    tvShowId?: string | null;
    appId?: string | null;
    mediaTitle?: string | null;
    mediaYear?: number | null;
    mediaPosterPath?: string | null;
  }[];
}

export interface VideoItemDetailOutput extends VideoItemOutput {
  sortTitle?: string | null;
  runtime?: number | null;
  tagline?: string | null;
  contentRating?: string | null;
  countries?: string[];
  tmdbId?: string | null;
  imdbId?: string | null;
  tmdbRating?: number | null;
  imdbRating?: number | null;
  doubanRating?: number | null;
  genres?: GenreOutput[];
  credits?: CreditOutput[];
  files?: MediaFileOutput[];
  collections?: CollectionOutput[];
  metadata?: {
    uploader?: string;
    sourceSite?: string;
    sourceUrl?: string;
    externalId?: string;
    durationSeconds?: number;
  } | null;
}

export interface EpisodeOutput {
  id: string;
  episodeNumber: number;
  title?: string | null;
  overview?: string | null;
  airDate?: string | null;
  runtime?: number | null;
  stillPath?: string | null;
  rating?: number | null;
  files?: MediaFileOutput[];
}

interface SeasonOutput {
  id: string;
  seasonNumber: number;
  title?: string | null;
  overview?: string | null;
  airDate?: string | null;
  posterPath?: string | null;
  episodeCount?: number | null;
  episodes?: EpisodeOutput[];
}

export interface TvShowDetailOutput extends TvShowOutput {
  sortTitle?: string | null;
  lastAirDate?: string | null;
  contentRating?: string | null;
  countries?: string[];
  tmdbId?: string | null;
  imdbId?: string | null;
  tvdbId?: string | null;
  tmdbRating?: number | null;
  imdbRating?: number | null;
  doubanRating?: number | null;
  genres?: GenreOutput[];
  credits?: CreditOutput[];
  seasons?: SeasonOutput[];
  collections?: CollectionOutput[];
}
