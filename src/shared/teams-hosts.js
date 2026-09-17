const supportedHosts = new Set(['teams.microsoft.com', 'teams.cloud.microsoft', 'teams.live.com']);

/**
 * Vérifie qu’une URL appartient à une application Teams explicitement prise en charge.
 * @param {string|null|undefined} rawUrl URL de l’onglet actif.
 * @returns {boolean} Vrai uniquement pour les hôtes Teams autorisés, en HTTPS.
 */
export function isSupportedTeamsUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    return url.protocol === 'https:' && supportedHosts.has(url.hostname);
  } catch {
    return false;
  }
}
