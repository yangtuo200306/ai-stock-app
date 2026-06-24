import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { apiGet } from '../api/client';
import type { RecordDetail as RecordDetailType, RecordStackParamList } from '../types';

type RouteType = RouteProp<RecordStackParamList, 'RecordDetail'>;
type NavProp = NativeStackNavigationProp<RecordStackParamList, 'RecordDetail'>;

export default function RecordDetailScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const { recordId } = route.params;
  const [record, setRecord] = useState<RecordDetailType | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRecord = async () => {
      try {
        const data = await apiGet(`/api/records/${recordId}`);
        if (data.id) {
          setRecord(data as RecordDetailType);
        } else {
          setError('记录不存在');
        }
      } catch {
        setError('获取记录失败');
      }
    };

    fetchRecord();
  }, [recordId]);

  const changeColor = record?.metadata.change_pct != null
    ? record.metadata.change_pct > 0
      ? '#dc2626'
      : record.metadata.change_pct < 0
        ? '#16a34a'
        : '#475569'
    : '#475569';

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.typeLabel}>
          {record.record_type === 'ask' ? '问股' : '自选分析'}
        </Text>
        <Text style={styles.stockName}>
          {record.stock_name}（{record.stock_code}）
        </Text>

        {record.record_type === 'ask' && record.question ? (
          <>
            <Text style={styles.sectionTitle}>问题</Text>
            <Text style={styles.questionText}>{record.question}</Text>
          </>
        ) : null}

        {record.record_type === 'ask' && record.answer ? (
          <>
            <Text style={styles.sectionTitle}>
              {record.answer_type === 'ai' ? 'AI 回答' : '规则回退回答'}
            </Text>
            <Text style={styles.answerText}>{record.answer}</Text>
          </>
        ) : null}

        {record.record_type === 'analysis' ? (
          <>
            <Text style={styles.sectionTitle}>摘要</Text>
            <Text style={styles.summaryText}>{record.summary}</Text>
          </>
        ) : null}

        {record.metadata.price != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>当前价</Text>
            <Text style={styles.value}>{record.metadata.price}</Text>
          </View>
        )}

        {record.metadata.change_pct != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>涨跌幅</Text>
            <Text style={[styles.value, { color: changeColor }]}>
              {record.metadata.change_pct > 0 ? '+' : ''}
              {record.metadata.change_pct}%
            </Text>
          </View>
        )}

        {record.metadata.score != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>评分</Text>
            <Text style={styles.value}>{record.metadata.score}</Text>
          </View>
        )}

        {record.metadata.action != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>建议</Text>
            <Text style={styles.value}>{record.metadata.action}</Text>
          </View>
        )}

        {record.metadata.trend != null && (
          <View style={styles.infoRow}>
            <Text style={styles.label}>趋势</Text>
            <Text style={styles.value}>{record.metadata.trend}</Text>
          </View>
        )}

        {record.report_id != null && (
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate('ReportDetail', { reportId: record.report_id! })
            }
          >
            <Text style={styles.primaryButtonText}>查看报告</Text>
          </Pressable>
        )}

        <Text style={styles.dateText}>{record.created_at}</Text>
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
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563eb',
    marginBottom: 4,
  },
  stockName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 6,
  },
  questionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 8,
  },
  answerText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    fontSize: 15,
    color: '#64748b',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 16,
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
