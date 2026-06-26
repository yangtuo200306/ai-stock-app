import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { WatchlistStackParamList } from '../types';
import WatchlistScreen from '../screens/WatchlistScreen';
import TaskStatusScreen from '../screens/TaskStatusScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';

const Stack = createNativeStackNavigator<WatchlistStackParamList>();

export default function WatchlistStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="Watchlist"
        component={WatchlistScreen}
      />
      <Stack.Screen
        name="TaskStatus"
        component={TaskStatusScreen}
        options={{ headerShown: true, title: '任务状态' }}
      />
      <Stack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ headerShown: true, title: '记录详情' }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ headerShown: true, title: '分析报告' }}
      />
    </Stack.Navigator>
  );
}
