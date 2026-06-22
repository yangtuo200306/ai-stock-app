import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { WatchlistStackParamList } from '../types';
import WatchlistScreen from '../screens/WatchlistScreen';
import TaskStatusScreen from '../screens/TaskStatusScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';

const Stack = createNativeStackNavigator<WatchlistStackParamList>();

export default function WatchlistStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Watchlist"
        component={WatchlistScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="TaskStatus"
        component={TaskStatusScreen}
        options={{ title: '任务状态' }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: '分析报告' }}
      />
    </Stack.Navigator>
  );
}
