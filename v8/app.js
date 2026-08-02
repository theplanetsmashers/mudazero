"use strict";

const STORAGE_KEY = "mudazero-data";
const KIMERU_STORAGE_KEY = "kimeru-v8-data";
const TIMELINE_KEY = "kimeru-v8-timeline";
const SETTINGS_KEY = "kimeru-v8-settings";

const STATUS = {
  CONSIDERING: "considering",
  ESSENTIAL: "essential",
  HOLDING: "holding",
  GRADUATED: "graduated"
};

let services = loadServices();
let timeline = loadTimeline();
let settings = loadSettings();

let selectedServiceId = null;
let pendingHoldServiceId = null;
let toastTimer = null;

const elements = {
  views: document.querySelectorAll(".view"),
  navButtons: document.querySelectorAll(".nav-button"),

  monthlyTotal: document.getElementById("monthlyTotal"),
  yearlyTotal: document.getElementById("yearlyTotal"),
  holdCount: document.getElementById("holdCount"),
  graduatedSavings: document.getElementById("graduatedSavings"),

  todayDecisionCard: document.getElementById("todayDecisionCard"),
  todayConsideringList: document.getElementById("todayConsideringList"),
  todayHoldingList: document.getElementById("todayHoldingList"),
  recentTimeline: document.getElementById("recentTimeline"),

  consideringList: document.getElementById("consideringList"),
  essentialList: document.getElementById("essentialList"),
  holdingList: document.getElementById("holdingList"),
  graduatedList: document.getElementById("graduatedList"),

  essentialYearlyTotal: document.getElementById("essentialYearlyTotal"),
  graduatedTotal: document.getElementById("graduatedTotal"),
  graduatedCount: document.getElementById("graduatedCount"),
  decisionCount: document.getElementById("decisionCount"),

  floatingAddButton: document.getElementById("floatingAddButton"),

  serviceFormModal: document.getElementById("serviceFormModal"),
  decisionModal: document.getElementById("decisionModal"),
  holdModal: document.getElementById("holdModal"),
  settingsModal: document.getElementById("settingsModal"),

  serviceForm: document.getElementById("serviceForm"),
  serviceId: document.getElementById("serviceId"),
  serviceName: document.getElementById("serviceName"),
  servicePrice: document.getElementById("servicePrice"),
  serviceCycle: document.getElementById("serviceCycle"),
  serviceRenewalDate: document.getElementById("serviceRenewalDate"),
  serviceStatus: document.getElementById("serviceStatus"),
  serviceIcon: document.getElementById("serviceIcon"),
  serviceCategory: document.getElementById("serviceCategory"),
  serviceCancelUrl: document.getElementById("serviceCancelUrl"),

  serviceFormTitle: document.getElementById("serviceFormTitle"),
  decisionTitle: document.getElementById("decisionTitle"),
  decisionContent: document.getElementById("decisionContent"),

  toast: document.getElementById("toast"),

  exportDataButton: document.getElementById("exportDataButton"),
  importDataButton: document.getElementById("importDataButton"),
  importFileInput: document.getElementById("importFileInput")
};

function loadServices() {
  try {
    const kimeruData = localStorage.getItem(KIMERU_STORAGE_KEY);

    if (kimeruData) {
      const parsed = JSON.parse(kimeruData);

      if (Array.isArray(parsed)) {
        return parsed.map(normalizeService);
      }
    }

    const legacyData = localStorage.getItem(STORAGE_KEY);

    if (!legacyData) {
      return [];
    }

    const legacyParsed = JSON.parse(legacyData);

    if (!Array.isArray(legacyParsed)) {
      return [];
    }

    const migrated = legacyParsed.map(item => {
      const status = item.cancelled
        ? STATUS.GRADUATED
        : STATUS.CONSIDERING;

      return normalizeService({
        ...item,
        status,
        graduatedAt: item.cancelledAt || "",
        holdUntil: ""
      });
    });

    localStorage.setItem(
      KIMERU_STORAGE_KEY,
      JSON.stringify(migrated)
    );

    return migrated;
  } catch (error) {
    console.error("データの読み込みに失敗しました。", error);
    return [];
  }
}

function loadTimeline() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(TIMELINE_KEY) || "[]"
    );

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("タイムラインの読み込みに失敗しました。", error);
    return [];
  }
}

function loadSettings() {
  try {
    const parsed = JSON.parse(
      localStorage.getItem(SETTINGS_KEY) || "{}"
    );

    return {
      currentView: parsed.currentView || "today"
    };
  } catch (error) {
    return {
      currentView: "today"
    };
  }
}

function saveServices() {
  localStorage.setItem(
    KIMERU_STORAGE_KEY,
    JSON.stringify(services)
  );
}

