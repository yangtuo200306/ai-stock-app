import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type MessageBubbleProps = {
  role: string;
  content: string;
  answerType?: string | null;
  style?: StyleProp<ViewStyle>;
};

function getRoleLabel(role: string, answerType?: string | null) {
  if (role === 'user') {
    return '我';
  }

  return answerType === 'ai' ? 'AI 回答' : '规则回退回答';
}

export function MessageBubble({ role, content, answerType, style }: MessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble, style]}>
      <Text style={styles.role}>{getRoleLabel(role, answerType)}</Text>
      <Text style={styles.content}>{content}</Text>
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
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    alignSelf: 'flex-start',
  },
  role: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  content: {
    ...typography.longText,
    color: colors.textSecondary,
  },
});
