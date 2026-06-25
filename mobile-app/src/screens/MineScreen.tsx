import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { resetAllStores } from '../stores';
import type { MineStackParamList } from '../types';
import { STORAGE_KEYS } from '../api/client';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>我的</Text>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>账号</Text>
        {isLoggedIn ? (
          <View style={styles.sectionBody}>
            <Text style={styles.usernameText}>当前用户：{username}</Text>
            <AppButton title="退出登录" variant="danger" onPress={handleLogout} />
          </View>
        ) : (
          <View style={styles.sectionBody}>
            <Text style={styles.placeholder}>未登录</Text>
            <AppButton title="登录 / 注册" onPress={() => navigation.navigate('Login')} />
          </View>
        )}
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>应用信息</Text>
        <Text style={styles.infoText}>当前版本：v1.0</Text>
        <Text style={styles.infoText}>当前能力：前端架构升级（Zustand 状态管理）</Text>
      </AppCard>

      <AppCard style={styles.card}>
        <Text style={styles.sectionTitle}>后端地址配置</Text>

        <TextInput
          style={styles.input}
          value={backendUrl}
          onChangeText={setBackendUrl}
          placeholder="http://127.0.0.1:8000"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
        />

        <Text style={styles.example}>示例：http://127.0.0.1:8000</Text>

        <View style={styles.buttonGroup}>
          <AppButton title="保存地址" onPress={handleSave} />
          <AppButton title="测试连接" variant="secondary" onPress={handleTestConnection} />
        </View>

        <Text style={styles.currentValue}>当前输入：{backendUrl || '暂未输入'}</Text>
        <Text style={styles.savedValue}>已保存地址：{savedBackendUrl || '暂未保存'}</Text>
        <Text style={styles.message}>操作提示：{message}</Text>
      </AppCard>
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
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  card: {
    maxWidth: 420,
    alignSelf: 'center',
  },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  sectionBody: {
    alignItems: 'center',
    gap: spacing.md,
  },
  usernameText: {
    ...typography.bodyStrong,
    color: colors.textPrimary,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
  },
  infoText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.buttonVertical,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  example: {
    ...typography.helper,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  buttonGroup: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  currentValue: {
    ...typography.helper,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  savedValue: {
    ...typography.helper,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  message: {
    ...typography.helper,
    color: colors.primary,
  },
});
