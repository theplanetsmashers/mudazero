"use strict";

export const STATUS = Object.freeze({
  CONSIDERING: "considering",
  ESSENTIAL: "essential",
  HOLDING: "holding",
  GRADUATED: "graduated"
});

export const STATUS_LABELS = Object.freeze({
  [STATUS.CONSIDERING]: "検討中",
  [STATUS.ESSENTIAL]: "必要",
  [STATUS.HOLDING]: "あとで",
  [STATUS.GRADUATED]: "卒業"
});

export const STORAGE_KEYS = Object.freeze({
  SERVICES: "kimeru-v9-services",
  TIMELINE: "kimeru-v9-timeline",
  SETTINGS: "kimeru-v9-settings",

  LEGACY_KIMERU_V8: "kimeru-v8-data",
  LEGACY_MUDAZERO: "mudazero-data"
});

export const APP_VERSION = 9;

export function createId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    Date.now().toString() +
    "-" +
    Math.random()
      .toString(16)
      .slice(2)
  );
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatYen(value) {
  const numericValue =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "ja-JP",
    {
      style: "currency",
      currency: "JPY",
      maximumFractionDigits: 0
    }
  ).format(
    Math.round(numericValue)
  );
}

export function formatNumber(value) {
  const numericValue =
    Number(value) || 0;

  return new Intl.NumberFormat(
    "ja-JP",
    {
      maximumFractionDigits: 0
    }
  ).format(
    Math.round(numericValue)
  );
}

export function formatDate(dateString) {
  if (!dateString) {
    return "未設定";
  }

  const date =
    parseLocalDate(dateString);

  if (!isValidDate(date)) {
    return "未設定";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric"
    }
  ).format(date);
}

export function formatShortDate(dateString) {
  if (!dateString) {
    return "未設定";
  }

  const date =
    parseLocalDate(dateString);

  if (!isValidDate(date)) {
    return "未設定";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      month: "numeric",
      day: "numeric"
    }
  ).format(date);
}

