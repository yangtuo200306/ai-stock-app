import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { apiGet } from '../api/client';
import type { AnalysisTask, WatchlistStackParamList } from '../types';

type RouteType = RouteProp<WatchlistStackParamList, 'TaskStatus'>;
type NavProp = NativeStackNavigationProp<WatchlistStackParamList, 'TaskStatus'>;

export default function TaskStatusScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { taskId, stockCode } = route.params;
  const [task, setTask] = useState<AnalysisTask | null>(null);
  const [error, setError] = useState('');

  const fetchTask = async () => {
    try {
      const data = await apiGet(`/api/analysis/${taskId}`);
      if (data.task_id) {
        setTask(data as AnalysisTask);
        setError('');
      } else {
        setError('任务不存在');
      }
    } catch {
      setError('查询任务状态失败');
    }
  };

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '排队中';
      case 'running':
        return '分析中';
      case 'completed':
        return '已完成';
      case 'failed':
        return '失败';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return '#f59e0b';
      case 'running':
        return '#3b82f6';
      case 'completed':
        return '#22c55e';
      case 'failed':
        return '#ef4444';
      default:
        return '#64748b';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>分析任务</Text>
        <Text style={styles.stockLabel}>股票代码：{stockCode}</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {task ? (
          <View style={styles.statusSection}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(task.status)}</Text>
            </View>
            <Text style={styles.progressText}>进度：{task.progress}%</Text>
            <Text style={styles.messageText}>{task.message}</Text>

            {task.status === 'completed' && task.report_id ? (
              <Pressable
                style={styles.primaryButton}
                onPress={() =>
                  navigation.navigate('ReportDetail', { reportId: task.report_id! })
                }
              >
                <Text style={styles.primaryButtonText}>查看报告</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          <Text style={styles.loadingText}>加载中...</Text>
        )}

        <Pressable style={styles.secondaryButton} onPress={fetchTask}>
          <Text style={styles.secondaryButtonText}>刷新状态</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
  },
  stockLabel: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 16,
    textAlign: 'center',
  },
  statusSection: {
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  progressText: {
    fontSize: 16,
    color: '#1e293b',
  },
  messageText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginVertical: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginVertical: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  secondaryButtonText: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '700',
  },
});
