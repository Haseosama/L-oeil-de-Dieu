/** Explain mapped-site availability without claiming an unobserved overload. */
export function installationFeedback(stats = {}, now = Date.now()) {
  const reasons = {
    rate_limited: 'Overpass limité en débit',
    timeout: 'Overpass a expiré',
    query_failed: 'Overpass n\'a pas pu terminer la requête',
  };
  const reason = reasons[stats.failureReason] || 'Overpass temporairement indisponible';
  if (stats.loading) return stats.retrying ? 'Nouvelle tentative des sites cartographiés…' : 'Récupération des sites cartographiés…';
  if (stats.retryAt > 0) {
    const seconds = Math.max(0, Math.ceil((stats.retryAt - now) / 1000));
    return `${reason} — ${seconds ? `nouvelle tentative dans ${seconds}s` : 'nouvelle tentative en attente'}`;
  }
  if (stats.status === 'unavailable') return reason;
  if (stats.status === 'zoom-in') return 'Zoomez pour rechercher les installations cartographiées';
  if (stats.stale) return 'Affichage des sites cartographiés en cache';
  if (stats.status === 'idle') return 'Sites cartographiés non chargés';
  return 'Sites cartographiés chargés';
}
