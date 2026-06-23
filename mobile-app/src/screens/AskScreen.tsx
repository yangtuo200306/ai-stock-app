import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { AskResponse } from '../types';

const BACKEND_URL_STORAGE_KEY = 'backendUrl';

export default function AskScreen() {
  const [backendUrl, setBackendUrl] = useState('');
  const [stockCode, setStockCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);

  useEffect(() => {
    const loadBackendUrl = async () => {
      const storedBackendUrl = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);
      if (storedBackendUrl) {
        setBackendUrl(storedBackendUrl);
      }
    };

    loadBackendUrl();
  }, []);

  const handleAsk = async () => {
    if (!backendUrl) {
      setError('请先到“我的”页面设置后端地址');
      return;
    }

    if (!stockCode.trim()) {
      setError('请先输入股票代码');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch(`${backendUrl}/api/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock_code: stockCode.trim() }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || '问股失败，请稍后重试');
        return;
      }

      setResult(data);
    } catch {
      setError('问股失败，请检查后端地址或服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  const changeColor = result
    ? result.change_pct > 0
      ? '#dc2626'
      : result.change_pct < 0
        ? '#16a34a'
        : '#475569'
    : '#475569';

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>问股</Text>
        <Text style={styles.description}>输入 A 股代码，查看基础分析</Text>

        <TextInput
          style={styles.input}
          value={stockCode}
          onChangeText={setStockCode}
          placeholder="例如：600519"
          placeholderTextColor="#94a3b8"
          autoCapitalize="characters"
        />

        <Pressable
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleAsk}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>{loading ? '分析中...' : '开始问股'}</Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {result ? (
          <View style={styles.resultCard}>
            <Text style={styles.stockName}>
              {result.stock_name}（{result.stock_code}）
            </Text>
            <View style={styles.row}>
              <Text style={styles.label}>当前价</Text>
              <Text style={styles.value}>{result.price}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>涨跌幅</Text>
              <Text style={[styles.value, { color: changeColor }]}>{result.change_pct}%</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>趋势</Text>
              <Text style={styles.value}>{result.trend}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>建议</Text>
              <Text style={styles.value}>{result.action}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>评分</Text>
              <Text style={styles.value}>{result.score}</Text>
            </View>

            <Text style={styles.sectionTitle}>基础回答</Text>
            <Text style={styles.answer}>{result.answer}</Text>

            <Text style={styles.sectionTitle}>技术指标</Text>
            <Text style={styles.indicatorText}>
              MA5：{result.indicators.ma5 ?? '-'} ｜ MA10：{result.indicators.ma10 ?? '-'} ｜ MA20：
              {result.indicators.ma20 ?? '-'}
            </Text>

            <Text style={styles.sectionTitle}>风险提示</Text>
            {result.risks.map((risk) => (
              <Text key={risk} style={styles.riskText}>
                • {risk}
              </Text>
            ))}
          </View>
        ) : null}
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
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabledButton: {
    backgroundColor: '#94a3b8',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 12,
  },
  resultCard: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  stockName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#64748b',
  },
  value: {
    fontSize: 14,
    color: '#0f172a',
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  answer: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  indicatorText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  riskText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
});
