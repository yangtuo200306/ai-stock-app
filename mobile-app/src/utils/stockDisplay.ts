import { colors } from '../theme/colors';

export function normalizeAShareCode(code: string) {
  let normalized = code.trim().toUpperCase();

  if (normalized.startsWith('SH') || normalized.startsWith('SZ')) {
    normalized = normalized.slice(2);
  } else if (
    normalized.endsWith('.SH') ||
    normalized.endsWith('.SS') ||
    normalized.endsWith('.SZ')
  ) {
    normalized = normalized.slice(0, 6);
  }

  if (!/^\d{6}$/.test(normalized)) {
    return null;
  }

  return normalized;
}

export function getChangeColor(changePct?: number | null) {
  if (changePct === null || changePct === undefined) {
    return colors.changeFlat;
  }

  if (changePct > 0) {
    return colors.changeUp;
  }

  if (changePct < 0) {
    return colors.changeDown;
  }

  return colors.changeFlat;
}

export function formatChangePct(changePct?: number | null) {
  if (changePct === null || changePct === undefined) {
    return '--';
  }

  const prefix = changePct > 0 ? '+' : '';
  return `${prefix}${changePct.toFixed(2)}%`;
}

export function getScoreColor(score?: number | null): string {
  if (score == null) return colors.textMuted;
  if (score >= 70) return colors.changeUp;
  if (score >= 40) return '#faad14';
  return colors.changeDown;
}

export function getTrendLabel(trend?: string | null): string {
  return trend || '--';
}

export function getActionLabel(action?: string | null): string {
  return action || '--';
}
