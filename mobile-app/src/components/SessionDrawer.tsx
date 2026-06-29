import { useCallback, useEffect } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSessionStore } from '../stores/sessionStore';
import { useAskStore } from '../stores/askStore';
import { apiGet } from '../api/client';
import type { SessionItem, AskMessage } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} 小时前`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} 天前`;
  return new Date(dateStr).toLocaleDateString('zh-CN');
}

export default function SessionDrawer({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { sessions, isLoading, fetchSessions } = useSessionStore();
  const { restoreSession } = useAskStore();

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSessionPress = useCallback(async (session: SessionItem) => {
    try {
      const data = await apiGet(`/api/ask/messages?session_id=${session.id}`);
      const messages = (data as AskMessage[]) || [];
      restoreSession(session.id, messages);
      navigation.closeDrawer();
    } catch {
      // 加载消息失败，仍然尝试恢复 session
      restoreSession(session.id, []);
      navigation.closeDrawer();
    }
  }, [restoreSession, navigation]);

  const renderItem = useCallback(({ item }: { item: SessionItem }) => (
    <Pressable
      style={styles.sessionItem}
      onPress={() => handleSessionPress(item)}
    >
      <Text style={styles.sessionTitle} numberOfLines={1}>
        {item.title}
      </Text>
      <View style={styles.sessionMeta}>
        <Text style={styles.sessionTime}>
          {formatRelativeTime(item.updated_at)}
        </Text>
        <Text style={styles.sessionCount}>
          {item.message_count} 条消息
        </Text>
      </View>
    </Pressable>
  ), [handleSessionPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>历史会话</Text>
        <Pressable onPress={() => navigation.closeDrawer()}>
          <Text style={styles.closeButton}>✕</Text>
        </Pressable>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {isLoading ? '加载中...' : '暂无历史会话'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
  },
  closeButton: {
    ...typography.body,
    color: colors.textMuted,
    fontSize: 18,
    padding: spacing.xs,
  },
  listContent: {
    padding: spacing.screenHorizontal,
  },
  sessionItem: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sessionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sessionTime: {
    ...typography.helper,
    color: colors.textMuted,
  },
  sessionCount: {
    ...typography.helper,
    color: colors.textSubtle,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
  },
});
