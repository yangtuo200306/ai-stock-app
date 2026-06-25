import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useWatchlistStore } from '../stores/watchlistStore';
import type { Stock, WatchlistStackParamList, RootTabParamList } from '../types';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { getRecordTypeColor, getRecordTypeLabel } from '../utils/recordDisplay';
import { getTaskStatusColor, getTaskStatusLabel } from '../utils/taskStatusDisplay';
import { normalizeAShareCode } from '../utils/stockDisplay';

type NavProp = NativeStackNavigationProp<WatchlistStackParamList, 'Watchlist'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function WatchlistScreen() {
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const { stocks, taskStatuses, isLoading, loadError, loadStocks, loadTaskStatuses, addStock, deleteStock, createAnalysis } = useWatchlistStore();
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadStocks();
    loadTaskStatuses();
  }, [authLoading, isLoggedIn, loadStocks, loadTaskStatuses]);

  const handleAddStock = useCallback(async () => {
    const normalizedCode = normalizeAShareCode(newCode);
    const stockName = newName.trim();

    if (!stockName) {
      Alert.alert('提示', '请输入股票名称');
      return;
    }

    if (!normalizedCode) {
      Alert.alert('提示', '目前仅支持 6 位 A 股代码');
      return;
    }

    const success = await addStock(normalizedCode, stockName);
    if (success) {
      setNewCode('');
      setNewName('');
    } else {
      Alert.alert('错误', '添加自选股失败，请检查后端服务');
    }
  }, [newCode, newName, addStock]);

  const handleDeleteStock = useCallback(
    async (code: string) => {
      const success = await deleteStock(code);
      if (!success) {
        Alert.alert('错误', '删除自选股失败');
      }
    },
    [deleteStock],
  );

  const handleCreateAnalysis = useCallback(
    async (stock: Stock) => {
      const taskId = await createAnalysis(stock.code);
      if (taskId) {
        navigation.navigate('TaskStatus', {
          taskId,
          stockCode: stock.code,
        });
      } else {
        Alert.alert('错误', '创建分析任务失败，请检查后端服务');
      }
    },
    [navigation, createAnalysis],
  );

  const handleAskAI = useCallback(
    (stock: Stock) => {
      tabNavigation.navigate('问股', { initialQuestion: `${stock.code} 怎么看？` });
    },
    [tabNavigation],
  );

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

  const renderStockItem = ({ item }: { item: Stock }) => {
    const status = taskStatuses[item.code];

    return (
      <Pressable onPress={() => handleCreateAnalysis(item)} onLongPress={() => handleDeleteStock(item.code)}>
        <AppCard style={styles.stockItem}>
          <View style={styles.stockTopRow}>
            <View style={styles.stockInfo}>
              <Text style={styles.stockCode}>{item.code}</Text>
              <Text style={styles.stockName}>{item.name}</Text>
            </View>
            {status ? (
              <View style={[styles.statusBadge, { backgroundColor: getTaskStatusColor(status) }]}>
                <Text style={styles.statusText}>{getTaskStatusLabel(status)}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.summarySection}>
            {item.latest_summary ? (
              <>
                <Text style={styles.summaryText} numberOfLines={2}>
                  {item.latest_summary}
                </Text>
                <View style={styles.summaryMeta}>
                  {item.latest_record_type ? (
                    <Text
                      style={[
                        styles.summaryTypeLabel,
                        {
                          color: getRecordTypeColor(item.latest_record_type),
                          backgroundColor: colors.surfaceMuted,
                        },
                      ]}
                    >
                      {getRecordTypeLabel(item.latest_record_type)}
                    </Text>
                  ) : null}
                  {item.latest_updated_at ? (
                    <Text style={styles.summaryTime}>{item.latest_updated_at}</Text>
                  ) : null}
                </View>
              </>
            ) : (
              <Text style={styles.noSummaryText}>暂无分析记录</Text>
            )}
          </View>

          <View style={styles.actionRow}>
            <AppButton
              title="问 AI"
              variant="ghost"
              onPress={() => handleAskAI(item)}
              style={styles.smallButton}
            />
            <AppButton
              title="删除"
              variant="danger"
              onPress={() => handleDeleteStock(item.code)}
              style={styles.smallButton}
            />
          </View>
        </AppCard>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <AppCard style={styles.headerCard}>
        <Text style={styles.title}>自选股列表</Text>
        <Text style={styles.description}>点击股票创建分析任务，长按或点击删除可直接删除。</Text>

        <View style={styles.addForm}>
          <TextInput
            style={styles.input}
            value={newCode}
            onChangeText={setNewCode}
            placeholder="股票代码"
            placeholderTextColor={colors.textSubtle}
            autoCapitalize="characters"
          />
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="股票名称"
            placeholderTextColor={colors.textSubtle}
          />
          <AppButton title="添加自选" onPress={handleAddStock} />
        </View>

        <AppButton title="刷新列表" variant="secondary" onPress={loadStocks} />
      </AppCard>

      {isLoading ? <StateView type="loading" title="加载中..." style={styles.inlineState} /> : null}

      {loadError ? (
        <StateView
          type="error"
          title="自选股加载失败"
          description={loadError}
          actionLabel="重新加载"
          onActionPress={loadStocks}
          style={styles.inlineState}
        />
      ) : null}

      {!isLoading && !loadError ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={stocks}
          keyExtractor={(item) => item.code}
          renderItem={renderStockItem}
          ListEmptyComponent={
            <StateView
              type="empty"
              title="暂无自选股"
              description="添加股票后，可以从这里发起分析或快速问 AI。"
              style={styles.inlineState}
            />
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.screenHorizontal,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  headerCard: {
    maxWidth: 420,
    alignSelf: 'center',
    marginBottom: spacing.sectionGap,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.helper,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  addForm: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.buttonVertical,
    fontSize: 16,
    color: colors.textPrimary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  inlineState: {
    flex: 0,
    paddingVertical: spacing.xxl,
  },
  stockItem: {
    marginBottom: spacing.itemGap,
  },
  stockTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  stockInfo: {
    flex: 1,
  },
  stockCode: {
    ...typography.cardTitle,
    color: colors.textPrimary,
  },
  stockName: {
    ...typography.helper,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  statusText: {
    ...typography.label,
    color: colors.textInverse,
  },
  summarySection: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  summaryText: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  summaryMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  summaryTypeLabel: {
    ...typography.label,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryTime: {
    ...typography.label,
    color: colors.textSubtle,
  },
  noSummaryText: {
    ...typography.helper,
    color: colors.textSubtle,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  smallButton: {
    flex: 1,
    minHeight: 38,
  },
});
