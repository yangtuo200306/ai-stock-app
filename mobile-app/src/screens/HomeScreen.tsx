import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

interface Stock {
  code: string;
  name: string;
}

const BACKEND_URL_STORAGE_KEY = 'backendUrl';

export default function HomeScreen() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadStocks = useCallback(async () => {
    const savedBackendUrl = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);

    if (!savedBackendUrl) {
      setLoadError('请先在设置页配置后端地址');
      setStocks([]);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const response = await fetch(`${savedBackendUrl}/api/stocks`);
      const data = await response.json();

      if (data.items) {
        setStocks(data.items);
      } else {
        setStocks([]);
      }
    } catch {
      setLoadError('加载自选股失败，请检查后端服务');
      setStocks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStocks();
  }, [loadStocks]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>自选股列表</Text>

        <Pressable style={styles.secondaryButton} onPress={loadStocks}>
          <Text style={styles.secondaryButtonText}>刷新列表</Text>
        </Pressable>

        {isLoading ? <Text style={styles.loadingText}>加载中...</Text> : null}

        {loadError ? <Text style={styles.errorText}>{loadError}</Text> : null}

        {!isLoading && !loadError && (
          <FlatList
            data={stocks}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <View style={styles.stockItem}>
                <Text style={styles.stockCode}>{item.code}</Text>
                <Text style={styles.stockName}>{item.name}</Text>
              </View>
            )}
            ListEmptyComponent={<Text style={styles.emptyText}>暂无自选股</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
    textAlign: 'center',
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
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    marginBottom: 8,
  },
  stockCode: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  stockName: {
    fontSize: 16,
    color: '#475569',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginVertical: 16,
  },
});
