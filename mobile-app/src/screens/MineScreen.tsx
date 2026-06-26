import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { resetAllStores } from '../stores';
import type { MineStackParamList } from '../types';
import { STORAGE_KEYS } from '../api/client';
import { APP_NAME, APP_VERSION } from '../constants/app';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

type NavProp = NativeStackNavigationProp<MineStackParamList, 'Mine'>;

export default function MineScreen() {
  const navigation = useNavigation<NavProp>();
  const { isLoggedIn, username, logout } = useAuth();
  const [backendUrl, setBackendUrl] = useState('');
  const [savedBackendUrl, setSavedBackendUrl] = useState('');
  const [message, setMessage] = useState('暂未操作');
  const [devExpanded, setDevExpanded] = useState(false);

  useEffect(() => {
    const loadSavedBackendUrl = async () => {
      const storedBackendUrl = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);

      if (storedBackendUrl) {
        setBackendUrl(storedBackendUrl);
        setSavedBackendUrl(storedBackendUrl);
        setMessage('已读取保存的地址');
      }
    };

    loadSavedBackendUrl();
  }, []);

  const handleSave = async () => {
    if (!backendUrl) {
      setMessage('请先输入后端地址');
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.BACKEND_URL, backendUrl);
    setSavedBackendUrl(backendUrl);
    setMessage('地址已保存');
  };

  const handleLogout = useCallback(async () => {
    await logout();
    resetAllStores();
  }, [logout]);

  const handleTestConnection = async () => {
    if (!backendUrl) {
      setMessage('请先输入后端地址');
      return;
    }

    setMessage('正在测试连接...');

    try {
      const response = await fetch(`${backendUrl}/api/health`);
      const data = await response.json();

      if (data.status === 'ok') {
        setMessage('连接成功');
      } else {
        setMessage('连接失败');
      }
    } catch {
      setMessage('连接失败，请检查后端地址或服务是否启动');
    }
  };

  const avatarLetter = (username || '?').charAt(0).toUpperCase();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* User avatar section */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>{avatarLetter}</Text>
        </View>
        <Text style={styles.usernameText}>{isLoggedIn ? username : '未登录'}</Text>
        <View style={styles.statusRow}>
          <View style={[styles.statusDot, isLoggedIn ? styles.statusDotOnline : styles.statusDotOffline]} />
          <Text style={[styles.statusLabel, isLoggedIn ? styles.statusLabelOnline : styles.statusLabelOffline]}>
            {isLoggedIn ? '已登录' : '未登录'}
          </Text>
        </View>
      </View>

      {/* Account action */}
      <View style={styles.actionSection}>
        {isLoggedIn ? (
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutButtonText}>退出登录</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.loginButton} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.loginButtonText}>登录 / 注册</Text>
          </Pressable>
        )}
      </View>

      {/* App info section */}
      <View style={styles.infoCard}>
        <Text style={styles.infoAppName}>{APP_NAME}</Text>
        <Text style={styles.infoVersion}>版本 {APP_VERSION}</Text>
        <Text style={styles.infoDesc}>基于 AI 的股票分析工具，支持问股、自选分析、历史记录管理。</Text>
      </View>

      {/* Developer settings - collapsible */}
      <View style={styles.devCard}>
        <Pressable style={styles.devHeader} onPress={() => setDevExpanded(!devExpanded)}>
          <Text style={styles.devToggle}>{devExpanded ? '▼' : '▶'}</Text>
          <Text style={styles.devTitle}>开发者设置</Text>
        </Pressable>

        {devExpanded ? (
          <View style={styles.devBody}>
            <TextInput
              style={styles.devInput}
              value={backendUrl}
              onChangeText={setBackendUrl}
              placeholder="http://127.0.0.1:8000"
              placeholderTextColor={colors.textSubtle}
              autoCapitalize="none"
            />

            <Text style={styles.devExample}>示例：http://127.0.0.1:8000</Text>

            <View style={styles.devButtonGroup}>
              <Pressable style={styles.devSaveButton} onPress={handleSave}>
                <Text style={styles.devSaveButtonText}>保存地址</Text>
              </Pressable>
              <Pressable style={styles.devTestButton} onPress={handleTestConnection}>
                <Text style={styles.devTestButtonText}>测试连接</Text>
              </Pressable>
            </View>

            <Text style={styles.devCurrentValue}>当前输入：{backendUrl || '暂未输入'}</Text>
            <Text style={styles.devSavedValue}>已保存地址：{savedBackendUrl || '暂未保存'}</Text>
            <Text style={styles.devMessage}>操作提示：{message}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.sectionGap,
  },

  /* Avatar section */
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  avatarLetter: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 34,
  },
  usernameText: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotOnline: {
    backgroundColor: colors.success,
  },
  statusDotOffline: {
    backgroundColor: colors.textSubtle,
  },
  statusLabel: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 19,
  },
  statusLabelOnline: {
    color: colors.success,
  },
  statusLabelOffline: {
    color: colors.textSubtle,
  },

  /* Action section */
  actionSection: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  loginButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },
  logoutButton: {
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 22,
  },

  /* App info section */
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.cardPadding,
    alignItems: 'center',
  },
  infoAppName: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  infoVersion: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  infoDesc: {
    ...typography.helper,
    color: colors.textSubtle,
    textAlign: 'center',
    lineHeight: 18,
  },

  /* Developer settings */
  devCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  devHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.cardPadding,
    gap: spacing.sm,
  },
  devToggle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
    width: 14,
  },
  devTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
  },
  devBody: {
    paddingHorizontal: spacing.cardPadding,
    paddingBottom: spacing.cardPadding,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  devInput: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.buttonVertical,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  devExample: {
    ...typography.helper,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  devButtonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  devSaveButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: 12,
    alignItems: 'center',
  },
  devSaveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  devTestButton: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    paddingVertical: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  devTestButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 20,
  },
  devCurrentValue: {
    ...typography.helper,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  devSavedValue: {
    ...typography.helper,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  devMessage: {
    ...typography.helper,
    color: colors.primary,
  },
});
