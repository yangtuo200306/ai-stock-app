import { useCallback, useEffect, useState } from 'react';
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
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { RecordItem, RecordStackParamList, RootTabParamList } from '../types';

type NavigationType = NativeStackNavigationProp<RecordStackParamList, 'RecordList'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function RecordListScreen() {
  const navigation = useNavigation<NavigationType>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const data = await apiGet('/api/records');
      setItems(data.items ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加载记录失败，请检查后端服务是否启动');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const getTypeLabel = (recordType: string) => {
    switch (recordType) {
      case 'ask':
        return '问股';
      case 'analysis':
        return '分析';
      case 'report':
        return '报告';
      default:
        return recordType;
    }
  };

  const getTypeColor = (recordType: string) => {
    switch (recordType) {
      case 'ask':
        return '#2563eb';
      case 'analysis':
        return '#64748b';
      case 'report':
        return '#7c3aed';
      default:
        return '#64748b';
    }
  };

  if (authLoading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loginTitle}>请先登录</Text>
        <Text style={styles.loginDescription}>登录后可以使用自选、问股和记录功能。</Text>
        <Pressable style={styles.loginButton} onPress={() => tabNavigation.navigate('我的', { screen: 'Login' })}>
          <Text style={styles.loginButtonText}>去登录</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>正在加载记录...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryButton} onPress={fetchRecords}>
          <Text style={styles.retryButtonText}>重新加载</Text>
        </Pressable>
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>暂无记录</Text>
        <Text style={styles.emptyDescription}>
          问股或自选分析后，这里会显示你的分析记录。
        </Text>
        <Pressable style={styles.retryButton} onPress={fetchRecords}>
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
      renderItem={({ item }) => {
        const changeColor =
          item.metadata.change_pct != null
            ? item.metadata.change_pct > 0
              ? styles.changeUp
              : item.metadata.change_pct < 0
                ? styles.changeDown
                : styles.changeFlat
            : styles.changeFlat;

        return (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate('RecordDetail', { recordId: item.id })}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.record_type) }]}>
                <Text style={styles.typeBadgeText}>{getTypeLabel(item.record_type)}</Text>
              </View>
              <Text style={styles.dateText}>{item.updated_at || item.created_at}</Text>
            </View>
            <Text style={styles.stockName}>
              {item.stock_name}（{item.stock_code}）
            </Text>
            <Text style={styles.titleText}>{item.title}</Text>
            <Text style={styles.summaryText} numberOfLines={2}>
              {item.summary}
            </Text>
            <View style={styles.metaRow}>
              {item.metadata.score != null && (
                <Text style={styles.metaLabel}>
                  评分：{item.metadata.score}
                </Text>
              )}
              {item.metadata.change_pct != null && (
                <Text style={[styles.metaValue, changeColor]}>
                  {item.metadata.change_pct > 0 ? '+' : ''}
                  {item.metadata.change_pct}%
                </Text>
              )}
            </View>
          </Pressable>
        );
      }}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  stockName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  titleText: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  changeUp: {
    color: '#dc2626',
  },
  changeDown: {
    color: '#16a34a',
  },
  changeFlat: {
    color: '#64748b',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
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
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 8,
  },
  loginDescription: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
