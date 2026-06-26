import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import { useRecordsStore } from '../stores/recordsStore';
import type { RecordItem, RecordStackParamList, RootTabParamList } from '../types';
import { LoginRequiredView } from '../components/LoginRequiredView';
import { RecordCard } from '../components/RecordCard';
import { StateView } from '../components/StateView';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type NavigationType = NativeStackNavigationProp<RecordStackParamList, 'RecordList'>;
type TabNavProp = BottomTabNavigationProp<RootTabParamList>;

export default function RecordListScreen() {
  const navigation = useNavigation<NavigationType>();
  const tabNavigation = useNavigation<TabNavProp>();
  const { isLoggedIn, isLoading: authLoading } = useAuth();
  const {
    items,
    isLoading,
    loadError,
    searchQuery,
    fetchRecords,
    deleteRecord,
    setSearchQuery,
    getFilteredRecords,
  } = useRecordsStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (authLoading || !isLoggedIn) return;
    fetchRecords();
  }, [authLoading, isLoggedIn, fetchRecords]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchRecords();
    setRefreshing(false);
  }, [fetchRecords]);

  const handleDelete = useCallback(
    (item: RecordItem) => {
      Alert.alert(
        '确认删除',
        `确定删除 ${item.stock_name}（${item.stock_code}）的记录？`,
        [
          { text: '取消', style: 'cancel' },
          {
            text: '删除',
            style: 'destructive',
            onPress: async () => {
              await deleteRecord(item.id);
            },
          },
        ],
      );
    },
    [deleteRecord],
  );

  const filteredItems = useMemo(
    () => getFilteredRecords(searchQuery),
    [searchQuery, getFilteredRecords, items],
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

  if (isLoading && items.length === 0) {
    return <StateView type="loading" title="正在加载记录..." />;
  }

  if (loadError && items.length === 0) {
    return (
      <StateView
        type="error"
        title="记录加载失败"
        description={loadError}
        actionLabel="重新加载"
        onActionPress={fetchRecords}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Title row */}
      <View style={styles.headerRow}>
        <View style={styles.titleLeft}>
          <Text style={styles.title}>记录</Text>
          <Text style={styles.countLabel}>({items.length})</Text>
        </View>
      </View>

      {/* Search box */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="搜索记录"
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

      {/* Record list */}
      <FlatList
        style={styles.list}
        contentContainerStyle={styles.listContent}
        data={filteredItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <RecordCard
            item={item}
            onPress={() => navigation.navigate('RecordDetail', { recordId: item.id })}
            onDelete={() => handleDelete(item)}
          />
        )}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={
          searchQuery.trim() ? (
            <StateView
              type="empty"
              title="未找到匹配的记录"
              description={`没有找到包含"${searchQuery}"的记录`}
              style={styles.inlineState}
            />
          ) : (
            <StateView
              type="empty"
              title="暂无记录"
              description="问股或自选分析后，这里会显示你的分析记录。"
              style={styles.inlineState}
            />
          )
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.screenHorizontal,
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.screenHorizontal,
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
    right: spacing.screenHorizontal + spacing.sm,
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
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingBottom: spacing.xxl,
  },
  inlineState: {
    flex: 0,
    paddingVertical: spacing.xxl,
  },
});
