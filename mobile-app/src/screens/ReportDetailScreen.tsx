import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { Report } from '../types';

const BACKEND_URL_STORAGE_KEY = 'backendUrl';

type RouteType = RouteProp<{ ReportDetail: { reportId: number } }, 'ReportDetail'>;

export default function ReportDetailScreen() {
  const route = useRoute<RouteType>();
  const { reportId } = route.params;
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReport = async () => {
      const backendUrl = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);
      if (!backendUrl) {
        setError('后端地址未配置');
        return;
      }

      try {
        const res = await fetch(`${backendUrl}/api/reports/${reportId}`);
        const data = await res.json();
        if (data.id) {
          setReport(data as Report);
        } else {
          setError('报告不存在');
        }
      } catch {
        setError('获取报告失败');
      }
    };

    fetchReport();
  }, [reportId]);

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>分析报告</Text>
        <Text style={styles.stockName}>
          {report.stock_name} ({report.stock_code})
        </Text>

        <View style={styles.infoRow}>
          <Text style={styles.label}>当前价格</Text>
          <Text style={styles.value}>{report.price}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>综合评分</Text>
          <Text style={styles.value}>{report.score}/100</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>操作建议</Text>
          <Text style={styles.value}>{report.action}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.label}>趋势判断</Text>
          <Text style={styles.value}>{report.trend}</Text>
        </View>

        {report.indicators?.change_pct != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>涨跌幅</Text>
            <Text
              style={[
                styles.value,
                {
                  color:
                    Number(report.indicators.change_pct) > 0
                      ? '#dc2626'
                      : Number(report.indicators.change_pct) < 0
                        ? '#16a34a'
                        : '#1e293b',
                },
              ]}
            >
              {Number(report.indicators.change_pct) > 0 ? '+' : ''}
              {String(report.indicators.change_pct)}%
            </Text>
          </View>
        )}

        {report.indicators?.source != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>数据来源</Text>
            <Text style={styles.value}>{String(report.indicators.source)}</Text>
          </View>
        )}

        {report.indicators?.fetched_at != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>行情获取时间</Text>
            <Text style={styles.value}>{String(report.indicators.fetched_at)}</Text>
          </View>
        )}

        {report.indicators?.ma5 != null && (
          <>
            <Text style={styles.sectionTitle}>技术指标</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>MA5</Text>
              <Text style={styles.value}>{report.indicators.ma5}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>MA10</Text>
              <Text style={styles.value}>{report.indicators.ma10}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>MA20</Text>
              <Text style={styles.value}>{report.indicators.ma20}</Text>
            </View>
          </>
        )}

        {report.indicators?.bias_ma5 != null && (
          <>
            <Text style={styles.sectionTitle}>乖离率</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>相对 MA5</Text>
              <Text style={styles.value}>{report.indicators.bias_ma5}%</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>相对 MA10</Text>
              <Text style={styles.value}>{report.indicators.bias_ma10}%</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>相对 MA20</Text>
              <Text style={styles.value}>{report.indicators.bias_ma20}%</Text>
            </View>
          </>
        )}

        {report.indicators?.ma_trend != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>均线趋势</Text>
            <Text style={styles.value}>{report.indicators.ma_trend}</Text>
          </View>
        )}

        {report.indicators?.score_reasons != null &&
          report.indicators.score_reasons.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>评分原因</Text>
              {report.indicators.score_reasons.map((reason, index) => (
                <Text key={index} style={styles.reasonItem}>
                  - {reason}
                </Text>
              ))}
            </>
          )}

        <Text style={styles.sectionTitle}>摘要</Text>
        <Text style={styles.summaryText}>{report.summary}</Text>

        {report.risks && report.risks.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>风险提示</Text>
            {report.risks.map((risk, index) => (
              <Text key={index} style={styles.riskItem}>
                - {risk}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.dateText}>
          报告生成时间：{report.created_at}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
    textAlign: 'center',
  },
  stockName: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 16,
    color: '#64748b',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 24,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  riskItem: {
    fontSize: 15,
    color: '#dc2626',
    marginBottom: 8,
    lineHeight: 22,
  },
  reasonItem: {
    fontSize: 15,
    color: '#2563eb',
    marginBottom: 8,
    lineHeight: 22,
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginTop: 100,
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginTop: 100,
  },
});