export function formatDateTime(value) {
  if (!value) {
    return "日時不明";
  }

  const date =
    new Date(value);

  if (!isValidDate(date)) {
    return "日時不明";
  }

  return new Intl.DateTimeFormat(
    "ja-JP",
    {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  ).format(date);
}

export function parseLocalDate(dateString) {
  if (!dateString) {
    return new Date(NaN);
  }

  return new Date(
    dateString + "T00:00:00"
  );
}

export function isValidDate(date) {
  return (
    date instanceof Date &&
    !Number.isNaN(date.getTime())
  );
}

export function todayAtMidnight() {
  const today =
    new Date();

  today.setHours(0, 0, 0, 0);

  return today;
}

export function toDateInputValue(date) {
  if (!isValidDate(date)) {
    return "";
  }

  const year =
    date.getFullYear();

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      date.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function addDays(
  baseDate,
  days
) {
  const date =
    baseDate instanceof Date
      ? new Date(baseDate)
      : parseLocalDate(baseDate);

  if (!isValidDate(date)) {
    return "";
  }

  date.setDate(
    date.getDate() +
    Number(days || 0)
  );

  return toDateInputValue(date);
}

export function addMonths(
  baseDate,
  months
) {
  const date =
    baseDate instanceof Date
      ? new Date(baseDate)
      : parseLocalDate(baseDate);

  if (!isValidDate(date)) {
    return "";
  }

  const originalDay =
    date.getDate();

  date.setDate(1);

  date.setMonth(
    date.getMonth() +
    Number(months || 0)
  );

  const finalDay =
    Math.min(
      originalDay,
      new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
      ).getDate()
    );

  date.setDate(finalDay);

  return toDateInputValue(date);
}

export function getDaysUntil(
  dateString
) {
  if (!dateString) {
    return Infinity;
  }

  const target =
    parseLocalDate(dateString);

  if (!isValidDate(target)) {
    return Infinity;
  }

  const today =
    todayAtMidnight();

  return Math.ceil(
    (
      target.getTime() -
      today.getTime()
    ) /
    86400000
  );
}

export function getRenewalLabel(
  dateString
) {
  const days =
    getDaysUntil(dateString);

  if (!Number.isFinite(days)) {
    return "更新日未設定";
  }

  if (days < 0) {
    return (
      Math.abs(days) +
      "日前に更新日を経過"
    );
  }

  if (days === 0) {
    return "本日が更新日";
  }

  return (
    "更新まであと" +
    days +
    "日"
  );
}

export function getShortRenewalLabel(
  dateString
) {
  const days =
    getDaysUntil(dateString);

  if (!Number.isFinite(days)) {
    return "未設定";
  }

  if (days < 0) {
    return "更新日経過";
  }

  if (days === 0) {
    return "本日更新";
  }

  return (
    "あと" +
    days +
    "日"
  );
}

export function getHoldLabel(
  holdUntil
) {
  const days =
    getDaysUntil(holdUntil);

  if (!Number.isFinite(days)) {
    return "期限未設定";
  }

  if (days < 0) {
    return "保留期限を経過";
  }

  if (days === 0) {
    return "本日が保留期限";
  }

  return (
    "再判断まであと" +
    days +
    "日"
  );
}

export function getShortHoldLabel(
  holdUntil
) {
  const days =
    getDaysUntil(holdUntil);

  if (!Number.isFinite(days)) {
    return "未設定";
  }

  if (days < 0) {
    return "期限経過";
  }

  if (days === 0) {
    return "本日";
  }

  return (
    "あと" +
    days +
    "日"
  );
}

export function getYearlyPrice(
  service
) {
  const price =
    Number(service?.price) || 0;

  return service?.cycle === "yearly"
    ? price
    : price * 12;
}

export function getMonthlyPrice(
  service
) {
  const price =
    Number(service?.price) || 0;

  return service?.cycle === "yearly"
    ? price / 12
    : price;
}

export function getCycleLabel(
  cycle
) {
  return cycle === "yearly"
    ? "年額"
    : "月額";
}

export function getStatusLabel(
  status
) {
  return (
    STATUS_LABELS[status] ||
    STATUS_LABELS[
      STATUS.CONSIDERING
    ]
  );
}

export function isKnownStatus(
  status
) {
  return Object.values(
    STATUS
  ).includes(status);
}

export function getDefaultIcon(
  name
) {
  const normalized =
    String(name || "")
      .trim()
      .toLowerCase();

  if (
    normalized.includes("netflix") ||
    normalized.includes("ネットフリックス") ||
    normalized.includes("hulu") ||
    normalized.includes("disney") ||
    normalized.includes("u-next") ||
    normalized.includes("unext") ||
    normalized.includes("動画")
  ) {
    return "🎬";
  }

  if (
    normalized.includes("spotify") ||
    normalized.includes("apple music") ||
    normalized.includes("youtube music") ||
    normalized.includes("music") ||
    normalized.includes("音楽")
  ) {
    return "🎵";
  }

  if (
    normalized.includes("chatgpt") ||
    normalized.includes("openai") ||
    normalized.includes("claude") ||
    normalized.includes("gemini") ||
    normalized.includes("ai")
  ) {
    return "✦";
  }

  if (
    normalized.includes("nintendo") ||
    normalized.includes("playstation") ||
    normalized.includes("xbox") ||
    normalized.includes("game") ||
    normalized.includes("ゲーム")
  ) {
    return "🎮";
  }

  if (
    normalized.includes("icloud") ||
    normalized.includes("google one") ||
    normalized.includes("dropbox") ||
    normalized.includes("onedrive") ||
    normalized.includes("cloud") ||
    normalized.includes("ストレージ")
  ) {
    return "☁️";
  }

  if (
    normalized.includes("amazon") ||
    normalized.includes("prime") ||
    normalized.includes("楽天") ||
    normalized.includes("shopping") ||
    normalized.includes("買い物")
  ) {
    return "📦";
  }

  if (
    normalized.includes("microsoft") ||
    normalized.includes("office") ||
    normalized.includes("windows") ||
    normalized.includes("adobe") ||
    normalized.includes("notion") ||
    normalized.includes("slack")
  ) {
    return "▦";
  }

  if (
    normalized.includes("ジム") ||
    normalized.includes("fitness") ||
    normalized.includes("フィットネス")
  ) {
    return "🏃";
  }

  if (
    normalized.includes("新聞") ||
    normalized.includes("news") ||
    normalized.includes("ニュース")
  ) {
    return "📰";
  }

  if (
    normalized.includes("本") ||
    normalized.includes("kindle") ||
    normalized.includes("book") ||
    normalized.includes("書籍")
  ) {
    return "📚";
  }

  return "◈";
}

export function normalizeText(
  value
) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeUrl(
  value
) {
  const url =
    String(value ?? "")
      .trim();

  if (!url) {
    return "";
  }

  try {
    return new URL(url).toString();
  } catch {
    return url;
  }
}

export function isValidHttpUrl(
  value
) {
  const url =
    String(value ?? "")
      .trim();

  if (!url) {
    return true;
  }

  try {
    const parsed =
      new URL(url);

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

export function clamp(
  value,
  min,
  max
) {
  return Math.min(
    Math.max(
      Number(value) || 0,
      min
    ),
    max
  );
}

export function sortByName(
  items
) {
  return [...items].sort(
    (a, b) =>
      String(a.name || "")
        .localeCompare(
          String(b.name || ""),
          "ja"
        )
  );
}

export function sortByRenewalDate(
  items
) {
  return [...items].sort(
    (a, b) =>
      getDaysUntil(
        a.renewalDate
      ) -
      getDaysUntil(
        b.renewalDate
      )
  );
}

export function sortByYearlyPrice(
  items
) {
  return [...items].sort(
    (a, b) =>
      getYearlyPrice(b) -
      getYearlyPrice(a)
  );
}

export function sortByHoldDate(
  items
) {
  return [...items].sort(
    (a, b) =>
      getDaysUntil(
        a.holdUntil
      ) -
      getDaysUntil(
        b.holdUntil
      )
  );
}

export function getCurrentIsoDateTime() {
  return new Date()
    .toISOString();
}

export function getDefaultRenewalDate() {
  return addMonths(
    todayAtMidnight(),
    1
  );
}

export function downloadJson(
  data,
  filename
) {
  const blob =
    new Blob(
      [
        JSON.stringify(
          data,
          null,
          2
        )
      ],
      {
        type:
          "application/json;charset=utf-8"
      }
    );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(
    anchor
  );

  anchor.click();
  anchor.remove();

  window.setTimeout(
    () => {
      URL.revokeObjectURL(url);
    },
    0
  );
}

export function createBackupFilename() {
  const date =
    toDateInputValue(
      new Date()
    );

  return (
    "kimeru-backup-" +
    date +
    ".json"
  );
}

export async function readJsonFile(
  file
) {
  if (!(file instanceof File)) {
    throw new Error(
      "ファイルが選択されていません。"
    );
  }

  const text =
    await file.text();

  return JSON.parse(text);
}

export function safeJsonParse(
  value,
  fallback
) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function getFocusableElements(
  container
) {
  if (!container) {
    return [];
  }

  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    "[tabindex]:not([tabindex='-1'])"
  ].join(",");

  return Array.from(
    container.querySelectorAll(
      selector
    )
  ).filter(
    element =>
      !element.hidden &&
      element.offsetParent !== null
  );
}

export function waitForNextFrame() {
  return new Promise(
    resolve => {
      requestAnimationFrame(
        () => {
          requestAnimationFrame(
            resolve
          );
        }
      );
    }
  );
}

export function isSameDay(
  firstValue,
  secondValue
) {
  const first =
    firstValue instanceof Date
      ? firstValue
      : new Date(firstValue);

  const second =
    secondValue instanceof Date
      ? secondValue
      : new Date(secondValue);

  if (
    !isValidDate(first) ||
    !isValidDate(second)
  ) {
    return false;
  }

  return (
    first.getFullYear() ===
      second.getFullYear() &&
    first.getMonth() ===
      second.getMonth() &&
    first.getDate() ===
      second.getDate()
  );
}
