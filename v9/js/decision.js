"use strict";

import {
  STATUS,
  addDays,
  clamp,
  formatYen,
  getCurrentIsoDateTime,
  getDaysUntil,
  getMonthlyPrice,
  getYearlyPrice,
  sortByHoldDate,
  sortByName
} from "./utils.js";

export function getActiveServices(
  services
) {
  return normalizeServiceArray(
    services
  ).filter(
    service =>
      service.status !==
      STATUS.GRADUATED
  );
}

export function getServicesByStatus(
  services,
  status
) {
  return normalizeServiceArray(
    services
  ).filter(
    service =>
      service.status === status
  );
}

export function getConsideringServices(
  services
) {
  return getServicesByStatus(
    services,
    STATUS.CONSIDERING
  );
}

export function getEssentialServices(
  services
) {
  return sortByName(
    getServicesByStatus(
      services,
      STATUS.ESSENTIAL
    )
  );
}

export function getHoldingServices(
  services
) {
  return sortByHoldDate(
    getServicesByStatus(
      services,
      STATUS.HOLDING
    )
  );
}

export function getGraduatedServices(
  services
) {
  return getServicesByStatus(
    services,
    STATUS.GRADUATED
  ).sort(
    (a, b) =>
      getTimestamp(
        b.graduatedAt
      ) -
      getTimestamp(
        a.graduatedAt
      )
  );
}

export function getCategoryCount({
  services,
  category,
  excludeEssential = true
}) {
  return getActiveServices(
    services
  ).filter(
    service => {
      if (
        excludeEssential &&
        service.status ===
          STATUS.ESSENTIAL
      ) {
        return false;
      }

      return (
        service.category ===
        category
      );
    }
  ).length;
}

export function calculatePriority({
  service,
  services
}) {
  if (!service) {
    return {
      score: 0,
      reasons: [
        "サービス情報がありません"
      ],
      level: "確認不要"
    };
  }

  if (
    service.status ===
    STATUS.ESSENTIAL
  ) {
    return {
      score: 0,
      reasons: [
        "必要に設定されているため、確認対象外です"
      ],
      level: "確認対象外"
    };
  }

  if (
    service.status ===
    STATUS.GRADUATED
  ) {
    return {
      score: 0,
      reasons: [
        "卒業済みのサービスです"
      ],
      level: "卒業済み"
    };
  }

  let score = 0;
  const reasons = [];

  const yearlyPrice =
    getYearlyPrice(service);

  const renewalDays =
    getDaysUntil(
      service.renewalDate
    );

  score += getPriceScore({
    yearlyPrice,
    reasons
  });

  score += getRenewalScore({
    renewalDays,
    reasons
  });

  score += getCategoryScore({
    service,
    services,
    reasons
  });

  score += getHoldingScore({
    service,
    reasons
  });

  const normalizedScore =
    clamp(
      score,
      0,
      100
    );

  if (reasons.length === 0) {
    reasons.push(
      "現時点で急いで確認する理由はありません"
    );
  }

  return {
    score:
      normalizedScore,

    reasons,

    level:
      getPriorityLevel(
        normalizedScore
      )
  };
}

function getPriceScore({
  yearlyPrice,
  reasons
}) {
  if (yearlyPrice >= 50000) {
    reasons.push(
      "年間料金が5万円以上です"
    );

    return 35;
  }

  if (yearlyPrice >= 20000) {
    reasons.push(
      "年間料金が2万円以上です"
    );

    return 25;
  }

  if (yearlyPrice >= 10000) {
    reasons.push(
      "年間料金が1万円以上です"
    );

    return 15;
  }

  if (yearlyPrice >= 5000) {
    reasons.push(
      "年間料金が5千円以上です"
    );

    return 8;
  }

  return 0;
}

function getRenewalScore({
  renewalDays,
  reasons
}) {
  if (
    !Number.isFinite(
      renewalDays
    )
  ) {
    return 0;
  }

  if (renewalDays < 0) {
    reasons.push(
      "更新日を過ぎています"
    );

    return 25;
  }

  if (renewalDays <= 3) {
    reasons.push(
      "更新まで3日以内です"
    );

    return 30;
  }

  if (renewalDays <= 7) {
    reasons.push(
      "更新まで7日以内です"
    );

    return 22;
  }

  if (renewalDays <= 14) {
    reasons.push(
      "更新まで2週間以内です"
    );

    return 12;
  }

  return 0;
}

