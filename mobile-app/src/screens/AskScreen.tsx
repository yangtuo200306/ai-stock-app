import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { apiPost } from '../api/client';
import type { AskMessage, AskResponse, RootTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

type AskRouteProp = RouteProp<RootTabParamList, '问股'>;

export default function AskScreen() {
  const route = useRoute<AskRouteProp>();
  const navigation = useNavigation<any>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [latestResult, setLatestResult] = useState<AskResponse | null>(null);
  const [addToWatchlistLoading, setAddToWatchlistLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const initialParamsHandled = useRef(false);

  useEffect(() => {
    if (initialParamsHandled.current) return;
    const params = route.params;
    if (!params) return;

    if (params.initialQuestion) {
      setQuestion(params.initialQuestion);
    }
    if (params.sessionId) {
      setSessionId(params.sessionId);
    }
    if (params.initialMessages && params.initialMessages.length > 0) {
      setMessages(params.initialMessages);
    }
    initialParamsHandled.current = true;
  }, [route.params]);

  const handleNewSession = useCallback(() => {
    setSessionId(null);
    setMessages([]);
    setLatestResult(null);
    setQuestion('');
    setError('');
    initialParamsHandled.current = false;
  }, []);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError('请先输入股票问题');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body: Record<string, unknown> = { question: question.trim() };
      if (sessionId) {
        body.session_id = sessionId;
      }

      const data = await apiPost('/api/ask', body);

      if (data.stock_code) {
        const result = data as AskResponse;

        // Build messages from result
        const newMessages: AskMessage[] = [
          ...messages,
          { id: Date.now(), role: 'user', content: question.trim(), created_at: new Date().toISOString() },
          {
            id: result.message_id ?? Date.now() + 1,
            role: 'assistant',
            content: result.answer,
            answer_type: result.answer_type,
            ai_status: result.ai_status,
            model: result.model,
            created_at: new Date().toISOString(),
          },
        ];

        setMessages(newMessages);
        setLatestResult(result);
        setSessionId(result.session_id ?? null);
        setQuestion('');
      } else {
        setError(data.message || data.detail || '问股失败，请稍后重试');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '问股失败，请检查后端地址或服务是否启动');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!latestResult) return;

    setAddToWatchlistLoading(true);
    try {
      const data = await apiPost('/api/stocks', {
        code: latestResult.stock_code,
        name: latestResult.stock_name,
      });

      if (data.message === 'stock added' || data.message === 'stock already exists') {
        Alert.alert('提示', '已加入自选');
      } else {
        Alert.alert('提示', '加入自选失败，请稍后重试');
      }
    } catch {
      Alert.alert('提示', '加入自选失败，请检查后端服务');
    } finally {
      setAddToWatchlistLoading(false);
    }
  };

  const changeColor = latestResult
    ? latestResult.change_pct > 0
      ? '#dc2626'
      : latestResult.change_pct < 0
        ? '#16a34a'
        : '#475569'
    : '#475569';

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
        <Pressable style={styles.loginButton} onPress={() => navigation.navigate('我的', { screen: 'Login' })}>
          <Text style={styles.loginButtonText}>去登录</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer} ref={scrollRef}>
      <View style={styles.container}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>问股</Text>
            {(sessionId || messages.length > 0) && (
              <Pressable style={styles.newSessionButton} onPress={handleNewSession}>
                <Text style={styles.newSessionButtonText}>新建会话</Text>
              </Pressable>
            )}
          </View>
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
            <Text style={styles.primaryButtonText}>{loading ? '分析中...' : '发送'}</Text>
          </Pressable>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {messages.length > 0 ? (
            <View style={styles.messagesContainer}>
              {messages.map((msg, index) => (
                <View
                  key={`${msg.id}-${index}`}
                  style={[
                    styles.messageBubble,
                    msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
                  ]}
                >
                  <Text style={styles.messageRole}>
                    {msg.role === 'user' ? '我' : msg.answer_type === 'ai' ? 'AI 回答' : '规则回退回答'}
                  </Text>
                  <Text style={styles.messageContent}>{msg.content}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {latestResult ? (
            <View style={styles.resultCard}>
              <Text style={styles.stockName}>
                {latestResult.stock_name}（{latestResult.stock_code}）
              </Text>
              <View style={styles.row}>
                <Text style={styles.label}>当前价</Text>
                <Text style={styles.value}>{latestResult.price}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>涨跌幅</Text>
                <Text style={[styles.value, { color: changeColor }]}>{latestResult.change_pct}%</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>趋势</Text>
                <Text style={styles.value}>{latestResult.trend}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>建议</Text>
                <Text style={styles.value}>{latestResult.action}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>评分</Text>
                <Text style={styles.value}>{latestResult.score}</Text>
              </View>

              <Text style={styles.sectionTitle}>技术指标</Text>
              <Text style={styles.indicatorText}>
                MA5：{latestResult.indicators.ma5 ?? '-'} ｜ MA10：{latestResult.indicators.ma10 ?? '-'} ｜ MA20：
                {latestResult.indicators.ma20 ?? '-'}
              </Text>
              <Text style={styles.indicatorText}>
                RSI(6)：{latestResult.indicators.rsi6 ?? '-'} ｜ RSI(12)：{latestResult.indicators.rsi12 ?? '-'}
              </Text>
              <Text style={styles.indicatorText}>
                成交量：{latestResult.indicators.volume_signal ?? '-'}
                {latestResult.indicators.volume_ratio != null ? `（比值 ${latestResult.indicators.volume_ratio}）` : ''}
              </Text>

              <Text style={styles.sectionTitle}>风险提示</Text>
              {latestResult.risks.map((risk) => (
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  description: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  newSessionButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newSessionButtonText: {
    color: '#0369a1',
    fontSize: 14,
    fontWeight: '600',
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
  messagesContainer: {
    marginBottom: 16,
  },
  messageBubble: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userBubble: {
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#475569',
  },
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
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
