import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useRecordsStore } from '../stores/recordsStore';
import type { AnalysisTask, WatchlistStackParamList, RootTabParamList } from '../types';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getTaskStatusColor, getTaskStatusLabel } from '../utils/taskStatusDisplay';

const POLL_INTERVAL_MS = 3000;

type RouteType = RouteProp<WatchlistStackParamList, 'TaskStatus'>;
type NavProp = NativeStackNavigationProp<WatchlistStackParamList, 'TaskStatus'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function TaskStatusScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { handleError } = useApiErrorHandler();
  const { taskId, stockCode } = route.params;
  const [task, setTask] = useState<AnalysisTask | null>(null);
  const [error, setError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const taskRef = useRef(task);
  taskRef.current = task;

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const fetchTask = useCallback(async () => {
    if (authLoading || !isLoggedIn) return;

    try {
      const data = await apiGet(`/api/analysis/${taskId}`);
      if (data.task_id) {
        const currentTask = data as AnalysisTask;
        setTask(currentTask);
        setError('');

        // 通知 store 刷新
        useWatchlistStore.getState().loadStocks();
        useWatchlistStore.getState().loadTaskStatuses();

        if (currentTask.status === 'completed' || currentTask.status === 'failed') {
          stopPolling();
        }

        if (currentTask.status === 'completed' && currentTask.report_id) {
          useRecordsStore.getState().fetchRecords();
        }
      } else {
        setError('任务不存在');
        stopPolling();
      }
    } catch (err: unknown) {
      const { message } = handleError(err, '查询任务状态失败');
      setError(message);
      stopPolling();
    }
  }, [authLoading, isLoggedIn, taskId, handleError, stopPolling]);

  useEffect(() => {
    fetchTask();
  }, [fetchTask]);

  useEffect(() => {
    if (authLoading || !isLoggedIn) {
      stopPolling();
      return;
    }

    if (task && (task.status === 'completed' || task.status === 'failed')) {
      stopPolling();
      return;
    }

    intervalRef.current = setInterval(() => {
      const current = taskRef.current;
      if (current && (current.status === 'completed' || current.status === 'failed')) {
        stopPolling();
        return;
      }
      fetchTask();
    }, POLL_INTERVAL_MS);

    return () => {
      stopPolling();
    };
  }, [authLoading, isLoggedIn, task?.status, fetchTask, stopPolling]);

  if (authLoading) {
    return <StateView type="loading" />;
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <LoginRequiredView
          description="登录后可以使用自选、问股和记录功能。"
          onLoginPress={() => tabNavigation.navigate('我的', { screen: 'Login' })}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <Text style={styles.title}>分析任务</Text>
        <Text style={styles.stockLabel}>股票代码：{stockCode}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {task ? (
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: getTaskStatusColor(task.status) }]}>
              <Text style={styles.statusText}>{getTaskStatusLabel(task.status)}</Text>
            </View>
            <Text style={styles.progressText}>进度：{task.progress}%</Text>
            <Text style={styles.messageText}>{task.message}</Text>

            {task.status === 'completed' && task.report_id ? (
              <AppButton
                title="查看报告"
                onPress={() => navigation.navigate('ReportDetail', { reportId: task.report_id! })}
                style={styles.reportButton}
              />
            ) : null}
          </View>
        ) : (
          <StateView type="loading" title="加载中..." style={styles.inlineState} />
        )}

        <AppButton title="刷新状态" variant="secondary" onPress={fetchTask} />
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    padding: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    maxWidth: 420,
    marginTop: spacing.xxl,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  stockLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  statusSection: {
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 12,
  },
  statusText: {
    ...typography.bodyStrong,
    color: colors.textInverse,
  },
  progressText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  messageText: {
    ...typography.helper,
    color: colors.textMuted,
    textAlign: 'center',
  },
  inlineState: {
    flex: 0,
    paddingVertical: spacing.xl,
  },
  errorText: {
    ...typography.body,
    color: colors.danger,
    textAlign: 'center',
    marginVertical: spacing.lg,
  },
  reportButton: {
    marginTop: spacing.sm,
    minWidth: 140,
  },
});
