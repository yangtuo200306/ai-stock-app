import React, { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type MessageBubbleProps = {
  role: string;
  content: string;
  answerType?: string | null;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
};

function getRoleLabel(role: string, answerType?: string | null) {
  if (role === 'user') {
    return '我';
  }
  return answerType === 'ai' ? 'AI 回答' : '规则回答';
}

const markdownStyles = {
  body: {
    ...typography.longText,
    color: colors.textSecondary,
  },
  heading1: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading2: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.textPrimary,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  heading3: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: colors.textPrimary,
    marginTop: spacing.xs,
    marginBottom: spacing.xs,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: spacing.xs,
  },
  strong: {
    fontWeight: '700' as const,
  },
  code_inline: {
    backgroundColor: colors.surfaceMuted,
    color: colors.textPrimary,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    fontSize: 13,
  },
  fence: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: spacing.sm,
    marginVertical: spacing.xs,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: colors.border,
    paddingLeft: spacing.sm,
    marginVertical: spacing.xs,
    opacity: 0.8,
  },
  list_item: {
    marginBottom: 2,
  },
};

export function MessageBubble({ role, content, answerType, onRetry, style }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, style]}>
      <View style={styles.headerRow}>
        <Text style={[styles.role, isUser ? styles.userRole : styles.assistantRole]}>
          {getRoleLabel(role, answerType)}
        </Text>
        {!isUser && (
          <Pressable onPress={handleCopy} style={styles.copyButton}>
            <Text style={styles.copyText}>{copied ? '已复制' : '复制'}</Text>
          </Pressable>
        )}
      </View>
      {isUser ? (
        <Text style={styles.userContent}>{content}</Text>
      ) : (
        <Markdown style={markdownStyles}>{content}</Markdown>
      )}
      {!isUser && onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>重新回答</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '92%',
    borderRadius: 14,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  userBubble: {
    backgroundColor: colors.primarySoft,
    alignSelf: 'flex-end',
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  role: {
    ...typography.label,
  },
  userRole: {
    color: colors.primary,
  },
  assistantRole: {
    color: colors.textMuted,
  },
  copyButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.surfaceMuted,
  },
  copyText: {
    ...typography.helper,
    color: colors.textMuted,
  },
  userContent: {
    ...typography.longText,
    color: colors.textPrimary,
  },
  retryButton: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  retryText: {
    ...typography.helper,
    color: colors.danger,
    fontWeight: '600',
  },
});
