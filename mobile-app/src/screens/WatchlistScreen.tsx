import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation as useTabNavigation } from '@react-navigation/native';
import { apiGet, apiPost, apiDelete } from '../api/client';
import type { Stock, WatchlistStackParamList } from '../types';

const TASK_IDS_KEY = 'stockTaskIds';

type NavProp = NativeStackNavigationProp<WatchlistStackParamList, 'Watchlist'>;

function normalizeAShareCode(code: string) {
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

export default function WatchlistScreen() {
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useTabNavigation<any>();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({});

  const loadStocks = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');

    try {
      const data = await apiGet('/api/stocks');
      setStocks(data.items ?? []);
    } catch {
      setLoadError('加载自选股失败，请检查后端服务');
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTaskStatuses = useCallback(async () => {
    const saved = await AsyncStorage.getItem(TASK_IDS_KEY);
    if (!saved) return;
    const taskIds: Record<string, string> = JSON.parse(saved);

    const newStatuses: Record<string, string> = {};
    for (const [stockCode, taskId] of Object.entries(taskIds)) {
      try {
        const data = await apiGet(`/api/analysis/${taskId}`);
        if (data.status) {
          newStatuses[stockCode] = data.status;
        }
      } catch {
        // ignore
      }
    }
    setTaskStatuses(newStatuses);
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  useEffect(() => {
    loadTaskStatuses();
  }, [loadTaskStatuses]);

  const handleAddStock = useCallback(async () => {
    const normalizedCode = normalizeAShareCode(newCode);
    const stockName = newName.trim();

    if (!stockName) {
      Alert.alert('提示', '请输入股票名称');
      return;
    }

    if (!normalizedCode) {
      Alert.alert('提示', '目前仅支持 6 位 A 股代码');
      return;
    }

    try {
      const data = await apiPost('/api/stocks', { code: normalizedCode, name: stockName });
      if (data.message === 'stock added') {
        setNewCode('');
        setNewName('');
        await loadStocks();
      } else {
        Alert.alert('错误', '添加自选股失败');
      }
    } catch {
      Alert.alert('错误', '添加自选股失败，请检查后端服务');
    }
  }, [newCode, newName, loadStocks]);

  const handleDeleteStock = useCallback(
    async (code: string) => {
      try {
        const { ok } = await apiDelete(`/api/stocks/${code}`);
        if (ok) {
          const saved = await AsyncStorage.getItem(TASK_IDS_KEY);
          if (saved) {
            const taskIds: Record<string, string> = JSON.parse(saved);
            delete taskIds[code];
            await AsyncStorage.setItem(TASK_IDS_KEY, JSON.stringify(taskIds));
          }
          setTaskStatuses((prev) => {
            const next = { ...prev };
            delete next[code];
            return next;
          });
          await loadStocks();
        }
      } catch {
        Alert.alert('错误', '删除自选股失败');
      }
    },
    [loadStocks],
  );

  const handleCreateAnalysis = useCallback(
    async (stock: Stock) => {
      try {
        const data = await apiPost('/api/analysis', { stock_code: stock.code });
        if (data.task_id) {
          const saved = await AsyncStorage.getItem(TASK_IDS_KEY);
          const taskIds: Record<string, string> = saved ? JSON.parse(saved) : {};
          taskIds[stock.code] = data.task_id;
          await AsyncStorage.setItem(TASK_IDS_KEY, JSON.stringify(taskIds));

          setTaskStatuses((prev) => ({ ...prev, [stock.code]: data.status }));

          navigation.navigate('TaskStatus', {
            taskId: data.task_id,
            stockCode: stock.code,
          });
        } else {
          Alert.alert('错误', '创建分析任务失败');
        }
      } catch {
        Alert.alert('错误', '创建分析任务失败，请检查后端服务');
      }
    },
    [navigation],
  );

  const handleAskAI = useCallback(
    (stock: Stock) => {
      tabNavigation.navigate('问股', { initialQuestion: `${stock.code} 怎么看？` });
    },
    [tabNavigation],
  );

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

  const renderStockItem = ({ item }: { item: Stock }) => {
    const status = taskStatuses[item.code];
    return (
      <Pressable
        style={styles.stockItem}
        onPress={() => handleCreateAnalysis(item)}
        onLongPress={() => handleDeleteStock(item.code)}
      >
        <View style={styles.stockInfo}>
          <Text style={styles.stockCode}>{item.code}</Text>
          <Text style={styles.stockName}>{item.name}</Text>
        </View>
        <View style={styles.stockActions}>
          {status ? (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) }]}>
              <Text style={styles.statusText}>{getStatusLabel(status)}</Text>
            </View>
          ) : null}
          <Pressable
            style={styles.askButton}
            onPress={() => handleAskAI(item)}
          >
            <Text style={styles.askButtonText}>问 AI</Text>
          </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => handleDeleteStock(item.code)}
          >
            <Text style={styles.deleteButtonText}>删除</Text>
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>自选股列表</Text>

        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            value={newCode}
            onChangeText={setNewCode}
            placeholder="股票代码"
            placeholderTextColor="#94a3b8"
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="股票名称"
            placeholderTextColor="#94a3b8"
          />
          <Pressable style={styles.addButton} onPress={handleAddStock}>
            <Text style={styles.addButtonText}>添加自选</Text>
          </Pressable>
        </View>

        <Pressable style={styles.secondaryButton} onPress={loadStocks}>
          <Text style={styles.secondaryButtonText}>刷新列表</Text>
        </Pressable>

        {isLoading ? <Text style={styles.loadingText}>加载中...</Text> : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {!isLoading && !loadError && (
          <FlatList
            data={stocks}
            keyExtractor={(item) => item.code}
            renderItem={renderStockItem}
            ListEmptyComponent={<Text style={styles.emptyText}>暂无自选股</Text>}
          />
        )}

        <Text style={styles.hint}>点击股票创建分析任务，长按或点击删除可直接删除</Text>
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
  addForm: {
    marginBottom: 16,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  addButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '700',
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
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  stockInfo: {
    flex: 1,
  },
  stockCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  stockName: {
    fontSize: 14,
    color: '#475569',
    marginTop: 2,
  },
  stockActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  askButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#dbeafe',
  },
  askButtonText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  deleteButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 16,
  },
  hint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
  },
});
