"use strict";

import {
  APP_VERSION,
  STATUS,
  STORAGE_KEYS,
  createId,
  getCurrentIsoDateTime,
  getDefaultIcon,
  isKnownStatus,
  normalizeText,
  normalizeUrl,
  safeJsonParse
} from "./utils.js";

const DEFAULT_SETTINGS = Object.freeze({
  currentView: "today"
});

export function createDefaultSettings() {
  return {
    currentView:
      DEFAULT_SETTINGS.currentView
  };
}

export function normalizeService(
  value
) {
  const item =
    value &&
    typeof value === "object"
      ? value
      : {};

  const fallbackStatus =
    item.cancelled
      ? STATUS.GRADUATED
      : STATUS.CONSIDERING;

  const status =
    isKnownStatus(item.status)
      ? item.status
      : fallbackStatus;

  const name =
    normalizeText(
      item.name ||
      "名称未設定"
    );

  const price =
    Math.max(
      0,
      Number(item.price) || 0
    );

  const cycle =
    item.cycle === "yearly"
      ? "yearly"
      : "monthly";

  const createdAt =
    item.createdAt ||
    getCurrentIsoDateTime();

  const graduatedAt =
    item.graduatedAt ||
    item.cancelledAt ||
    "";

  return {
    id:
      String(item.id || createId()),

    name,

    price,

    cycle,

    renewalDate:
      String(
        item.renewalDate || ""
      ),

    icon:
      normalizeText(
        item.icon ||
        getDefaultIcon(name)
      ) ||
      getDefaultIcon(name),

    category:
      normalizeText(
        item.category ||
        "その他"
      ) ||
      "その他",

    cancelUrl:
      normalizeUrl(
        item.cancelUrl || ""
      ),

    status,

    holdUntil:
      String(
        item.holdUntil || ""
      ),

    previousStatus:
      isKnownStatus(
        item.previousStatus
      )
        ? item.previousStatus
        : "",

    createdAt,

    updatedAt:
      String(
        item.updatedAt || ""
      ),

    graduatedAt:
      status === STATUS.GRADUATED
        ? graduatedAt ||
          getCurrentIsoDateTime()
        : "",

    cancelled:
      status === STATUS.GRADUATED
  };
}

export function normalizeTimelineEntry(
  value
) {
  const item =
    value &&
    typeof value === "object"
      ? value
      : {};

  return {
    id:
      String(item.id || createId()),

    serviceId:
      String(
        item.serviceId || ""
      ),

    serviceName:
      normalizeText(
        item.serviceName ||
        "名称未設定"
      ),

    icon:
      normalizeText(
        item.icon || "◈"
      ) || "◈",

    action:
      normalizeText(
        item.action ||
        "更新しました"
      ),

    detail:
      normalizeText(
        item.detail || ""
      ),

    createdAt:
      String(
        item.createdAt ||
        getCurrentIsoDateTime()
      )
  };
}

export function normalizeSettings(
  value
) {
  const settings =
    value &&
    typeof value === "object"
      ? value
      : {};

  const allowedViews = [
    "today",
    "considering",
    "essential",
    "holding",
    "graduated"
  ];

  return {
    currentView:
      allowedViews.includes(
        settings.currentView
      )
        ? settings.currentView
        : DEFAULT_SETTINGS.currentView
  };
}

function loadArray(
  key
) {
  const raw =
    localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  const parsed =
    safeJsonParse(
      raw,
      null
    );

  return Array.isArray(parsed)
    ? parsed
    : null;
}

function loadObject(
  key
) {
  const raw =
    localStorage.getItem(key);

  if (!raw) {
    return null;
  }

  const parsed =
    safeJsonParse(
      raw,
      null
    );

  return (
    parsed &&
    typeof parsed === "object" &&
    !Array.isArray(parsed)
  )
    ? parsed
    : null;
}

function migrateFromKimeruV8() {
  const legacy =
    loadArray(
      STORAGE_KEYS
        .LEGACY_KIMERU_V8
    );

  if (!legacy) {
    return null;
  }

  return legacy.map(
    normalizeService
  );
}

function migrateFromMudazero() {
  const legacy =
    loadArray(
      STORAGE_KEYS
        .LEGACY_MUDAZERO
    );

  if (!legacy) {
    return null;
  }

  return legacy.map(
    item => {
      const status =
        item.cancelled
          ? STATUS.GRADUATED
          : STATUS.CONSIDERING;

      return normalizeService({
        ...item,

        status,

        graduatedAt:
          item.cancelledAt ||
          "",

        holdUntil: ""
      });
    }
  );
}

function migrateServices() {
  const fromV8 =
    migrateFromKimeruV8();

  if (fromV8) {
    saveServices(fromV8);

    return fromV8;
  }

  const fromMudazero =
    migrateFromMudazero();

  if (fromMudazero) {
    saveServices(
      fromMudazero
    );

    return fromMudazero;
  }

  return [];
}

