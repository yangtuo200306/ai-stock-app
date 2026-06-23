import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

const BACKEND_URL_STORAGE_KEY = 'backendUrl';

export default function MineScreen() {
  const [backendUrl, setBackendUrl] = useState('');
  const [savedBackendUrl, setSavedBackendUrl] = useState('');
  const [message, setMessage] = useState('暂未操作');

  useEffect(() => {
    const loadSavedBackendUrl = async () => {
      const storedBackendUrl = await AsyncStorage.getItem(BACKEND_URL_STORAGE_KEY);

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

    await AsyncStorage.setItem(BACKEND_URL_STORAGE_KEY, backendUrl);
    setSavedBackendUrl(backendUrl);
    setMessage('地址已保存');
  };

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
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>我的</Text>
        <Text style={styles.description}>个人中心能力后续开放</Text>
        <Text style={styles.placeholder}>登录 / 注册：后续开放</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>应用信息</Text>
          <Text style={styles.infoText}>当前版本：v0.2</Text>
          <Text style={styles.infoText}>当前能力：基础分析增强版</Text>
          <Text style={styles.infoText}>当前阶段：问股最小版 / 我的页基础整理</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>后端地址配置</Text>

          <TextInput
            style={styles.input}
            value={backendUrl}
            onChangeText={setBackendUrl}
            placeholder="http://127.0.0.1:8000"
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
          />

          <Text style={styles.example}>示例：http://127.0.0.1:8000</Text>

          <Pressable style={styles.primaryButton} onPress={handleSave}>
            <Text style={styles.primaryButtonText}>保存地址</Text>
          </Pressable>

          <Pressable style={styles.secondaryButton} onPress={handleTestConnection}>
            <Text style={styles.secondaryButtonText}>测试连接</Text>
          </Pressable>

          <Text style={styles.currentValue}>当前输入：{backendUrl || '暂未输入'}</Text>
          <Text style={styles.savedValue}>已保存地址：{savedBackendUrl || '暂未保存'}</Text>
          <Text style={styles.message}>操作提示：{message}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholder: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0f172a',
    marginBottom: 8,
  },
  example: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#e0f2fe',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryButtonText: {
    color: '#0369a1',
    fontSize: 16,
    fontWeight: '700',
  },
  currentValue: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  savedValue: {
    fontSize: 14,
    color: '#334155',
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: '#2563eb',
  },
});
