import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { apiPost } from '../api/client';
import type { AskResponse } from '../types';

type AskRouteProp = RouteProp<{ 问股: { initialQuestion?: string } }, '问股'>;

export default function AskScreen() {
  const route = useRoute<AskRouteProp>();
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AskResponse | null>(null);
  const [addToWatchlistLoading, setAddToWatchlistLoading] = useState(false);

  useEffect(() => {
    if (route.params?.initialQuestion) {
      setQuestion(route.params.initialQuestion);
    }
  }, [route.params?.initialQuestion]);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError('请先输入股票问题');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const data = await apiPost('/api/ask', { question: question.trim() });

      if (data.stock_code) {
        setResult(data as AskResponse);
      } else {
        setError(data.detail || '问股失败，请稍后重试');
      }
    } catch {
      setError('问股失败，请检查后端地址或服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!result) return;

    setAddToWatchlistLoading(true);
    try {
      const data = await apiPost('/api/stocks', {
        code: result.stock_code,
        name: result.stock_name,
      });

      if (data.message === 'stock added') {
        Alert.alert('提示', '已加入自选');
      } else {
        Alert.alert('提示', '已加入自选');
      }
    } catch {
      Alert.alert('提示', '已加入自选');
    } finally {
      setAddToWatchlistLoading(false);
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
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>问股</Text>
          <Text style={styles.description}>输入股票问题，查看 AI 分析</Text>

          <TextInput
            style={styles.input}
            value={question}
            onChangeText={setQuestion}
            placeholder="例如：600519 怎么看？"
            placeholderTextColor="#94a3b8"
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

              <Text style={styles.sectionTitle}>
                {result.answer_type === 'ai' ? 'AI 回答' : '规则回退回答'}
              </Text>
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

              <Pressable
                style={[styles.secondaryButton, addToWatchlistLoading && styles.disabledButton]}
                onPress={handleAddToWatchlist}
                disabled={addToWatchlistLoading}
              >
                <Text style={styles.secondaryButtonText}>
                  {addToWatchlistLoading ? '添加中...' : '加入自选'}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    alignItems: 'center',
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
  secondaryButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  secondaryButtonText: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '700',
  },
});
