export type ReportBodyLocale = "de" | "en" | "zh";
export type ReportBodyContentClass = "full_body" | "source_truncated" | "link_only_referral" | "unspecified";

export type ReportBodyLoadResult = {
  body?: string;
  contentClass: ReportBodyContentClass;
  sourceLimitation?: string;
};

export type ReportBodyIdentity = {
  city: string;
  month: string;
  source_id: string;
  source_url: string;
  source_sha256: string;
};

type LocaleIndex = {
  status?: string;
  body_sha256?: string;
  body_shard?: string;
  source?: string;
  source_url?: string;
  candidate_source?: string;
};

type MonthRecord = ReportBodyIdentity & {
  source_content_class?: ReportBodyContentClass;
  source_limitation?: string;
  locales: Partial<Record<ReportBodyLocale, LocaleIndex>>;
};

type MonthIndex = {
  schema_version: 2;
  city: string;
  month: string;
  records: MonthRecord[];
};

type BodyRecord = ReportBodyIdentity & {
  locale: ReportBodyLocale;
  body: string;
  body_sha256: string;
  source_content_class?: ReportBodyContentClass;
  source_limitation?: string;
  candidate_source?: string;
  source?: string;
  source_url?: string;
};

type BodyShard = {
  schema_version: 2;
  city: string;
  month: string;
  records: BodyRecord[];
};

type Cached<T> = { value: T; bytes: number };
const MAX_CACHED_MONTHS = 2;
const MAX_CACHED_BODY_SHARDS = 2;
const MAX_SHARD_BYTES = 1_500_000;
const monthCache = new Map<string, Cached<MonthIndex>>();
const bodyCache = new Map<string, Cached<BodyShard>>();
const pending = new Set<AbortController>();

export class ReportBodyLoadError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message);
    this.name = "ReportBodyLoadError";
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function assertIdentity(identity: ReportBodyIdentity): void {
  if (!/^[a-z][a-z0-9-]*$/.test(identity.city) ||
      !/^\d{4}-\d{2}$/.test(identity.month) ||
      !/^[a-f0-9]{64}$/i.test(identity.source_sha256) ||
      !identity.source_id || !/^https?:\/\//.test(identity.source_url)) {
    throw new ReportBodyLoadError("Invalid report-body identity", false);
  }
}

function exactMatch(row: ReportBodyIdentity, identity: ReportBodyIdentity): boolean {
  return row.city === identity.city && row.month === identity.month &&
    row.source_id === identity.source_id && row.source_url === identity.source_url &&
    row.source_sha256.toLowerCase() === identity.source_sha256.toLowerCase();
}

function baseURL(): string {
  const value = import.meta.env?.BASE_URL;
  if (typeof value !== "string" || !value.startsWith("/") || !value.endsWith("/") || value.includes("..")) {
    return "/";
  }
  return value;
}

function monthIndexPath(identity: ReportBodyIdentity): string {
  assertIdentity(identity);
  const { city, month, source_sha256 } = identity;
  // Revision in URL ensures a changed source identity cannot reuse a stale month index.
  return `${baseURL()}report-bodies/${city}/${month}.json?revision=${source_sha256.toLowerCase()}`;
}

function bodyShardPath(identity: ReportBodyIdentity, relative: string): string {
  const prefix = `${identity.city}/${identity.month}/bodies-`;
  if (!relative.startsWith(prefix) || !/^([a-z][a-z0-9-]*\/\d{4}-\d{2}\/bodies-[a-f0-9]{20}\.json)$/.test(relative)) {
    throw new ReportBodyLoadError("Invalid report-body chunk path", false);
  }
  return `${baseURL()}report-bodies/${relative}?revision=${identity.source_sha256.toLowerCase()}`;
}

async function readBounded(response: Response, signal: AbortSignal): Promise<Uint8Array> {
  const advertised = response.headers.get("content-length");
  if (advertised && (!/^\d+$/.test(advertised) || Number(advertised) > MAX_SHARD_BYTES)) {
    await response.body?.cancel();
    throw new ReportBodyLoadError("Report-body shard exceeds the size limit", false);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new ReportBodyLoadError("Report-body response has no body stream");
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      signal.throwIfAborted();
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > MAX_SHARD_BYTES) {
        await reader.cancel();
        throw new ReportBodyLoadError("Report-body shard exceeds the size limit", false);
      }
      parts.push(part.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.byteLength;
  }
  return bytes;
}

async function fetchJson<T extends { schema_version: number; records: unknown[] }>(
  path: string,
  signal: AbortSignal,
  cache: Map<string, Cached<T>>,
  cacheLimit: number,
): Promise<T> {
  const cached = cache.get(path);
  if (cached) {
    cache.delete(path);
    cache.set(path, cached);
    return cached.value;
  }

  const response = await fetch(path, {
    signal,
    redirect: "error",
    credentials: "omit",
    referrerPolicy: "no-referrer",
    cache: "no-cache",
  });
  if (!response.ok) throw new ReportBodyLoadError(`Report body unavailable (HTTP ${response.status})`);
  const bytes = await readBounded(response, signal);

  let value: T;
  try {
    value = JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    throw new ReportBodyLoadError("Report-body shard is not valid JSON");
  }
  if (value.schema_version !== 2 || !Array.isArray(value.records)) {
    throw new ReportBodyLoadError("Unsupported report-body shard schema", false);
  }
  if (cache.size >= cacheLimit) cache.delete(cache.keys().next().value!);
  cache.set(path, { value, bytes: bytes.byteLength });
  return value;
}

