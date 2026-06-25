import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useDataRefresh } from '../contexts/DataRefreshContext';
import { AppButton } from '../components/AppButton';
import { AppCard } from '../components/AppCard';
import { colors } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';

export default function LoginScreen() {
  const navigation = useNavigation();
  const { login, register } = useAuth();
  const { notifyAllDataChanged } = useDataRefresh();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!username.trim()) {
      setError('请输入用户名');
      return;
    }

    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    setLoading(true);

    const result =
      mode === 'login'
        ? await login(username.trim(), password)
        : await register(username.trim(), password);

    if (result.success) {
      notifyAllDataChanged();
      navigation.goBack();
    } else {
      setError(result.error || '操作失败');
    }

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <AppCard style={styles.card}>
        <Text style={styles.title}>{mode === 'login' ? '登录' : '注册'}</Text>

        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="用户名"
          placeholderTextColor={colors.textSubtle}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="密码"
          placeholderTextColor={colors.textSubtle}
          secureTextEntry
        />

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="确认密码"
            placeholderTextColor={colors.textSubtle}
            secureTextEntry
          />
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <AppButton
          title={mode === 'login' ? '登录' : '注册'}
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.submitButton}
        />

        <AppButton
          title={mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
          variant="ghost"
          onPress={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        />
      </AppCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    maxWidth: 420,
  },
  title: {
    ...typography.pageTitle,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: 12,
    paddingHorizontal: spacing.buttonHorizontal,
    paddingVertical: spacing.buttonVertical,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  submitButton: {
    marginBottom: spacing.md,
  },
  errorText: {
    ...typography.helper,
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
});
