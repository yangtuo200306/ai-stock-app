import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { apiGet } from '../api/client';
import type { RecordDetail as RecordDetailType, RecordStackParamList, RootTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { MessageBubble } from '../components/MessageBubble';
import { MetricRow } from '../components/MetricRow';
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getRecordTypeColor, getRecordTypeLabel } from '../utils/recordDisplay';
import { formatChangePct, getChangeColor } from '../utils/stockDisplay';

type RouteType = RouteProp<RecordStackParamList, 'RecordDetail'>;
type NavProp = NativeStackNavigationProp<RecordStackParamList, 'RecordDetail'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function RecordDetailScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { handleError } = useApiErrorHandler();
  const { recordId } = route.params;
  const [record, setRecord] = useState<RecordDetailType | null>(null);
  const [error, setError] = useState('');

  const fetchRecord = useCallback(async () => {
    if (authLoading || !isLoggedIn) return;

    try {
      const data = await apiGet(`/api/records/${recordId}`);
      if (data.id) {
        setRecord(data as RecordDetailType);
      } else {
        setError(data.message || '记录不存在');
      }
    } catch (err: unknown) {
      const { message } = handleError(err, '获取记录失败');
      setError(message);
    }
  }, [authLoading, isLoggedIn, recordId, handleError]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const displayTime = record?.updated_at || record?.created_at;

  if (authLoading) {
    return <StateView type="loading" />;
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.centerContainer}>
        <LoginRequiredView
          description="登录后可以使用自选、问股和记录功能。"
          onLoginPress={() => tabNavigation.navigate('我的', { screen: 'Login' })}
        />
      </View>
    );
  }

  if (error) {
    return <StateView type="error" title="记录加载失败" description={error} />;
  }

  if (!record) {
    return <StateView type="loading" title="加载中..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppCard style={styles.card}>
        <View style={styles.typeBadge}>
          <Text style={[styles.typeLabel, { color: getRecordTypeColor(record.record_type) }]}>
            {getRecordTypeLabel(record.record_type)}
          </Text>
        </View>
        <Text style={styles.stockName}>
          {record.stock_name}（{record.stock_code}）
        </Text>

        {record.record_type === 'ask' && record.messages && record.messages.length > 0 ? (
          <View style={styles.messagesContainer}>
            {record.messages.map((msg, index) => (
              <MessageBubble
                key={`${msg.id}-${index}`}
                role={msg.role}
                content={msg.content}
                answerType={msg.answer_type}
              />
            ))}
          </View>
        ) : null}

        {record.record_type === 'ask' && (!record.messages || record.messages.length === 0) ? (
          <>
            {record.question ? (
              <>
                <Text style={styles.sectionTitle}>问题</Text>
                <MessageBubble role="user" content={record.question} />
              </>
            ) : null}

            {record.answer ? (
              <>
                <Text style={styles.sectionTitle}>
                  {record.answer_type === 'ai' ? 'AI 回答' : '规则回退回答'}
                </Text>
                <MessageBubble role="assistant" content={record.answer} answerType={record.answer_type} />
              </>
            ) : null}
          </>
        ) : null}

        {record.record_type === 'report' || record.record_type === 'analysis' ? (
          <>
            <Text style={styles.sectionTitle}>摘要</Text>
            <Text style={styles.summaryText}>{record.summary}</Text>
          </>
        ) : null}

        <View style={styles.metricsSection}>
          {record.metadata.price != null && (
            <MetricRow label="当前价" value={record.metadata.price} style={styles.metricRow} />
          )}

          {record.metadata.change_pct != null && (
            <MetricRow
              label="涨跌幅"
              value={formatChangePct(record.metadata.change_pct)}
              valueColor={getChangeColor(record.metadata.change_pct)}
              style={styles.metricRow}
            />
          )}

          {record.metadata.score != null && (
            <MetricRow label="评分" value={record.metadata.score} style={styles.metricRow} />
          )}

          {record.metadata.action != null && (
            <MetricRow label="建议" value={record.metadata.action} style={styles.metricRow} />
          )}

          {record.metadata.trend != null && (
            <MetricRow label="趋势" value={record.metadata.trend} style={styles.metricRow} />
          )}
        </View>

        {record.record_type === 'ask' && record.session_id && (
          <AppButton
            title="继续追问"
            variant="secondary"
            onPress={() =>
              tabNavigation.navigate('问股', {
                sessionId: record.session_id ?? undefined,
                initialMessages: record.messages ?? [],
              })
            }
            style={styles.actionButton}
          />
        )}

        {record.report_id != null && (
          <AppButton
            title="查看完整报告"
            onPress={() => navigation.navigate('ReportDetail', { reportId: record.report_id! })}
            style={styles.actionButton}
          />
        )}

        <Text style={styles.dateText}>{displayTime}</Text>
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    maxWidth: 560,
    alignSelf: 'center',
  },
  typeBadge: {
    marginBottom: spacing.xs,
  },
  typeLabel: {
    ...typography.label,
    marginBottom: spacing.xs,
  },
  stockName: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  messagesContainer: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.longText,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  metricsSection: {
    marginTop: spacing.sm,
  },
  metricRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingVertical: spacing.md,
  },
  actionButton: {
    marginTop: spacing.lg,
  },
  dateText: {
    ...typography.helper,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
});
