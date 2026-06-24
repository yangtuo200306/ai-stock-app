import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation as useTabNavigation } from '@react-navigation/native';
import { apiGet } from '../api/client';
import type { RecordDetail as RecordDetailType, RecordStackParamList, RootTabParamList } from '../types';
import { useAuth } from '../contexts/AuthContext';

type RouteType = RouteProp<RecordStackParamList, 'RecordDetail'>;
type NavProp = NativeStackNavigationProp<RecordStackParamList, 'RecordDetail'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

function getTypeLabel(recordType: string): string {
  switch (recordType) {
    case 'ask':
      return '问股';
    case 'report':
      return '报告';
    case 'analysis':
      return '分析';
    default:
      return recordType;
  }
}

function getTypeColor(recordType: string): string {
  switch (recordType) {
    case 'ask':
      return '#2563eb';
    case 'report':
      return '#7c3aed';
    case 'analysis':
      return '#64748b';
    default:
      return '#64748b';
  }
}

export default function RecordDetailScreen() {
  const route = useRoute<RouteType>();
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useTabNavigation<any>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
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
          setError(data.message || '记录不存在');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : '获取记录失败');
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

  const displayTime = record?.updated_at || record?.created_at;

  if (authLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>加载中...</Text>
      </View>
    );
  }

  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.loginTitle}>请先登录</Text>
        <Text style={styles.loginDescription}>登录后可以使用自选、问股和记录功能。</Text>
        <Pressable style={styles.loginButton} onPress={() => tabNavigation.navigate('我的', { screen: 'Login' })}>
          <Text style={styles.loginButtonText}>去登录</Text>
        </Pressable>
      </View>
    );
  }

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
        <View style={styles.typeBadge}>
          <Text style={[styles.typeLabel, { color: getTypeColor(record.record_type) }]}>
            {getTypeLabel(record.record_type)}
          </Text>
        </View>
        <Text style={styles.stockName}>
          {record.stock_name}（{record.stock_code}）
        </Text>

        {/* Messages for ask records with session */}
        {record.record_type === 'ask' && record.messages && record.messages.length > 0 ? (
          <View style={styles.messagesContainer}>
            {record.messages.map((msg, index) => (
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

        {/* Fallback for old ask records without messages */}
        {record.record_type === 'ask' && (!record.messages || record.messages.length === 0) ? (
          <>
            {record.question ? (
              <>
                <Text style={styles.sectionTitle}>问题</Text>
                <Text style={styles.questionText}>{record.question}</Text>
              </>
            ) : null}

            {record.answer ? (
              <>
                <Text style={styles.sectionTitle}>
                  {record.answer_type === 'ai' ? 'AI 回答' : '规则回退回答'}
                </Text>
                <Text style={styles.answerText}>{record.answer}</Text>
              </>
            ) : null}
          </>
        ) : null}

        {/* Report / analysis records */}
        {(record.record_type === 'report' || record.record_type === 'analysis') ? (
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

        {/* Continue asking button for ask records with session */}
        {record.record_type === 'ask' && record.session_id && (
          <Pressable
            style={styles.continueButton}
            onPress={() =>
              tabNavigation.navigate('问股', {
                sessionId: record.session_id,
                initialMessages: record.messages ?? [],
              })
            }
          >
            <Text style={styles.continueButtonText}>继续追问</Text>
          </Pressable>
        )}

        {/* View full report button */}
        {record.report_id != null && (
          <Pressable
            style={styles.primaryButton}
            onPress={() =>
              navigation.navigate('ReportDetail', { reportId: record.report_id! })
            }
          >
            <Text style={styles.primaryButtonText}>查看完整报告</Text>
          </Pressable>
        )}

        <Text style={styles.dateText}>{displayTime}</Text>
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
  typeBadge: {
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  stockName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
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
  continueButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  continueButtonText: {
    color: '#0369a1',
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
  loginTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
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
    alignSelf: 'center',
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
