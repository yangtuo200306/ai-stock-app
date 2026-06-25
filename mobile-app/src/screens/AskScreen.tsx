import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatChangePct, getChangeColor } from '../utils/stockDisplay';

type AskRouteProp = RouteProp<RootTabParamList, '问股'>;
type AskTabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function AskScreen() {
  const route = useRoute<AskRouteProp>();
  const navigation = useNavigation<AskTabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const {
    sessionId, messages, question, isLoading, error, latestResult,
    setQuestion, handleAsk, handleNewSession, handleAddToWatchlist, restoreSession,
  } = useAskStore();
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
    if (params.sessionId && params.initialMessages && params.initialMessages.length > 0) {
      restoreSession(params.sessionId, params.initialMessages);
    }
    initialParamsHandled.current = true;
  }, [route.params, setQuestion, restoreSession]);

  const onNewSession = useCallback(() => {
    handleNewSession();
    initialParamsHandled.current = false;
  }, [handleNewSession]);

  const onAddToWatchlist = useCallback(async () => {
    setAddToWatchlistLoading(true);
    const result = await handleAddToWatchlist();
    if (result) {
      Alert.alert('提示', '已加入自选');
    } else {
      Alert.alert('提示', '加入自选失败，请检查后端服务');
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

  return (
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.container} ref={scrollRef}>
      <AppCard style={styles.card}>
        <View style={styles.headerRow}>
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

        <TextInput
          style={styles.input}
          value={question}
          onChangeText={setQuestion}
          placeholder="例如：600519 怎么看？"
          placeholderTextColor={colors.textSubtle}
        />

        <AppButton
          title={isLoading ? '分析中...' : '发送'}
          onPress={handleAsk}
          loading={isLoading}
          disabled={isLoading}
          style={styles.submitButton}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {messages.length > 0 ? (
          <View style={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <MessageBubble
                key={`${msg.id}-${index}`}
                role={msg.role}
                content={msg.content}
                answerType={msg.answer_type}
              />
            ))}
          </View>
        ) : null}

        {latestResult ? (
          <View style={styles.resultCard}>
            <Text style={styles.stockName}>
              {latestResult.stock_name}（{latestResult.stock_code}）
            </Text>

            <MetricRow label="当前价" value={latestResult.price} style={styles.metricRow} />
            <MetricRow
              label="涨跌幅"
              value={formatChangePct(latestResult.change_pct)}
              valueColor={getChangeColor(latestResult.change_pct)}
              style={styles.metricRow}
            />
            <MetricRow label="趋势" value={latestResult.trend} style={styles.metricRow} />
            <MetricRow label="建议" value={latestResult.action} style={styles.metricRow} />
            <MetricRow label="评分" value={latestResult.score} style={styles.metricRow} />

            <Text style={styles.sectionTitle}>技术指标</Text>
            <MetricRow label="MA5" value={latestResult.indicators.ma5} style={styles.metricRow} />
            <MetricRow label="MA10" value={latestResult.indicators.ma10} style={styles.metricRow} />
            <MetricRow label="MA20" value={latestResult.indicators.ma20} style={styles.metricRow} />
            <MetricRow label="RSI(6)" value={latestResult.indicators.rsi6} style={styles.metricRow} />
            <MetricRow label="RSI(12)" value={latestResult.indicators.rsi12} style={styles.metricRow} />
            <MetricRow
              label="成交量"
              value={
                latestResult.indicators.volume_ratio != null
                  ? `${latestResult.indicators.volume_signal ?? '-'}（比值 ${latestResult.indicators.volume_ratio}）`
                  : latestResult.indicators.volume_signal
              }
              style={styles.metricRow}
            />

            {latestResult.risks.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>风险提示</Text>
                {latestResult.risks.map((risk) => (
                  <Text key={risk} style={styles.riskText}>
                    - {risk}
                  </Text>
                ))}
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
          </View>
        ) : null}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    maxWidth: 560,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
    marginBottom: spacing.lg,
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
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.buttonVertical,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.helper,
    color: colors.danger,
    marginBottom: spacing.md,
  },
  messagesContainer: {
    marginBottom: spacing.lg,
  },
  resultCard: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.lg,
  },
  stockName: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  metricRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },
  riskText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  watchlistButton: {
    marginTop: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});