function saveTimeline() {
  localStorage.setItem(
    TIMELINE_KEY,
    JSON.stringify(timeline)
  );
}

function saveSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify(settings)
  );
}

function normalizeService(item) {
  const fallbackStatus = item.cancelled
    ? STATUS.GRADUATED
    : STATUS.CONSIDERING;

  return {
    id: item.id || createId(),
    name: String(item.name || "名称未設定"),
    price: Number(item.price) || 0,
    cycle: item.cycle === "yearly" ? "yearly" : "monthly",
    renewalDate: item.renewalDate || "",
    icon: item.icon || getDefaultIcon(item.name),
    category: item.category || "その他",
    cancelUrl: item.cancelUrl || "",
    status: [
      STATUS.CONSIDERING,
      STATUS.ESSENTIAL,
      STATUS.HOLDING,
      STATUS.GRADUATED
    ].includes(item.status)
      ? item.status
      : fallbackStatus,
    holdUntil: item.holdUntil || "",
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || "",
    graduatedAt:
      item.graduatedAt ||
      item.cancelledAt ||
      "",
    previousStatus: item.previousStatus || ""
  };
}

function createId() {
  if (
    window.crypto &&
    typeof window.crypto.randomUUID === "function"
  ) {
    return window.crypto.randomUUID();
  }

  return (
    Date.now().toString() +
    "-" +
    Math.random().toString(16).slice(2)
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatYen(value) {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  }).format(Math.round(Number(value) || 0));
}

function formatDate(dateString) {
  if (!dateString) {
    return "未設定";
  }

  const date = new Date(dateString + "T00:00:00");

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).format(date);
}

function formatDateTime(value) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getYearlyPrice(service) {
  return service.cycle === "monthly"
    ? Number(service.price) * 12
    : Number(service.price);
}

function getMonthlyPrice(service) {
  return service.cycle === "monthly"
    ? Number(service.price)
    : Number(service.price) / 12;
}

