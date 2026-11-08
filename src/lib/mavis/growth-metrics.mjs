const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function finiteNonNegative(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function analyzeSearchPerformance(row) {
  const impressions = finiteNonNegative(row?.impressions);
  const clicks = finiteNonNegative(row?.clicks);
  const rawPosition = finiteNonNegative(row?.averagePosition);\n  const position = rawPosition !== null && rawPosition > 0 ? rawPosition : null;
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