async function fetchMonthIndex(identity: ReportBodyIdentity, signal: AbortSignal): Promise<MonthIndex> {
  const index = await fetchJson<MonthIndex>(monthIndexPath(identity), signal, monthCache, MAX_CACHED_MONTHS);
  if (index.city !== identity.city || index.month !== identity.month) {
    throw new ReportBodyLoadError("Report-body month index identity does not match", false);
  }
  return index;
}

async function fetchBodyShard(identity: ReportBodyIdentity, relative: string, signal: AbortSignal): Promise<BodyShard> {
  const shard = await fetchJson<BodyShard>(bodyShardPath(identity, relative), signal, bodyCache, MAX_CACHED_BODY_SHARDS);
  if (shard.city !== identity.city || shard.month !== identity.month) {
    throw new ReportBodyLoadError("Report-body chunk identity does not match", false);
  }
  return shard;
}

export async function loadReportBody(
  identity: ReportBodyIdentity,
  locale: ReportBodyLocale,
  callerSignal: AbortSignal,
): Promise<ReportBodyLoadResult> {
  callerSignal.throwIfAborted();
  assertIdentity(identity);
  const controller = new AbortController();
  const abort = () => controller.abort(callerSignal.reason);
  callerSignal.addEventListener("abort", abort, { once: true });
  pending.add(controller);
  try {
    const index = await fetchMonthIndex(identity, controller.signal);
    controller.signal.throwIfAborted();
    const entry = index.records.find((row) => exactMatch(row, identity));
    if (!entry) throw new ReportBodyLoadError("No body matches this exact source revision", false);
    const contentClass = entry.source_content_class ?? "unspecified";
    if (!["full_body", "source_truncated", "link_only_referral", "unspecified"].includes(contentClass)) {
      throw new ReportBodyLoadError("Unknown report-body content class", false);
    }
    const sourceLimitation = entry.source_limitation;
    // A referral notice is not the referred announcement. Keep the source
    // link and summary available, but never display a referral as a full body.
    if (contentClass === "link_only_referral") {
      return { contentClass, sourceLimitation };
    }
    const localized = entry.locales[locale];
    if (!localized?.body_shard || !localized.body_sha256) {
      return { contentClass, sourceLimitation };
    }
    if (locale === "de" && (!localized.source || localized.source !== "official_police_article_full_body" || localized.source_url !== identity.source_url)) {
      throw new ReportBodyLoadError("German source text is not bound to the original full article", false);
    }
    if (locale !== "de" && !localized.candidate_source) {
      throw new ReportBodyLoadError("Translated text has no candidate provenance", false);
    }

    const shard = await fetchBodyShard(identity, localized.body_shard, controller.signal);
    controller.signal.throwIfAborted();
    const body = shard.records.find((row) => row.locale === locale && exactMatch(row, identity));
    if (!body?.body || body.body_sha256 !== localized.body_sha256) {
      throw new ReportBodyLoadError("Report-body chunk does not match its month index", false);
    }
    if (body.source_content_class && body.source_content_class !== contentClass) {
      throw new ReportBodyLoadError("Report-body content class does not match its month index", false);
    }
    if (contentClass === "source_truncated" && body.source_content_class !== contentClass) {
      throw new ReportBodyLoadError("Report-body content class is missing from a limited source record", false);
    }
    if (body.source_limitation && body.source_limitation !== sourceLimitation) {
      throw new ReportBodyLoadError("Report-body limitation does not match its month index", false);
    }
    if (contentClass === "source_truncated" && (!sourceLimitation || body.source_limitation !== sourceLimitation)) {
      throw new ReportBodyLoadError("Report-body limitation is missing from a limited source record", false);
    }
    if (locale === "de" && (body.source !== "official_police_article_full_body" || body.source_url !== identity.source_url)) {
      throw new ReportBodyLoadError("German source text is not bound to the original URL", false);
    }
    if (locale !== "de" && body.candidate_source !== localized.candidate_source) {
      throw new ReportBodyLoadError("Translation provenance does not match its month index", false);
    }
    if (await sha256(body.body) !== body.body_sha256) {
      throw new ReportBodyLoadError("Report-body text failed its integrity check", false);
    }
    return { body: body.body, contentClass, sourceLimitation };
  } finally {
    callerSignal.removeEventListener("abort", abort);
    pending.delete(controller);
  }
}

export function abortPendingReportBodyLoads(): void {
  for (const controller of pending) controller.abort();
  pending.clear();
}

export function clearReportBodyCache(): void {
  monthCache.clear();
  bodyCache.clear();
}