function getDaysUntil(dateString) {
  if (!dateString) {
    return Infinity;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const target = new Date(dateString + "T00:00:00");

  return Math.ceil(
    (target.getTime() - today.getTime()) / 86400000
  );
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate.toISOString().split("T")[0];
}

function getDefaultIcon(name) {
  const normalized = String(name || "").toLowerCase();

  if (
    normalized.includes("netflix") ||
    normalized.includes("ネットフリックス") ||
    normalized.includes("hulu") ||
    normalized.includes("disney") ||
    normalized.includes("動画")
  ) {
    return "🎬";
  }

  if (
    normalized.includes("spotify") ||
    normalized.includes("music") ||
    normalized.includes("音楽")
  ) {
    return "🎵";
  }

  if (
    normalized.includes("chatgpt") ||
    normalized.includes("openai") ||
    normalized.includes("ai")
  ) {
    return "✦";
  }

  if (
    normalized.includes("ゲーム") ||
    normalized.includes("game") ||
    normalized.includes("nintendo") ||
    normalized.includes("playstation")
  ) {
    return "🎮";
  }

  if (
    normalized.includes("icloud") ||
    normalized.includes("cloud") ||
    normalized.includes("ストレージ")
  ) {
    return "☁️";
  }

  if (
    normalized.includes("amazon") ||
    normalized.includes("prime")
  ) {
    return "📦";
  }

  if (
    normalized.includes("microsoft") ||
    normalized.includes("windows")
  ) {
    return "▦";
  }

  return "◈";
}

function getStatusLabel(status) {
  const labels = {
    [STATUS.CONSIDERING]: "検討中",
    [STATUS.ESSENTIAL]: "必須",
    [STATUS.HOLDING]: "保留中",
    [STATUS.GRADUATED]: "卒業"
  };

  return labels[status] || "検討中";
}

function getActiveServices() {
  return services.filter(
    service => service.status !== STATUS.GRADUATED
  );
}

function getServicesByStatus(status) {
  return services.filter(
    service => service.status === status
  );
}

function calculateDecisionScore(service) {
  if (service.status === STATUS.ESSENTIAL) {
    return {
      score: 0,
      reasons: ["必須に設定されているため、見直し対象外です"]
    };
  }

  let score = 0;
  const reasons = [];

  const yearlyPrice = getYearlyPrice(service);
  const daysUntilRenewal = getDaysUntil(service.renewalDate);

  if (yearlyPrice >= 50000) {
    score += 35;
    reasons.push("年間料金が5万円以上です");
  } else if (yearlyPrice >= 20000) {
    score += 25;
    reasons.push("年間料金が2万円以上です");
  } else if (yearlyPrice >= 10000) {
    score += 15;
    reasons.push("年間料金が1万円以上です");
  } else if (yearlyPrice >= 5000) {
    score += 8;
    reasons.push("年間料金が5千円以上です");
  }

  if (daysUntilRenewal < 0) {
    score += 25;
    reasons.push("更新日を過ぎています");
  } else if (daysUntilRenewal <= 3) {
    score += 30;
    reasons.push("更新まで3日以内です");
  } else if (daysUntilRenewal <= 7) {
    score += 22;
    reasons.push("更新まで7日以内です");
  } else if (daysUntilRenewal <= 14) {
    score += 12;
    reasons.push("更新まで2週間以内です");
  }

  const sameCategoryCount = getActiveServices().filter(
    item =>
      item.category === service.category &&
      item.status !== STATUS.ESSENTIAL
  ).length;

  if (sameCategoryCount >= 3) {
    score += 20;
    reasons.push(
      service.category +
      "カテゴリーを3件以上契約しています"
    );
  } else if (sameCategoryCount >= 2) {
    score += 10;
    reasons.push(
      service.category +
      "カテゴリーを複数契約しています"
    );
  }

  if (service.status === STATUS.HOLDING) {
    const holdDays = getDaysUntil(service.holdUntil);

    if (holdDays <= 0) {
      score += 25;
      reasons.push("保留期限を迎えています");
    }
  }

  if (reasons.length === 0) {
    reasons.push("現時点で強い見直し理由はありません");
  }

  return {
    score: Math.min(score, 100),
    reasons
  };
}

function getPrimaryDecisionService() {
  const considering = getServicesByStatus(
    STATUS.CONSIDERING
  );

  const dueHolding = getServicesByStatus(
    STATUS.HOLDING
  ).filter(
    service => getDaysUntil(service.holdUntil) <= 0
  );

  const candidates = [
    ...dueHolding,
    ...considering
  ];

  if (candidates.length === 0) {
    return null;
  }

  return candidates.sort((a, b) => {
    const scoreDifference =
      calculateDecisionScore(b).score -
      calculateDecisionScore(a).score;

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return (
      getDaysUntil(a.renewalDate) -
      getDaysUntil(b.renewalDate)
    );
  })[0];
}

function addTimelineEntry(service, action, detail = "") {
  timeline.unshift({
    id: createId(),
    serviceId: service.id,
    serviceName: service.name,
    icon: service.icon,
    action,
    detail,
    createdAt: new Date().toISOString()
  });

  timeline = timeline.slice(0, 200);
  saveTimeline();
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function showModal(modal) {
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  modal.classList.remove("show");
  modal.setAttribute("aria-hidden", "true");

  if (!document.querySelector(".modal-backdrop.show")) {
    document.body.classList.remove("modal-open");
  }
}

function navigateTo(viewName) {
  elements.views.forEach(view => {
    const isActive =
      view.dataset.view === viewName;

    view.classList.toggle("active", isActive);
    view.hidden = !isActive;
  });

  elements.navButtons.forEach(button => {
    button.classList.toggle(
      "active",
      button.dataset.viewTarget === viewName
    );
  });

  settings.currentView = viewName;
  saveSettings();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function renderSummary() {
  const activeServices = getActiveServices();

  const monthlyTotal = activeServices.reduce(
    (sum, service) =>
      sum + getMonthlyPrice(service),
    0
  );

  const yearlyTotal = activeServices.reduce(
    (sum, service) =>
      sum + getYearlyPrice(service),
    0
  );

  const holding = getServicesByStatus(
    STATUS.HOLDING
  );

  const graduated = getServicesByStatus(
    STATUS.GRADUATED
  );

  const graduatedSavings = graduated.reduce(
    (sum, service) =>
      sum + getYearlyPrice(service),
    0
  );

  elements.monthlyTotal.textContent =
    formatYen(monthlyTotal);

  elements.yearlyTotal.textContent =
    formatYen(yearlyTotal);

  elements.holdCount.textContent =
    holding.length + "件";

  elements.graduatedSavings.textContent =
    formatYen(graduatedSavings);
}

function renderTodayDecision() {
  const service = getPrimaryDecisionService();

  if (!service) {
    elements.todayDecisionCard.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">✓</div>

        <h2 class="empty-title">
          今日決めることはありません
        </h2>

        <p class="empty-description">
          検討中のサービスを登録すると、
          ここに優先候補を表示します。
        </p>
      </div>
    `;

    return;
  }

  const review = calculateDecisionScore(service);
  const renewalDays = getDaysUntil(
    service.renewalDate
  );

  const renewalLabel =
    renewalDays < 0
      ? "更新日経過"
      : renewalDays === 0
        ? "本日更新"
        : "更新まであと" +
          renewalDays +
          "日";

  const holdLabel =
    service.status === STATUS.HOLDING
      ? getDaysUntil(service.holdUntil) <= 0
        ? "保留期限です"
        : "保留中"
      : "";

  elements.todayDecisionCard.innerHTML = `
    <div class="decision-hero">
      <div class="decision-hero-main">
        <div class="service-icon">
          ${escapeHtml(service.icon)}
        </div>

        <div class="decision-hero-content">
          <h2 class="decision-hero-name">
            ${escapeHtml(service.name)}
          </h2>

          <div class="decision-hero-meta">
            <span class="meta-chip">
              決断指数 ${review.score}
            </span>

            <span class="meta-chip ${
              renewalDays <= 7
                ? "danger"
                : ""
            }">
              ${escapeHtml(renewalLabel)}
            </span>

            ${
              holdLabel
                ? `
                  <span class="meta-chip warning">
                    ${escapeHtml(holdLabel)}
                  </span>
                `
                : ""
            }
          </div>
        </div>
      </div>

      <div class="decision-cost">
        卒業すると年間
        <strong>
          ${formatYen(getYearlyPrice(service))}
        </strong>
        を整理できます。
      </div>

      <div class="decision-reasons">
        ${review.reasons
          .slice(0, 3)
          .map(
            reason => `
              <div class="decision-reason">
                <span>✓</span>
                <span>${escapeHtml(reason)}</span>
              </div>
            `
          )
          .join("")}
      </div>

      <button
        class="decision-primary-button"
        type="button"
        data-open-decision="${escapeHtml(service.id)}"
      >
        このサービスを決める
      </button>
    </div>
  `;
}

function renderCompactList(
  target,
  list,
  emptyMessage,
  valueFactory
) {
  target.innerHTML = "";

  if (list.length === 0) {
    target.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(emptyMessage)}
      </div>
    `;

    return;
  }

  list.forEach(service => {
    const button = document.createElement("button");

    button.type = "button";
    button.className = "compact-item";
    button.dataset.openDecision = service.id;

    button.innerHTML = `
      <div class="compact-icon">
        ${escapeHtml(service.icon)}
      </div>

      <div>
        <div class="compact-name">
          ${escapeHtml(service.name)}
        </div>

        <div class="compact-meta">
          ${escapeHtml(service.category)}
          ・
          ${
            service.cycle === "monthly"
              ? "月額"
              : "年額"
          }
          ${formatYen(service.price)}
        </div>
      </div>

      <div class="compact-value">
        ${escapeHtml(valueFactory(service))}
      </div>
    `;

    target.appendChild(button);
  });
}

function renderTodayLists() {
  const considering = getServicesByStatus(
    STATUS.CONSIDERING
  )
    .sort((a, b) => {
      return (
        calculateDecisionScore(b).score -
        calculateDecisionScore(a).score
      );
    })
    .slice(0, 3);

  const holding = getServicesByStatus(
    STATUS.HOLDING
  )
    .sort((a, b) => {
      return (
        getDaysUntil(a.holdUntil) -
        getDaysUntil(b.holdUntil)
      );
    })
    .slice(0, 3);

  renderCompactList(
    elements.todayConsideringList,
    considering,
    "検討中のサービスはありません。",
    service =>
      calculateDecisionScore(service).score +
      "点"
  );

  renderCompactList(
    elements.todayHoldingList,
    holding,
    "保留中のサービスはありません。",
    service => {
      const days = getDaysUntil(
        service.holdUntil
      );

      if (days < 0) {
        return "期限経過";
      }

      if (days === 0) {
        return "本日";
      }

      return "あと" + days + "日";
    }
  );
}

function renderTimeline() {
  elements.recentTimeline.innerHTML = "";

  const recent = timeline.slice(0, 6);

  if (recent.length === 0) {
    elements.recentTimeline.innerHTML = `
      <div class="empty-state">
        まだ決断の記録はありません。
      </div>
    `;

    return;
  }

  recent.forEach(entry => {
    const item = document.createElement("div");
    item.className = "timeline-item";

    item.innerHTML = `
      <div class="timeline-date">
        ${escapeHtml(formatDateTime(entry.createdAt))}
      </div>

      <div class="timeline-text">
        ${escapeHtml(entry.icon || "◈")}
        ${escapeHtml(entry.serviceName)}
        を
        ${escapeHtml(entry.action)}
        ${
          entry.detail
            ? "・" + escapeHtml(entry.detail)
            : ""
        }
      </div>
    `;

    elements.recentTimeline.appendChild(item);
  });
}

function renderServiceCard(service) {
  const review = calculateDecisionScore(service);
  const renewalDays = getDaysUntil(
    service.renewalDate
  );

  const serviceCard =
    document.createElement("article");

  serviceCard.className = "service-card";

  serviceCard.innerHTML = `
    <button
      class="service-card-button"
      type="button"
      data-open-decision="${escapeHtml(service.id)}"
    >
      <div class="service-icon">
        ${escapeHtml(service.icon)}
      </div>

      <div class="service-main">
        <div class="service-name">
          ${escapeHtml(service.name)}
        </div>

        <div class="service-meta">
          ${
            service.cycle === "monthly"
              ? "月額"
              : "年額"
          }
          ${formatYen(service.price)}
          ・
          年間
          ${formatYen(getYearlyPrice(service))}
        </div>

        <span class="status-badge ${escapeHtml(service.status)}">
          ${escapeHtml(getStatusLabel(service.status))}
        </span>
      </div>

      <div class="service-side">
        ${
          service.status === STATUS.ESSENTIAL
            ? `
              <div class="service-value">
                必須
              </div>
            `
            : service.status === STATUS.HOLDING
              ? `
                <div class="service-value">
                  ${
                    getDaysUntil(service.holdUntil) <= 0
                      ? "期限"
                      : "あと" +
                        getDaysUntil(service.holdUntil) +
                        "日"
                  }
                </div>
              `
              : service.status === STATUS.GRADUATED
                ? `
                  <div class="service-value">
                    ${formatYen(getYearlyPrice(service))}
                  </div>
                `
                : `
                  <div class="service-value">
                    ${review.score}点
                  </div>
                `
        }

        <div class="service-subvalue">
          ${
            renewalDays < 0
              ? "更新日経過"
              : renewalDays === 0
                ? "本日更新"
                : "更新まで" +
                  renewalDays +
                  "日"
          }
        </div>
      </div>
    </button>
  `;

  return serviceCard;
}

function renderStatusLists() {
  const considering = getServicesByStatus(
    STATUS.CONSIDERING
  ).sort((a, b) => {
    return (
      calculateDecisionScore(b).score -
      calculateDecisionScore(a).score
    );
  });

  const essential = getServicesByStatus(
    STATUS.ESSENTIAL
  ).sort((a, b) =>
    a.name.localeCompare(b.name, "ja")
  );

  const holding = getServicesByStatus(
    STATUS.HOLDING
  ).sort((a, b) => {
    return (
      getDaysUntil(a.holdUntil) -
      getDaysUntil(b.holdUntil)
    );
  });

  const graduated = getServicesByStatus(
    STATUS.GRADUATED
  ).sort((a, b) => {
    return new Date(b.graduatedAt || 0) -
      new Date(a.graduatedAt || 0);
  });

  renderListContainer(
    elements.consideringList,
    considering,
    "検討中のサービスはありません。"
  );

  renderListContainer(
    elements.essentialList,
    essential,
    "必須のサービスはありません。"
  );

  renderListContainer(
    elements.holdingList,
    holding,
    "保留中のサービスはありません。"
  );

  renderListContainer(
    elements.graduatedList,
    graduated,
    "卒業したサービスはありません。"
  );

  const essentialYearlyTotal = essential.reduce(
    (sum, service) =>
      sum + getYearlyPrice(service),
    0
  );

  const graduatedTotal = graduated.reduce(
    (sum, service) =>
      sum + getYearlyPrice(service),
    0
  );

  elements.essentialYearlyTotal.textContent =
    formatYen(essentialYearlyTotal);

  elements.graduatedTotal.textContent =
    formatYen(graduatedTotal);

  elements.graduatedCount.textContent =
    graduated.length + "件";

  elements.decisionCount.textContent =
    timeline.length + "回";
}

function renderListContainer(
  container,
  list,
  emptyMessage
) {
  container.innerHTML = "";

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        ${escapeHtml(emptyMessage)}
      </div>
    `;

    return;
  }

  list.forEach(service => {
    container.appendChild(
      renderServiceCard(service)
    );
  });
}

function renderAll() {
  checkExpiredHolds();
  renderSummary();
  renderTodayDecision();
  renderTodayLists();
  renderTimeline();
  renderStatusLists();
}

function checkExpiredHolds() {
  let changed = false;

  services.forEach(service => {
    if (
      service.status === STATUS.HOLDING &&
      service.holdUntil &&
      getDaysUntil(service.holdUntil) <= 0
    ) {
      changed = true;
    }
  });

  if (changed) {
    saveServices();
  }
}

function resetServiceForm() {
  elements.serviceForm.reset();
  elements.serviceId.value = "";
  elements.serviceFormTitle.textContent =
    "サブスクを追加";
  elements.serviceStatus.value =
    STATUS.CONSIDERING;
  elements.serviceCategory.value =
    "その他";

  const defaultDate = new Date();
  defaultDate.setMonth(
    defaultDate.getMonth() + 1
  );

  elements.serviceRenewalDate.value =
    defaultDate.toISOString().split("T")[0];
}

function openAddForm(defaultStatus = STATUS.CONSIDERING) {
  resetServiceForm();

  elements.serviceStatus.value =
    defaultStatus === STATUS.ESSENTIAL
      ? STATUS.ESSENTIAL
      : STATUS.CONSIDERING;

  showModal(elements.serviceFormModal);
}

function openEditForm(serviceId) {
  const service = services.find(
    item => item.id === serviceId
  );

  if (!service) {
    return;
  }

  elements.serviceId.value = service.id;
  elements.serviceFormTitle.textContent =
    "サブスクを編集";
  elements.serviceName.value = service.name;
  elements.servicePrice.value = service.price;
  elements.serviceCycle.value = service.cycle;
  elements.serviceRenewalDate.value =
    service.renewalDate;
  elements.serviceStatus.value =
    service.status === STATUS.ESSENTIAL
      ? STATUS.ESSENTIAL
      : STATUS.CONSIDERING;
  elements.serviceIcon.value = service.icon;
  elements.serviceCategory.value =
    service.category;
  elements.serviceCancelUrl.value =
    service.cancelUrl;

  closeModal(elements.decisionModal);
  showModal(elements.serviceFormModal);
}

function openDecision(serviceId) {
  const service = services.find(
    item => item.id === serviceId
  );

  if (!service) {
    return;
  }

  selectedServiceId = service.id;

  const review = calculateDecisionScore(service);
  const yearly = getYearlyPrice(service);
  const renewalDays = getDaysUntil(
    service.renewalDate
  );

  elements.decisionTitle.textContent =
    service.name;

  elements.decisionContent.innerHTML = `
    <div class="decision-summary">
      <div class="decision-summary-header">
        <div class="service-icon">
          ${escapeHtml(service.icon)}
        </div>

        <div>
          <h3 class="decision-summary-name">
            ${escapeHtml(service.name)}
          </h3>

          <div class="decision-summary-meta">
            ${escapeHtml(service.category)}
            ・
            ${escapeHtml(getStatusLabel(service.status))}
          </div>
        </div>
      </div>

      <div class="future-cost-grid">
        <div class="future-cost-box">
          <div class="future-label">
            現在の料金
          </div>

          <div class="future-value">
            ${
              service.cycle === "monthly"
                ? "月額"
                : "年額"
            }
            ${formatYen(service.price)}
          </div>
        </div>

        <div class="future-cost-box">
          <div class="future-label">
            年間コスト
          </div>

          <div class="future-value">
            ${formatYen(yearly)}
          </div>
        </div>

        <div class="future-cost-box">
          <div class="future-label">
            5年間続けると
          </div>

          <div class="future-value">
            ${formatYen(yearly * 5)}
          </div>
        </div>

        <div class="future-cost-box">
          <div class="future-label">
            10年間続けると
          </div>

          <div class="future-value">
            ${formatYen(yearly * 10)}
          </div>
        </div>
      </div>

      <div class="decision-reasons">
        ${review.reasons
          .map(
            reason => `
              <div class="decision-reason">
                <span>✓</span>
                <span>${escapeHtml(reason)}</span>
              </div>
            `
          )
          .join("")}
      </div>

      <div
        class="service-meta"
        style="margin-top:14px;"
      >
        次回更新日：
        ${escapeHtml(formatDate(service.renewalDate))}
        ${
          Number.isFinite(renewalDays)
            ? "（" +
              (
                renewalDays < 0
                  ? Math.abs(renewalDays) +
                    "日前に経過"
                  : renewalDays === 0
                    ? "本日"
                    : "あと" +
                      renewalDays +
                      "日"
              ) +
              "）"
            : ""
        }
      </div>

      ${
        service.cancelUrl
          ? `
            <a
              class="decision-primary-button"
              href="${escapeHtml(service.cancelUrl)}"
              target="_blank"
              rel="noopener noreferrer"
              style="
                display:flex;
                align-items:center;
                justify-content:center;
                text-decoration:none;
              "
            >
              解約ページを開く
            </a>
          `
          : ""
      }
    </div>
  `;

  showModal(elements.decisionModal);
}

function updateServiceStatus(
  service,
  newStatus,
  timelineAction,
  detail = ""
) {
  service.previousStatus = service.status;
  service.status = newStatus;
  service.updatedAt = new Date().toISOString();

  if (newStatus !== STATUS.HOLDING) {
    service.holdUntil = "";
  }

  if (newStatus === STATUS.GRADUATED) {
    service.graduatedAt =
      new Date().toISOString();
  } else {
    service.graduatedAt = "";
  }

  saveServices();
  addTimelineEntry(
    service,
    timelineAction,
    detail
  );

  closeModal(elements.decisionModal);
  closeModal(elements.holdModal);

  renderAll();
}

function handleDecision(decision) {
  const service = services.find(
    item => item.id === selectedServiceId
  );

  if (!service) {
    return;
  }

  if (decision === STATUS.ESSENTIAL) {
    updateServiceStatus(
      service,
      STATUS.ESSENTIAL,
      "必須にしました"
    );

    showToast(
      service.name +
      "を必須にしました"
    );

    return;
  }

  if (decision === STATUS.CONSIDERING) {
    updateServiceStatus(
      service,
      STATUS.CONSIDERING,
      "検討中に戻しました"
    );

    showToast(
      service.name +
      "を検討中に戻しました"
    );

    return;
  }

  if (decision === "hold") {
    pendingHoldServiceId = service.id;

    closeModal(elements.decisionModal);
    showModal(elements.holdModal);

    return;
  }

  if (decision === STATUS.GRADUATED) {
    const confirmed = window.confirm(
      service.name +
      "を卒業済みとして記録しますか？"
    );

    if (!confirmed) {
      return;
    }

    updateServiceStatus(
      service,
      STATUS.GRADUATED,
      "卒業しました",
      "年間" +
      formatYen(getYearlyPrice(service)) +
      "を整理"
    );

    showToast(
      service.name +
      "を卒業にしました"
    );
  }
}

function setHold(days) {
  const service = services.find(
    item => item.id === pendingHoldServiceId
  );

  if (!service) {
    return;
  }

  service.previousStatus = service.status;
  service.status = STATUS.HOLDING;
  service.holdUntil = addDays(
    new Date(),
    days
  );
  service.updatedAt =
    new Date().toISOString();

  saveServices();

  addTimelineEntry(
    service,
    days + "日保留にしました",
    formatDate(service.holdUntil) +
    "に再判断"
  );

  closeModal(elements.holdModal);

  pendingHoldServiceId = null;

  renderAll();

  showToast(
    service.name +
    "を" +
    days +
    "日保留にしました"
  );
}

function deleteSelectedService() {
  const service = services.find(
    item => item.id === selectedServiceId
  );

  if (!service) {
    return;
  }

  const confirmed = window.confirm(
    service.name +
    "を完全に削除しますか？"
  );

  if (!confirmed) {
    return;
  }

  services = services.filter(
    item => item.id !== service.id
  );

  saveServices();

  addTimelineEntry(
    service,
    "削除しました"
  );

  closeModal(elements.decisionModal);

  selectedServiceId = null;

  renderAll();

  showToast(
    service.name +
    "を削除しました"
  );
}

function saveServiceFromForm(event) {
  event.preventDefault();

  const name =
    elements.serviceName.value.trim();

  const price = Number(
    elements.servicePrice.value
  );

  const renewalDate =
    elements.serviceRenewalDate.value;

  if (
    !name ||
    !Number.isFinite(price) ||
    price <= 0 ||
    !renewalDate
  ) {
    window.alert(
      "サービス名、料金、更新日を確認してください。"
    );

    return;
  }

  const id = elements.serviceId.value;

  const data = {
    name,
    price,
    cycle: elements.serviceCycle.value,
    renewalDate,
    status: elements.serviceStatus.value,
    icon:
      elements.serviceIcon.value.trim() ||
      getDefaultIcon(name),
    category:
      elements.serviceCategory.value,
    cancelUrl:
      elements.serviceCancelUrl.value.trim()
  };

  if (id) {
    const service = services.find(
      item => item.id === id
    );

    if (!service) {
      return;
    }

    Object.assign(service, data, {
      updatedAt: new Date().toISOString()
    });

    if (
      data.status !== STATUS.HOLDING
    ) {
      service.holdUntil = "";
    }

    if (
      data.status !== STATUS.GRADUATED
    ) {
      service.graduatedAt = "";
    }

    addTimelineEntry(
      service,
      "内容を編集しました"
    );

    showToast(
      service.name +
      "を更新しました"
    );
  } else {
    const service = normalizeService({
      id: createId(),
      ...data,
      createdAt: new Date().toISOString()
    });

    services.push(service);

    addTimelineEntry(
      service,
      "登録しました",
      getStatusLabel(service.status)
    );

    showToast(
      service.name +
      "を登録しました"
    );
  }

  saveServices();
  closeModal(elements.serviceFormModal);

  renderAll();
}

function exportData() {
  const payload = {
    app: "KIMERU",
    version: 8,
    exportedAt: new Date().toISOString(),
    services,
    timeline,
    settings
  };

  const blob = new Blob(
    [JSON.stringify(payload, null, 2)],
    {
      type: "application/json"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  const date =
    new Date()
      .toISOString()
      .split("T")[0];

  anchor.href = url;
  anchor.download =
    "kimeru-backup-" +
    date +
    ".json";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);

  showToast(
    "データを書き出しました"
  );
}

async function importData(file) {
  try {
    const text = await file.text();
    const payload = JSON.parse(text);

    if (
      !payload ||
      !Array.isArray(payload.services)
    ) {
      throw new Error(
        "正しいKIMERUデータではありません。"
      );
    }

    const confirmed = window.confirm(
      "現在のデータを、読み込んだデータで置き換えますか？"
    );

    if (!confirmed) {
      return;
    }

    services = payload.services.map(
      normalizeService
    );

    timeline = Array.isArray(
      payload.timeline
    )
      ? payload.timeline
      : [];

    settings = {
      currentView:
        payload.settings?.currentView ||
        "today"
    };

    saveServices();
    saveTimeline();
    saveSettings();

    closeModal(elements.settingsModal);

    renderAll();
    navigateTo("today");

    showToast(
      "データを読み込みました"
    );
  } catch (error) {
    console.error(error);

    window.alert(
      "データを読み込めませんでした。ファイルを確認してください。"
    );
  } finally {
    elements.importFileInput.value = "";
  }
}

document.addEventListener(
  "click",
  event => {
    const navTarget = event.target.closest(
      "[data-view-target]"
    );

    if (navTarget) {
      navigateTo(
        navTarget.dataset.viewTarget
      );

      return;
    }

    const navigateButton =
      event.target.closest(
        "[data-navigate]"
      );

    if (navigateButton) {
      navigateTo(
        navigateButton.dataset.navigate
      );

      return;
    }

    const decisionTarget =
      event.target.closest(
        "[data-open-decision]"
      );

    if (decisionTarget) {
      openDecision(
        decisionTarget.dataset.openDecision
      );
    }
  }
);

elements.navButtons.forEach(button => {
  button.addEventListener("click", () => {
    navigateTo(
      button.dataset.viewTarget
    );
  });
});

elements.floatingAddButton.addEventListener(
  "click",
  () => openAddForm()
);

document.getElementById(
  "openAddButtonConsidering"
).addEventListener(
  "click",
  () =>
    openAddForm(STATUS.CONSIDERING)
);

document.getElementById(
  "openAddButtonEssential"
).addEventListener(
  "click",
  () =>
    openAddForm(STATUS.ESSENTIAL)
);

elements.serviceForm.addEventListener(
  "submit",
  saveServiceFromForm
);

document.getElementById(
  "closeServiceFormButton"
).addEventListener(
  "click",
  () =>
    closeModal(
      elements.serviceFormModal
    )
);

document.getElementById(
  "cancelServiceFormButton"
).addEventListener(
  "click",
  () =>
    closeModal(
      elements.serviceFormModal
    )
);

document.getElementById(
  "closeDecisionButton"
).addEventListener(
  "click",
  () =>
    closeModal(elements.decisionModal)
);

document.getElementById(
  "closeHoldButton"
).addEventListener(
  "click",
  () =>
    closeModal(elements.holdModal)
);

document.getElementById(
  "openSettingsButton"
).addEventListener(
  "click",
  () =>
    showModal(elements.settingsModal)
);

document.getElementById(
  "closeSettingsButton"
).addEventListener(
  "click",
  () =>
    closeModal(elements.settingsModal)
);

document.querySelectorAll(
  "[data-decision]"
).forEach(button => {
  button.addEventListener(
    "click",
    () => {
      handleDecision(
        button.dataset.decision
      );
    }
  );
});

document.querySelectorAll(
  "[data-hold-days]"
).forEach(button => {
  button.addEventListener(
    "click",
    () => {
      setHold(
        Number(button.dataset.holdDays)
      );
    }
  );
});

document.getElementById(
  "editFromDecisionButton"
).addEventListener(
  "click",
  () => {
    if (selectedServiceId) {
      openEditForm(
        selectedServiceId
      );
    }
  }
);

document.getElementById(
  "deleteFromDecisionButton"
).addEventListener(
  "click",
  deleteSelectedService
);

elements.exportDataButton.addEventListener(
  "click",
  exportData
);

elements.importDataButton.addEventListener(
  "click",
  () => {
    elements.importFileInput.click();
  }
);

elements.importFileInput.addEventListener(
  "change",
  event => {
    const file =
      event.target.files?.[0];

    if (file) {
      importData(file);
    }
  }
);

[
  elements.serviceFormModal,
  elements.decisionModal,
  elements.holdModal,
  elements.settingsModal
].forEach(modal => {
  modal.addEventListener(
    "click",
    event => {
      if (event.target === modal) {
        closeModal(modal);
      }
    }
  );
});

document.addEventListener(
  "keydown",
  event => {
    if (event.key !== "Escape") {
      return;
    }

    document
      .querySelectorAll(
        ".modal-backdrop.show"
      )
      .forEach(closeModal);
  }
);

resetServiceForm();
renderAll();

const initialView = [
  "today",
  "considering",
  "essential",
  "holding",
  "graduated"
].includes(settings.currentView)
  ? settings.currentView
  : "today";

navigateTo(initialView);
