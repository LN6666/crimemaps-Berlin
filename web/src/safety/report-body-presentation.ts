import type {ReportBodyContentClass, ReportBodyLocale} from "./report-body-loader";

export type ReportBodyPresentation = {label: string; note?: string};

const copy: Record<ReportBodyLocale, {
  pending: string;
  neutral: string;
  full: string;
  partial: string;
  referral: string;
  unavailable: string;
  partialNote: string;
  referralNote: string;
  unavailableNote: string;
  unverifiedNote: string;
}> = {
  de: {
    pending: "Meldungstext",
    neutral: "Meldungstext",
    full: "Deutscher Originaltext",
    partial: "Teiltext",
    referral: "Quellenverweis",
    unavailable: "Text nicht verfügbar",
    partialNote: "Der gespeicherte Quelltext ist unvollständig; angezeigt wird nur der vorhandene Teil.",
    referralNote: "Dieser Eintrag verweist auf eine andere Meldung, deren Text hier nicht enthalten ist. Siehe Zusammenfassung oder Originalquelle.",
    unavailableNote: "Für diese Sprache ist kein Text verfügbar. Siehe Zusammenfassung oder Originalquelle.",
    unverifiedNote: "Die Vollständigkeit dieses gespeicherten Textes ist nicht ausgewiesen. Siehe Zusammenfassung oder Originalquelle.",
  },
  en: {
    pending: "Report text",
    neutral: "Report text",
    full: "Full announcement text (translation)",
    partial: "Partial text",
    referral: "Source referral",
    unavailable: "Text unavailable",
    partialNote: "The stored source is incomplete; only the available portion is shown.",
    referralNote: "This entry refers to a separate announcement whose text is not included. See the summary or original source link.",
    unavailableNote: "No text is available in this language. See the summary or original source link.",
    unverifiedNote: "The completeness of this stored text has not been classified. See the summary or original source link.",
  },
  zh: {
    pending: "公告正文",
    neutral: "正文",
    full: "警方公告全文译文",
    partial: "部分正文",
    referral: "来源转介",
    unavailable: "正文暂未收录",
    partialNote: "来源原文不完整；此处仅显示现有部分。",
    referralNote: "此记录仅转介至另一则公告，该公告正文未收录。请查看摘要或原文链接。",
    unavailableNote: "当前语言没有可用正文；请查看摘要或原文链接。",
    unverifiedNote: "此处未注明所存文本是否完整；请结合摘要或原文链接阅读。",
  },
};

export function reportBodyPresentation(
  contentClass: ReportBodyContentClass,
  locale: ReportBodyLocale,
  bodyAvailable: boolean,
): ReportBodyPresentation {
  const labels = copy[locale];
  if (contentClass === "link_only_referral") {
    return {label: labels.referral, note: labels.referralNote};
  }
  if (!bodyAvailable) {
    return {label: labels.unavailable, note: labels.unavailableNote};
  }
  if (contentClass === "source_truncated") {
    return {label: labels.partial, note: labels.partialNote};
  }
  if (contentClass === "full_body") return {label: labels.full};
  return {label: labels.neutral, note: labels.unverifiedNote};
}

export function pendingReportBodyLabel(locale: ReportBodyLocale): string {
  return copy[locale].pending;
}