export function loadServices() {
  try {
    const stored =
      loadArray(
        STORAGE_KEYS.SERVICES
      );

    if (stored) {
      return stored.map(
        normalizeService
      );
    }

    return migrateServices();
  } catch (error) {
    console.error(
      "サービスデータを読み込めませんでした。",
      error
    );

    return [];
  }
}

export function saveServices(
  services
) {
  try {
    const normalized =
      Array.isArray(services)
        ? services.map(
            normalizeService
          )
        : [];

    localStorage.setItem(
      STORAGE_KEYS.SERVICES,
      JSON.stringify(normalized)
    );

    return true;
  } catch (error) {
    console.error(
      "サービスデータを保存できませんでした。",
      error
    );

    return false;
  }
}

export function loadTimeline() {
  try {
    const stored =
      loadArray(
        STORAGE_KEYS.TIMELINE
      );

    if (!stored) {
      return [];
    }

    return stored
      .map(
        normalizeTimelineEntry
      )
      .sort(
        (a, b) =>
          new Date(b.createdAt) -
          new Date(a.createdAt)
      );
  } catch (error) {
    console.error(
      "履歴データを読み込めませんでした。",
      error
    );

    return [];
  }
}

export function saveTimeline(
  timeline
) {
  try {
    const normalized =
      Array.isArray(timeline)
        ? timeline
            .map(
              normalizeTimelineEntry
            )
            .slice(0, 300)
        : [];

    localStorage.setItem(
      STORAGE_KEYS.TIMELINE,
      JSON.stringify(normalized)
    );

    return true;
  } catch (error) {
    console.error(
      "履歴データを保存できませんでした。",
      error
    );

    return false;
  }
}

export function loadSettings() {
  try {
    const stored =
      loadObject(
        STORAGE_KEYS.SETTINGS
      );

    return normalizeSettings(
      stored
    );
  } catch (error) {
    console.error(
      "設定を読み込めませんでした。",
      error
    );

    return createDefaultSettings();
  }
}

export function saveSettings(
  settings
) {
  try {
    const normalized =
      normalizeSettings(
        settings
      );

    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(normalized)
    );

    return true;
  } catch (error) {
    console.error(
      "設定を保存できませんでした。",
      error
    );

    return false;
  }
}

export function createTimelineEntry({
  service,
  action,
  detail = ""
}) {
  return normalizeTimelineEntry({
    id: createId(),

    serviceId:
      service?.id || "",

    serviceName:
      service?.name ||
      "名称未設定",

    icon:
      service?.icon || "◈",

    action,

    detail,

    createdAt:
      getCurrentIsoDateTime()
  });
}

export function appendTimelineEntry(
  timeline,
  entry
) {
  const nextTimeline = [
    normalizeTimelineEntry(entry),
    ...(
      Array.isArray(timeline)
        ? timeline
        : []
    )
  ];

  const normalized =
    nextTimeline
      .map(
        normalizeTimelineEntry
      )
      .slice(0, 300);

  saveTimeline(normalized);

  return normalized;
}

export function buildBackupPayload({
  services,
  timeline,
  settings
}) {
  return {
    app: "KIMERU",

    version: APP_VERSION,

    exportedAt:
      getCurrentIsoDateTime(),

    services:
      Array.isArray(services)
        ? services.map(
            normalizeService
          )
        : [],

    timeline:
      Array.isArray(timeline)
        ? timeline.map(
            normalizeTimelineEntry
          )
        : [],

    settings:
      normalizeSettings(settings)
  };
}

export function validateBackupPayload(
  payload
) {
  if (
    !payload ||
    typeof payload !== "object"
  ) {
    return {
      valid: false,
      message:
        "バックアップデータの形式が正しくありません。"
    };
  }

  if (
    !Array.isArray(
      payload.services
    )
  ) {
    return {
      valid: false,
      message:
        "サービスデータが見つかりません。"
    };
  }

  return {
    valid: true,
    message: ""
  };
}

export function importBackupPayload(
  payload
) {
  const validation =
    validateBackupPayload(
      payload
    );

  if (!validation.valid) {
    throw new Error(
      validation.message
    );
  }

  const services =
    payload.services.map(
      normalizeService
    );

  const timeline =
    Array.isArray(
      payload.timeline
    )
      ? payload.timeline.map(
          normalizeTimelineEntry
        )
      : [];

  const settings =
    normalizeSettings(
      payload.settings
    );

  const servicesSaved =
    saveServices(services);

  const timelineSaved =
    saveTimeline(timeline);

  const settingsSaved =
    saveSettings(settings);

  if (
    !servicesSaved ||
    !timelineSaved ||
    !settingsSaved
  ) {
    throw new Error(
      "読み込んだデータを保存できませんでした。"
    );
  }

  return {
    services,
    timeline,
    settings
  };
}

export function clearKimeruV9Data() {
  localStorage.removeItem(
    STORAGE_KEYS.SERVICES
  );

  localStorage.removeItem(
    STORAGE_KEYS.TIMELINE
  );

  localStorage.removeItem(
    STORAGE_KEYS.SETTINGS
  );
}

export function createAppState() {
  return {
    services:
      loadServices(),

    timeline:
      loadTimeline(),

    settings:
      loadSettings()
  };
}
