import { colors } from '../theme/colors';

export function getRecordTypeLabel(recordType?: string | null) {
  switch (recordType) {
    case 'ask':
      return '问股';
    case 'report':
      return '报告';
    case 'analysis':
      return '分析';
    default:
      return '记录';
  }
}

export function getRecordTypeColor(recordType?: string | null) {
  switch (recordType) {
    case 'ask':
      return colors.recordAsk;
    case 'report':
      return colors.recordReport;
    case 'analysis':
      return colors.recordAnalysis;
    default:
      return colors.textMuted;
  }
}