function getCategoryScore({
  service,
  services,
  reasons
}) {
  const categoryCount =
    getCategoryCount({
      services,
      category:
        service.category,
      excludeEssential: true
    });

  if (categoryCount >= 3) {
    reasons.push(
      service.category +
      "カテゴリーを3件以上契約しています"
    );

    return 20;
  }

  if (categoryCount >= 2) {
    reasons.push(
      service.category +
      "カテゴリーを複数契約しています"
    );

    return 10;
  }

  return 0;
}

function getHoldingScore({
  service,
  reasons
}) {
  if (
    service.status !==
    STATUS.HOLDING
  ) {
    return 0;
  }

  const holdDays =
    getDaysUntil(
      service.holdUntil
    );

  if (
    !Number.isFinite(
      holdDays
    )
  ) {
    reasons.push(
      "保留期限が設定されていません"
    );

    return 10;
  }

  if (holdDays <= 0) {
    reasons.push(
      "保留期限を迎えています"
    );

    return 30;
  }

  if (holdDays <= 3) {
    reasons.push(
      "保留期限まで3日以内です"
    );

    return 15;
  }

  return 0;
}

export function getPriorityLevel(
  score
) {
  if (score >= 70) {
    return "早めに確認";
  }

  if (score >= 40) {
    return "確認候補";
  }

  return "急がなくて大丈夫";
}

export function sortByPriority(
  services
) {
  const list =
    normalizeServiceArray(
      services
    );

  return [...list].sort(
    (a, b) => {
      const scoreDifference =
        calculatePriority({
          service: b,
          services: list
        }).score -
        calculatePriority({
          service: a,
          services: list
        }).score;

      if (
        scoreDifference !== 0
      ) {
        return scoreDifference;
      }

      const renewalDifference =
        getDaysUntil(
          a.renewalDate
        ) -
        getDaysUntil(
          b.renewalDate
        );

      if (
        renewalDifference !== 0
      ) {
        return renewalDifference;
      }

      return (
        getYearlyPrice(b) -
        getYearlyPrice(a)
      );
    }
  );
}

export function getPrimaryDecisionService(
  services
) {
  const list =
    normalizeServiceArray(
      services
    );

  const expiredHolding =
    getHoldingServices(
      list
    ).filter(
      service =>
        getDaysUntil(
          service.holdUntil
        ) <= 0
    );

  const considering =
    getConsideringServices(
      list
    );

  const candidates = [
    ...expiredHolding,
    ...considering
  ];

  if (
    candidates.length === 0
  ) {
    return null;
  }

  return sortByPriority(
    candidates
  )[0] || null;
}

export function getTodayConsideringServices(
  services,
  limit = 3
) {
  return sortByPriority(
    getConsideringServices(
      services
    )
  ).slice(
    0,
    Math.max(
      0,
      Number(limit) || 0
    )
  );
}

export function getTodayHoldingServices(
  services,
  limit = 3
) {
  return getHoldingServices(
    services
  ).slice(
    0,
    Math.max(
      0,
      Number(limit) || 0
    )
  );
}

export function calculateSummary(
  services
) {
  const active =
    getActiveServices(
      services
    );

  const graduated =
    getGraduatedServices(
      services
    );

  const monthlyTotal =
    active.reduce(
      (sum, service) =>
        sum +
        getMonthlyPrice(
          service
        ),
      0
    );

  const yearlyTotal =
    active.reduce(
      (sum, service) =>
        sum +
        getYearlyPrice(
          service
        ),
      0
    );

  const graduatedTotal =
    graduated.reduce(
      (sum, service) =>
        sum +
        getYearlyPrice(
          service
        ),
      0
    );

  const essentialTotal =
    getEssentialServices(
      services
    ).reduce(
      (sum, service) =>
        sum +
        getYearlyPrice(
          service
        ),
      0
    );

  return {
    monthlyTotal,
    yearlyTotal,
    graduatedTotal,
    essentialTotal,

    activeCount:
      active.length,

    holdingCount:
      getHoldingServices(
        services
      ).length,

    graduatedCount:
      graduated.length
  };
}

