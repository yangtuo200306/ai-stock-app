import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useWatchlistStore } from '../stores/watchlistStore';
import type { Stock, WatchlistStackParamList, RootTabParamList } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { StateView } from '../components/StateView';
import { StockAutocomplete } from '../components/StockAutocomplete';
import { WatchlistStockCard } from '../components/WatchlistStockCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { normalizeAShareCode } from '../utils/stockDisplay';

type NavProp = NativeStackNavigationProp<WatchlistStackParamList, 'Watchlist'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function WatchlistScreen() {
  const navigation = useNavigation<NavProp>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const {
    stocks,
    taskStatuses,
    isLoading,
    loadError,
    searchQuery,
    loadStocks,
    loadTaskStatuses,
    addStock,
    deleteStock,
    createAnalysis,
    setSearchQuery,
    getFilteredStocks,
  } = useWatchlistStore();

  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Stock | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [codeValid, setCodeValid] = useState<'valid' | 'invalid' | null>(null);
  const [selectedStock, setSelectedStock] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    loadStocks();
    loadTaskStatuses();
  }, [authLoading, isLoggedIn, loadStocks, loadTaskStatuses]);

  // Validate code input as user types
  const handleCodeChange = useCallback((text: string) => {
    setNewCode(text);
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      setCodeValid(null);
      return;
    }
    const result = normalizeAShareCode(trimmed);
    setCodeValid(result ? 'valid' : 'invalid');
  }, []);

  const handleAddStock = useCallback(async () => {
    const normalizedCode = normalizeAShareCode(newCode);
    const stockName = newName.trim();

    if (!stockName) {
      return;
    }

    if (!normalizedCode) {
      return;
    }

    const success = await addStock(normalizedCode, stockName);
    if (success) {
      setNewCode('');
      setNewName('');
      setCodeValid(null);
      setShowForm(false);
    }
  }, [newCode, newName, addStock]);

  const handleDeleteStock = useCallback(
    async (code: string) => {
      const success = await deleteStock(code);
      setDeleteTarget(null);
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
      }
    },
    [navigation, createAnalysis],
  );

  const handleCardPress = useCallback(
    (stock: Stock) => {
      if (stock.latest_record_id != null) {
        navigation.navigate('RecordDetail', { recordId: stock.latest_record_id });
      } else {
        Alert.alert('提示', '暂无分析记录');
      }
    },
    [navigation],
  );

  const handleAskAI = useCallback(
    (stock: Stock) => {
      tabNavigation.navigate('问股', { initialQuestion: `${stock.code} 怎么看？` });
    },
    [tabNavigation],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadStocks(), loadTaskStatuses()]);
    setRefreshing(false);
  }, [loadStocks, loadTaskStatuses]);

  const filteredStocks = useMemo(
    () => getFilteredStocks(searchQuery),
    [searchQuery, getFilteredStocks, stocks],
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
      <WatchlistStockCard
        stock={item}
        taskStatus={status}
        onPress={() => handleCardPress(item)}
        onAskAI={() => handleAskAI(item)}
        onAnalyze={() => handleCreateAnalysis(item)}
        onDeleteRequest={() => setDeleteTarget(item)}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Title row */}
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Text style={styles.title}>自选股</Text>
          <Text style={styles.countLabel}>({stocks.length})</Text>
        </View>
        <Pressable
          style={[styles.addButton, showForm && styles.addButtonActive]}
          onPress={() => setShowForm((v) => !v)}
        >
          <Text style={[styles.addButtonText, showForm && styles.addButtonTextActive]}>
            {showForm ? '✕' : '＋'}
          </Text>
        </Pressable>
      </View>

      {/* Search box */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索自选股代码或名称"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 ? (
          <Pressable style={styles.clearButton} onPress={() => setSearchQuery('')}>
            <Text style={styles.clearButtonText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Add form (collapsible) */}
      {showForm ? (
        <View style={styles.formCard}>
          <View style={styles.formRow}>
              <View style={[styles.codeInputWrapper, codeValid === 'valid' && styles.inputValid, codeValid === 'invalid' && styles.inputInvalid]}>
              <StockAutocomplete
                query={newCode}
                selected={selectedStock}
                onSelect={(code, name) => {
                  setSelectedStock({ code, name });
                  setNewCode(code);
                  setNewName(name);
                  setCodeValid('valid');
                }}
                onRemove={() => {
                  setSelectedStock(null);
                  setNewCode('');
                  setNewName('');
                  setCodeValid(null);
                }}
              />
              <TextInput
                style={styles.formInput}
                value={newCode}
                onChangeText={handleCodeChange}
                placeholder="股票代码"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="characters"
                maxLength={10}
              />
              {codeValid === 'valid' ? (
                <Text style={styles.codeFeedbackValid}>✓</Text>
              ) : codeValid === 'invalid' && newCode.trim().length > 0 ? (
                <Text style={styles.codeFeedbackInvalid}>✗</Text>
              ) : null}
              </View>
            <View style={styles.formInputWrapper}>
            <TextInput
              style={styles.formInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="股票名称"
              placeholderTextColor={colors.textSubtle}
            />
            </View>
          </View>
          <Pressable
            style={[
              styles.addConfirmButton,
              (!normalizeAShareCode(newCode) || !newName.trim()) && styles.addConfirmButtonDisabled,
            ]}
            onPress={handleAddStock}
            disabled={!normalizeAShareCode(newCode) || !newName.trim()}
          >
            <Text style={styles.addConfirmText}>添加自选</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Loading state */}
      {isLoading && stocks.length === 0 ? (
        <StateView type="loading" title="加载中..." style={styles.inlineState} />
      ) : null}

      {/* Error state */}
      {loadError && stocks.length === 0 ? (
        <StateView
          type="error"
          title="自选股加载失败"
          description={loadError}
          actionLabel="重新加载"
          onActionPress={loadStocks}
          style={styles.inlineState}
        />
      ) : null}

      {/* Stock list */}
      {!isLoading && !loadError ? (
        <FlatList
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={filteredStocks}
          keyExtractor={(item) => item.code}
          renderItem={renderStockItem}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          ListEmptyComponent={
            searchQuery.trim() ? (
              <StateView
                type="empty"
                title="未找到匹配的自选股"
                description={`没有找到包含"${searchQuery}"的自选股`}
                style={styles.inlineState}
              />
            ) : (
              <StateView
                type="empty"
                title="暂无自选股"
                description="点击右上角 ＋ 添加股票"
                style={styles.inlineState}
              />
            )
          }
        />
      ) : null}

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        visible={deleteTarget !== null}
        title="确认删除"
        description={
          deleteTarget
            ? `确定删除 ${deleteTarget.name}（${deleteTarget.code}）？`
            : undefined
        }
        confirmLabel="删除"
        cancelLabel="取消"
        onConfirm={() => {
          if (deleteTarget) {
            handleDeleteStock(deleteTarget.code);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.screenHorizontal,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
  },
  countLabel: {
    ...typography.helper,
    color: colors.textSubtle,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonActive: {
    backgroundColor: colors.danger,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.textInverse,
    lineHeight: 22,
  },
  addButtonTextActive: {
    fontSize: 16,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.buttonVertical,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
  },
  clearButton: {
    position: 'absolute',
    right: spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.textSubtle,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    marginBottom: spacing.md,
  },
  formRow: {
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  codeInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    position: 'relative',
    zIndex: 10,
  },
  formInputWrapper: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
  },
  formInput: {
    flex: 1,
    minWidth: 80,
    borderWidth: 0,
    paddingVertical: spacing.buttonVertical - spacing.xs,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: 'transparent',
  },
  inputValid: {
    borderColor: colors.success,
  },
  inputInvalid: {
    borderColor: colors.danger,
  },
  codeFeedbackValid: {
    fontSize: 16,
    color: colors.success,
    fontWeight: '700',
  },
  codeFeedbackInvalid: {
    fontSize: 16,
    color: colors.danger,
    fontWeight: '700',
  },
  addConfirmButton: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  addConfirmButtonDisabled: {
    backgroundColor: colors.border,
    borderColor: colors.border,
  },
  addConfirmText: {
    ...typography.bodyStrong,
    color: colors.textInverse,
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
});
