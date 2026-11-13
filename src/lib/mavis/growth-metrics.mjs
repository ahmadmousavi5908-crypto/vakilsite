const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function finiteNonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function analyzeSearchPerformance(row) {
  const impressions = finiteNonNegative(row?.impressions);
  const clicks = finiteNonNegative(row?.clicks);
  const rawPosition = finiteNonNegative(row?.averagePosition);
  const position = rawPosition !== null && rawPosition > 0 ? rawPosition : null;
  const conversions = finiteNonNegative(row?.qualifiedLeads);

  if (impressions === null || clicks === null || clicks > impressions) {
    return { ok: false, reason: "invalid_search_console_metrics" };
  }

  const ctr = impressions > 0 ? clicks / impressions : null;
  const opportunity = impressions > 0
    ? clamp((Math.log10(impressions + 1) / 5) * (1 - (ctr ?? 0)), 0, 1)
    : 0;
  const visibility = position === null ? null : clamp((21 - position) / 20, 0, 1);

  return {
    ok: true,
    impressions,
    clicks,
    ctr,
    averagePosition: position,
    qualifiedLeads: conversions,
    opportunityScore: Math.round(opportunity * 100),
    visibilityScore: visibility === null ? null : Math.round(visibility * 100),
    conversionRate: clicks > 0 && conversions !== null ? conversions / clicks : null,
    interpretation: conversions === null
      ? "conversion_data_missing"
      : conversions === 0
        ? "no_qualified_leads_recorded"
        : "qualified_leads_recorded",
    disclaimer: "امتیاز فرصت، شاخص اولویت‌بندی داخلی است؛ رتبه گوگل یا احتمال موفقیت را پیش‌بینی نمی‌کند.",
  };
}

export function rankContentOpportunities(rows) {
  return rows
    .map((row) => ({ ...row, analysis: analyzeSearchPerformance(row) }))
    .filter((row) => row.analysis.ok)
    .sort((a, b) => b.analysis.opportunityScore - a.analysis.opportunityScore);
}


/**
 * Collapses daily Search Console rows into one opportunity per query/page pair.
 * Average position is weighted by impressions; missing values remain unknown.
 */
export function aggregateSearchPerformanceRows(rows) {
  if (!Array.isArray(rows)) return [];

  const groups = new Map();
  for (const row of rows) {
    const page = typeof row?.page === "string" && row.page.trim() ? row.page : null;
    const query = typeof row?.query === "string" && row.query.trim() ? row.query : null;
    const clicks = finiteNonNegative(row?.clicks);
    const impressions = finiteNonNegative(row?.impressions);
    if ((!page && !query) || clicks === null || impressions === null || clicks > impressions) continue;

    const key = JSON.stringify([page, query]);
    const group = groups.get(key) || {
      page,
      query,
      clicks: 0,
      impressions: 0,
      weightedPositionTotal: 0,
      positionImpressions: 0,
    };

    group.clicks += clicks;
    group.impressions += impressions;
    const position = finiteNonNegative(row?.averagePosition);
    if (position !== null && position > 0 && impressions > 0) {
      group.weightedPositionTotal += position * impressions;
      group.positionImpressions += impressions;
    }
    groups.set(key, group);
  }

  return [...groups.values()].map((group) => ({
    page: group.page,
    query: group.query,
    clicks: group.clicks,
    impressions: group.impressions,
    averagePosition: group.positionImpressions > 0
      ? group.weightedPositionTotal / group.positionImpressions
      : null,
  }));
}
