import React, { useCallback, useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import Markdown from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import type { NewsItem, ThinkingStep } from '../types';
import { NewsCard } from './NewsCard';

type MessageBubbleProps = {
  role: string;
  content: string;
  answerType?: string | null;
  onRetry?: () => void;
  isStreaming?: boolean;
  news?: NewsItem[];
  thinkingSteps?: ThinkingStep[];
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
    overflow: 'hidden',
    flexWrap: 'wrap',
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
  link: {
    color: '#1890ff',
    textDecorationLine: 'underline' as const,
  },
};

export function MessageBubble({ role, content, answerType, onRetry, isStreaming, news, thinkingSteps, style }: MessageBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);
  const [thinkingExpanded, setThinkingExpanded] = useState(false);

  const handleCopy = useCallback(async () => {
    await Clipboard.setStringAsync(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [content]);

  const hasThinkingSteps = thinkingSteps && thinkingSteps.length > 0;
  const toolCount = thinkingSteps?.filter(s => s.type === 'tool_done').length || 0;
  const totalDuration = thinkingSteps
    ?.filter(s => s.type === 'tool_done' && s.duration)
    .reduce((sum, s) => sum + (s.duration || 0), 0) || 0;

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
        <View>
          {/* 思考过程面板 */}
          {hasThinkingSteps && (
            <View style={styles.thinkingContainer}>
              <Pressable
                style={styles.thinkingHeader}
                onPress={() => setThinkingExpanded(!thinkingExpanded)}
              >
                <Text style={styles.thinkingToggle}>
                  {thinkingExpanded ? '▼' : '▶'}
                </Text>
                <Text style={styles.thinkingTitle}>
                  思考过程
                </Text>
                <Text style={styles.thinkingSummary}>
                  ({toolCount} 个工具{toolCount > 0 ? ` · ${totalDuration.toFixed(1)}s` : ''})
                </Text>
              </Pressable>
              {thinkingExpanded && (
                <View style={styles.thinkingSteps}>
                  {thinkingSteps.map((step, idx) => (
                    <View key={idx} style={styles.thinkingStepRow}>
                      <Text style={styles.thinkingStepIcon}>
                        {step.type === 'thinking' ? '○' :
                         step.type === 'tool_start' ? '●' :
                         step.type === 'tool_done' ? (step.success ? '✓' : '✗') :
                         '◆'}
                      </Text>
                      <Text style={[
                        styles.thinkingStepText,
                        step.type === 'tool_done' && !step.success && styles.thinkingStepError,
                      ]}>
                        {step.type === 'thinking' ? (step.message || 'AI 正在分析...') :
                         step.type === 'tool_start' ? (step.display_name || step.tool || '执行工具...') :
                         step.type === 'tool_done' ? `${step.display_name || step.tool} ${step.success ? '' : '失败'}${step.duration ? ` ${step.duration}s` : ''}` :
                         step.message || ''}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
          <Markdown style={markdownStyles}>{content}</Markdown>
          {news && news.length > 0 && <NewsCard news={news} />}
          {isStreaming && <Text style={styles.cursor}>|</Text>}
        </View>
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
    overflow: 'hidden',
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
  cursor: {
    ...typography.body,
    color: colors.textMuted,
    opacity: 0.7,
  },
  thinkingContainer: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  thinkingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  thinkingToggle: {
    fontSize: 12,
    color: colors.textMuted,
    width: 16,
  },
  thinkingTitle: {
    ...typography.label,
    color: colors.textMuted,
    flex: 1,
  },
  thinkingSummary: {
    ...typography.helper,
    color: colors.textSubtle,
  },
  thinkingSteps: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  thinkingStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingLeft: spacing.xs,
  },
  thinkingStepIcon: {
    fontSize: 12,
    width: 14,
    textAlign: 'center',
    color: colors.textMuted,
  },
  thinkingStepText: {
    ...typography.helper,
    color: colors.textMuted,
    flex: 1,
  },
  thinkingStepError: {
    color: colors.danger,
  },
});
