import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NewsItem } from '../types';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type NewsCardProps = {
  news: NewsItem[];
};

export function NewsCard({ news }: NewsCardProps) {
  if (!news || news.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>相关资讯</Text>
      {news.map((item, index) => (
        <Pressable
          key={`${item.url}-${index}`}
          style={styles.item}
          onPress={() => Linking.openURL(item.url)}
        >
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.itemMeta}>
            {item.source} · {item.published_at}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  itemTitle: {
    ...typography.body,
    color: colors.primary,
    marginBottom: 2,
  },
  itemMeta: {
    ...typography.helper,
    color: colors.textSubtle,
  },
});
