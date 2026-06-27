import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { apiGet } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { useApiErrorHandler } from '../hooks/useApiErrorHandler';
import type { Report, RootTabParamList } from '../types';
import { AppCard } from '../components/AppCard';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { MetricRow } from '../components/MetricRow';
import { ScoreGauge } from '../components/ScoreGauge';
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { formatChangePct, getChangeColor } from '../utils/stockDisplay';

type RouteType = RouteProp<{ ReportDetail: { reportId: number } }, 'ReportDetail'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function ReportDetailScreen() {
  const route = useRoute<RouteType>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { handleError } = useApiErrorHandler();
  const { reportId } = route.params;
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;

    const fetchReport = async () => {
      try {
        const data = await apiGet(`/api/reports/${reportId}`);
        if (data.id) {
          setReport(data as Report);
        } else {
          setError('报告不存在');
        }
      } catch (err: unknown) {
        const { message } = handleError(err, '获取报告失败');
        setError(message);
      }
    };

    fetchReport();
  }, [authLoading, isLoggedIn, reportId, handleError]);

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
    return <StateView type="error" title="报告加载失败" description={error} />;
  }

  if (!report) {
    return <StateView type="loading" title="加载中..." />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <AppCard style={styles.card}>
        <Text style={styles.title}>分析报告</Text>
        <Text style={styles.stockName}>
          {report.stock_name} ({report.stock_code})
        </Text>

        {/* 行情概览 */}
        <Text style={styles.sectionTitle}>行情概览</Text>
        <View style={styles.sectionCard}>
          <ScoreGauge score={report.score} />

          <MetricRow label="趋势" value={report.trend} style={styles.metricRow} />
          <MetricRow label="建议" value={report.action} style={styles.metricRow} />

          {report.indicators?.change_pct != null && (
            <MetricRow
              label="涨跌幅"
              value={formatChangePct(Number(report.indicators.change_pct))}
              valueColor={getChangeColor(Number(report.indicators.change_pct))}
              style={styles.metricRow}
            />
          )}

          {report.indicators?.turnover_rate != null && (
            <MetricRow label="换手率" value={`${report.indicators.turnover_rate}%`} style={styles.metricRow} />
          )}

          {report.indicators?.amplitude != null && (
            <MetricRow label="振幅" value={`${report.indicators.amplitude}%`} style={styles.metricRow} />
          )}

          {report.indicators?.volume_signal != null && (
            <MetricRow
              label="成交量"
              value={
                report.indicators.volume_ratio != null
                  ? `${report.indicators.volume_signal}（比值 ${report.indicators.volume_ratio}）`
                  : report.indicators.volume_signal
              }
              style={styles.metricRow}
              multiline
            />
          )}
        </View>

        {/* 技术指标 */}
        <Text style={styles.sectionTitle}>技术指标</Text>
        <View style={styles.sectionCard}>
          {report.indicators?.ma5 != null && (
            <MetricRow label="MA5（5日均线）" value={report.indicators.ma5} style={styles.metricRow} />
          )}
          {report.indicators?.ma10 != null && (
            <MetricRow label="MA10（10日均线）" value={report.indicators.ma10} style={styles.metricRow} />
          )}
          {report.indicators?.ma20 != null && (
            <MetricRow label="MA20（20日均线）" value={report.indicators.ma20} style={styles.metricRow} />
          )}
          {report.indicators?.ma_trend != null && (
            <MetricRow label="均线趋势" value={report.indicators.ma_trend} style={styles.metricRow} />
          )}
          {report.indicators?.rsi6 != null && (
            <MetricRow label="RSI(6)（相对强弱指标）" value={report.indicators.rsi6} style={styles.metricRow} />
          )}
          {report.indicators?.bias_ma5 != null && (
            <MetricRow label="乖离率 MA5" value={`${report.indicators.bias_ma5}%`} style={styles.metricRow} />
          )}
          {report.indicators?.bias_ma10 != null && (
            <MetricRow label="乖离率 MA10" value={`${report.indicators.bias_ma10}%`} style={styles.metricRow} />
          )}
          {report.indicators?.bias_ma20 != null && (
            <MetricRow label="乖离率 MA20" value={`${report.indicators.bias_ma20}%`} style={styles.metricRow} />
          )}
        </View>

        {/* 摘要 */}
        <Text style={styles.sectionTitle}>摘要</Text>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>{report.summary}</Text>
        </View>

        {/* 评分原因 */}
        {report.indicators?.score_reasons != null &&
          report.indicators.score_reasons.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>评分原因</Text>
              <View style={styles.sectionCard}>
                {report.indicators.score_reasons.map((reason, index) => (
                  <Text key={index} style={styles.reasonItem}>- {reason}</Text>
                ))}
              </View>
            </>
          )}

        {/* 风险提示 */}
        {report.risks && report.risks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>风险提示</Text>
            <View style={styles.riskCard}>
              {report.risks.map((risk, index) => (
                <Text key={index} style={styles.riskItem}>
                  ⚠️ {risk}
                </Text>
              ))}
            </View>
          </>
        )}

        <Text style={styles.dateText}>报告生成时间：{report.created_at}</Text>
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
    padding: spacing.screenHorizontal,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  card: {
    width: '100%',
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  stockName: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  metricRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    paddingVertical: spacing.md,
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  sectionCard: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: spacing.md,
  },
  summaryCard: {
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
  reasonsContainer: {
    marginBottom: spacing.sm,
  },
  summaryText: {
    ...typography.longText,
    color: colors.textSecondary,
  },
  riskItem: {
    ...typography.body,
    color: colors.danger,
  },
  reasonItem: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  dateText: {
    ...typography.helper,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.xxl,
  },
});