export function applyStatus({
  service,
  status
}) {
  if (!service) {
    return null;
  }

  const now =
    getCurrentIsoDateTime();

  const updated = {
    ...service,

    previousStatus:
      service.status,

    status,

    updatedAt: now,

    cancelled:
      status ===
      STATUS.GRADUATED
  };

  if (
    status !==
    STATUS.HOLDING
  ) {
    updated.holdUntil = "";
  }

  if (
    status ===
    STATUS.GRADUATED
  ) {
    updated.graduatedAt =
      now;
  } else {
    updated.graduatedAt =
      "";
  }

  return updated;
}

export function applyHolding({
  service,
  days
}) {
  if (!service) {
    return null;
  }

  const holdDays =
    Number(days);

  if (
    ![7, 30, 90].includes(
      holdDays
    )
  ) {
    throw new Error(
      "保留期間が正しくありません。"
    );
  }

  return {
    ...service,

    previousStatus:
      service.status,

    status:
      STATUS.HOLDING,

    holdUntil:
      addDays(
        new Date(),
        holdDays
      ),

    updatedAt:
      getCurrentIsoDateTime(),

    graduatedAt: "",

    cancelled: false
  };
}

export function replaceService(
  services,
  updatedService
) {
  if (!updatedService) {
    return normalizeServiceArray(
      services
    );
  }

  return normalizeServiceArray(
    services
  ).map(
    service =>
      service.id ===
      updatedService.id
        ? updatedService
        : service
  );
}

export function removeService(
  services,
  serviceId
) {
  return normalizeServiceArray(
    services
  ).filter(
    service =>
      service.id !== serviceId
  );
}

export function findService(
  services,
  serviceId
) {
  return (
    normalizeServiceArray(
      services
    ).find(
      service =>
        service.id ===
        serviceId
    ) || null
  );
}

export function createStatusMessage({
  service,
  status
}) {
  if (!service) {
    return "";
  }

  if (
    status ===
    STATUS.ESSENTIAL
  ) {
    return (
      service.name +
      "を必要にしました"
    );
  }

  if (
    status ===
    STATUS.CONSIDERING
  ) {
    return (
      service.name +
      "を検討中に戻しました"
    );
  }

  if (
    status ===
    STATUS.GRADUATED
  ) {
    return (
      service.name +
      "を卒業にしました"
    );
  }

  return (
    service.name +
    "を更新しました"
  );
}

export function createStatusTimelineData({
  service,
  status
}) {
  if (!service) {
    return {
      action:
        "状態を変更しました",
      detail: ""
    };
  }

  if (
    status ===
    STATUS.ESSENTIAL
  ) {
    return {
      action:
        "必要にしました",

      detail:
        "見直し対象から外しました"
    };
  }

  if (
    status ===
    STATUS.CONSIDERING
  ) {
    return {
      action:
        "検討中に戻しました",

      detail:
        "引き続き確認します"
    };
  }

  if (
    status ===
    STATUS.GRADUATED
  ) {
    return {
      action:
        "卒業しました",

      detail:
        "年間" +
        formatYen(
          getYearlyPrice(
            service
          )
        ) +
        "を整理"
    };
  }

  return {
    action:
      "状態を変更しました",

    detail: ""
  };
}

export function createHoldingTimelineData({
  service,
  days,
  holdUntil
}) {
  return {
    action:
      days +
      "日後まで保留にしました",

    detail:
      holdUntil
        ? holdUntil +
          "に再判断"
        : ""
  };
}

export function getFutureCosts(
  service
) {
  const yearly =
    getYearlyPrice(
      service
    );

  return {
    yearly,

    fiveYears:
      yearly * 5,

    tenYears:
      yearly * 10
  };
}

export function isHoldingExpired(
  service
) {
  return (
    service?.status ===
      STATUS.HOLDING &&
    getDaysUntil(
      service.holdUntil
    ) <= 0
  );
}

export function countExpiredHolding(
  services
) {
  return getHoldingServices(
    services
  ).filter(
    isHoldingExpired
  ).length;
}

function normalizeServiceArray(
  services
) {
  return Array.isArray(
    services
  )
    ? services
    : [];
}

function getTimestamp(
  value
) {
  const timestamp =
    new Date(
      value || 0
    ).getTime();

  return Number.isFinite(
    timestamp
  )
    ? timestamp
    : 0;
}
