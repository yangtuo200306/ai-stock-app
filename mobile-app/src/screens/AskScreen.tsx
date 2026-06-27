import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useAskStore } from '../stores/askStore';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { MessageBubble } from '../components/MessageBubble';
import { MetricRow } from '../components/MetricRow';
import { ScoreGauge } from '../components/ScoreGauge';
import { StateView } from '../components/StateView';
import { StockAutocomplete } from '../components/StockAutocomplete';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatChangePct, getChangeColor } from '../utils/stockDisplay';

type AskRouteProp = RouteProp<RootTabParamList, '问股'>;
type AskTabNavProp = BottomTabNavigationProp<RootTabParamList>;

const QUICK_QUESTIONS = [
  { label: '分析 600519', question: '600519 怎么看？' },
  { label: '茅台现在能买吗', question: '贵州茅台现在能买吗？' },
  { label: '宁德时代趋势', question: '宁德时代趋势如何？' },
  { label: '分析比亚迪', question: '比亚迪怎么样？' },
];

export default function AskScreen() {
  const route = useRoute<AskRouteProp>();
  const navigation = useNavigation<AskTabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const {
    sessionId, messages, question, isLoading, isStreaming, error, latestResult,
    setQuestion, handleAskStream, handleNewSession, handleAddToWatchlist, restoreSession,
  } = useAskStore();
  const [addToWatchlistLoading, setAddToWatchlistLoading] = useState(false);
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const initialParamsHandled = useRef(false);

  useEffect(() => {
    if (initialParamsHandled.current) return;
    const params = route.params;
    if (!params) return;

    if (params.initialQuestion) {
      setQuestion(params.initialQuestion);
    }
    if (params.sessionId && params.initialMessages && params.initialMessages.length > 0) {
      restoreSession(params.sessionId, params.initialMessages);
    }
    initialParamsHandled.current = true;
  }, [route.params, setQuestion, restoreSession]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    if (messages.length > 0 || latestResult) {
      scrollToEnd();
    }
  }, [messages.length, latestResult, scrollToEnd]);

  const onNewSession = useCallback(() => {
    handleNewSession();
    initialParamsHandled.current = false;
  }, [handleNewSession]);

  const onAsk = useCallback(() => {
    handleAskStream(selectedStock?.code).then(() => {
      setSelectedStock(null);
      scrollToEnd();
    });
  }, [handleAskStream, selectedStock, scrollToEnd]);

  const onQuickQuestion = useCallback((q: string) => {
    setQuestion(q);
    setSelectedStock(null);
    inputRef.current?.focus();
  }, [setQuestion]);

  const onRetry = useCallback(() => {
    handleAskStream(selectedStock?.code).then(() => {
      scrollToEnd();
    });
  }, [handleAskStream, selectedStock, scrollToEnd]);

  const onAddToWatchlist = useCallback(async () => {
    setAddToWatchlistLoading(true);
    const result = await handleAddToWatchlist();
    if (result) {
      Alert.alert('提示', '已加入自选');
    } else {
      Alert.alert('提示', '加入自选失败，请稍后重试');
    }
    setAddToWatchlistLoading(false);
  }, [handleAddToWatchlist]);

  if (authLoading) {
    return <StateView type="loading" />;
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <LoginRequiredView
          description="登录后可以使用自选、问股和记录功能。"
          onLoginPress={() => navigation.navigate('我的', { screen: 'Login' })}
        />
      </View>
    );
  }

  const hasContent = messages.length > 0 || latestResult;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 56}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTextGroup}>
            <Text style={styles.title}>问股</Text>
            <Text style={styles.description}>输入股票问题，查看 AI 分析</Text>
          </View>
          {(sessionId || messages.length > 0) && (
            <AppButton
              title="新建会话"
              variant="ghost"
              onPress={onNewSession}
              style={styles.newSessionButton}
            />
          )}
        </View>

        {/* Messages / Content Area */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
        >
        {!hasContent ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyTitle}>开始问股</Text>
            <Text style={styles.emptyDescription}>
              输入股票代码或名称，AI 将为您分析行情走势和技术指标。
            </Text>
            <View style={styles.quickQuestions}>
              {QUICK_QUESTIONS.map((q) => (
                <Pressable
                  key={q.label}
                  style={styles.quickQuestionButton}
                  onPress={() => onQuickQuestion(q.question)}
                >
                  <Text style={styles.quickQuestionText}>{q.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* Messages */}
            {messages.map((msg, index) => {
              const isLastAssistant =
                msg.role === 'assistant' && index === messages.length - 1;
              const showRetry = isLastAssistant && !!error && !isLoading;
              return (
                <MessageBubble
                  key={`${msg.id}-${index}`}
                  role={msg.role}
                  content={msg.content}
                  answerType={msg.answer_type}
                  isStreaming={isLastAssistant && isStreaming}
                  news={isLastAssistant ? latestResult?.news : undefined}
                  onRetry={showRetry ? onRetry : undefined}
                />
              );
            })}

            {/* Error Inline Alert */}
            {error && !isLoading ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorIcon}>!</Text>
                <View style={styles.errorContent}>
                  <Text style={styles.errorTitle}>问股失败</Text>
                  <Text style={styles.errorMessage}>{error}</Text>
                </View>
              </View>
            ) : null}

            {/* Loading Indicator */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>分析中...</Text>
              </View>
            ) : null}

            {/* Result Card */}
            {latestResult ? (
              <AppCard style={{ marginTop: spacing.sm }}>
                <Text style={styles.stockName}>
                  {latestResult.stock_name}（{latestResult.stock_code}）
                </Text>

                {/* 行情概览 */}
                <Text style={styles.sectionTitle}>行情概览</Text>
                <View style={styles.sectionCard}>
                  <ScoreGauge score={latestResult.score} />
                  <MetricRow label="趋势" value={latestResult.trend} compact />
                  <MetricRow label="建议" value={latestResult.action} compact />
                  <MetricRow
                    label="涨跌幅"
                    value={formatChangePct(latestResult.change_pct)}
                    valueColor={getChangeColor(latestResult.change_pct)}
                    compact
                  />
                  {latestResult.indicators?.turnover_rate != null && (
                    <MetricRow label="换手率" value={`${latestResult.indicators.turnover_rate}%`} compact />
                  )}
                  {latestResult.indicators?.amplitude != null && (
                    <MetricRow label="振幅" value={`${latestResult.indicators.amplitude}%`} compact />
                  )}
                  <MetricRow
                    label="成交量"
                    value={
                      latestResult.indicators?.volume_ratio != null
                        ? `${latestResult.indicators.volume_signal ?? '-'}（比值 ${latestResult.indicators.volume_ratio}）`
                        : latestResult.indicators?.volume_signal
                    }
                    compact
                    multiline
                  />
                </View>

                {/* 技术指标 */}
                <Text style={styles.sectionTitle}>技术指标</Text>
                <View style={styles.sectionCard}>
                  <MetricRow label="MA5（5日均线）" value={latestResult.indicators?.ma5} compact />
                  <MetricRow label="MA10（10日均线）" value={latestResult.indicators?.ma10} compact />
                  <MetricRow label="MA20（20日均线）" value={latestResult.indicators?.ma20} compact />
                  {latestResult.indicators?.ma_trend != null && (
                    <MetricRow label="均线趋势" value={latestResult.indicators.ma_trend} compact />
                  )}
                  <MetricRow label="RSI(6)（相对强弱指标）" value={latestResult.indicators?.rsi6} compact />
                  {latestResult.indicators?.bias_ma5 != null && (
                    <MetricRow label="乖离率 MA5" value={`${latestResult.indicators.bias_ma5}%`} compact />
                  )}
                  {latestResult.indicators?.bias_ma10 != null && (
                    <MetricRow label="乖离率 MA10" value={`${latestResult.indicators.bias_ma10}%`} compact />
                  )}
                  {latestResult.indicators?.bias_ma20 != null && (
                    <MetricRow label="乖离率 MA20" value={`${latestResult.indicators.bias_ma20}%`} compact />
                  )}
                </View>

                {/* 风险提示 */}
                {latestResult.risks.length > 0 ? (
                  <>
                    <Text style={styles.sectionTitle}>风险提示</Text>
                    <View style={styles.riskCard}>
                      {latestResult.risks.map((risk) => (
                        <Text key={risk} style={styles.riskText}>
                          ⚠️ {risk}
                        </Text>
                      ))}
                    </View>
                  </>
                ) : null}

                <AppButton
                  title={addToWatchlistLoading ? '添加中...' : '加入自选'}
                  variant="secondary"
                  onPress={onAddToWatchlist}
                  loading={addToWatchlistLoading}
                  disabled={addToWatchlistLoading}
                  style={styles.watchlistButton}
                />
              </AppCard>
            ) : null}
          </>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <View style={styles.inputWrapper}>
            <StockAutocomplete
              query={question}
              selected={selectedStock}
              onSelect={(code, name) => {
                setSelectedStock({ code, name });
                setQuestion(`${code} `);
              }}
              onRemove={() => setSelectedStock(null)}
            />
            <TextInput
              ref={inputRef}
              style={styles.input}
              value={question}
              onChangeText={setQuestion}
              placeholder="例如：600519 怎么看？"
              placeholderTextColor={colors.textSubtle}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
          </View>
          <Pressable
            style={[styles.sendButton, (!question.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={onAsk}
            disabled={!question.trim() || isLoading}
          >
            <Text style={[styles.sendButtonText, (!question.trim() || isLoading) && styles.sendButtonTextDisabled]}>
              发送
            </Text>
          </Pressable>
        </View>
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  headerTextGroup: {
    flex: 1,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  newSessionButton: {
    minHeight: 36,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.screenHorizontal,
    paddingBottom: spacing.sm,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },

  // Empty State
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptyDescription: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    maxWidth: 300,
  },
  quickQuestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  quickQuestionButton: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
  },
  quickQuestionText: {
    ...typography.body,
    color: colors.primary,
  },

  // Error
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.dangerSoft,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  errorIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.danger,
    color: colors.textInverse,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 14,
    fontWeight: '700',
    overflow: 'hidden',
  },
  errorContent: {
    flex: 1,
  },
  errorTitle: {
    ...typography.label,
    color: colors.danger,
    marginBottom: 2,
  },
  errorMessage: {
    ...typography.helper,
    color: colors.textSecondary,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
  },

  stockName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    fontSize: 18,
  },
  sectionTitle: {
    ...typography.label,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: spacing.md,
  },
  riskCard: {
    backgroundColor: colors.dangerSoft,
    borderRadius: 10,
    padding: spacing.md,
    gap: spacing.xs,
  },
  riskText: {
    ...typography.body,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  watchlistButton: {
    marginTop: spacing.lg,
  },

  // Input Area
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    zIndex: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    position: 'relative',
    zIndex: 10,
  },
  input: {
    flex: 1,
    minWidth: 80,
    borderWidth: 0,
    paddingVertical: spacing.buttonVertical - spacing.xs,
    fontSize: 16,
    color: colors.textPrimary,
    maxHeight: 120,
  },
  sendButton: {
    minHeight: 42,
    minWidth: 60,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.buttonVertical,
  },
  sendButtonDisabled: {
    backgroundColor: colors.border,
  },
  sendButtonText: {
    ...typography.bodyStrong,
    color: colors.textInverse,
  },
  sendButtonTextDisabled: {
    color: colors.textSubtle,
  },
});
