import { colors } from '../theme/colors';

export function getTaskStatusLabel(status?: string | null) {
  switch (status) {
    case 'pending':
      return '等待中';
    case 'running':
      return '分析中';
    case 'completed':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return '未知';
  }
}

export function getTaskStatusColor(status?: string | null) {
  switch (status) {
    case 'pending':
      return colors.statusPending;
    case 'running':
      return colors.statusRunning;
    case 'completed':
      return colors.statusCompleted;
    case 'failed':
      return colors.statusFailed;
    default:
      return colors.textMuted;
  }
}
