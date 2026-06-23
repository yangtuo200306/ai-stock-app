import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ReportHistoryItem, ReportStackParamList } from '../types';

const BACKEND_URL_STORAGE_KEY = 'backendUrl';

type NavigationType = NativeStackNavigationProp<ReportStackParamList, 'ReportHistory'>;

export default function ReportHistoryScreen() {
  const navigation = useNavigation<NavigationType>();
  const [items, setItems] = useState<ReportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');

    const backendUrl = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);
    if (!backendUrl) {
      setError('请先到"我的"页面配置后端地址');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${backendUrl}/api/reports`);
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setError('加载历史报告失败，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>正在加载历史报告...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchReports}>
          <Text style={styles.retryButtonText}>重新加载</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>暂无历史报告</Text>
        <Text style={styles.emptyDescription}>
          完成一次股票分析后，这里会显示历史报告。
        </Text>
        <Pressable style={styles.retryButton} onPress={fetchReports}>
          <Text style={styles.retryButtonText}>刷新</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={items}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <Pressable
          style={styles.card}
          onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
        >
          <Text style={styles.stockName}>
            {item.stock_name || item.stock_code}
          </Text>
          {item.stock_name && (
            <Text style={styles.stockCode}>{item.stock_code}</Text>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>评分</Text>
            <Text style={styles.metaValue}>{item.score ?? '--'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>建议</Text>
            <Text style={styles.metaValue}>{item.action || '--'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>趋势</Text>
            <Text style={styles.metaValue}>{item.trend || '--'}</Text>
          </View>
          <Text style={styles.dateText}>{item.created_at || '--'}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  list: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
  },
  stockName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  stockCode: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  metaLabel: {
    fontSize: 15,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'right',
    marginTop: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#475569',
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
