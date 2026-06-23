import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { ReportStackParamList } from '../types';
import ReportHistoryScreen from '../screens/ReportHistoryScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';

const Stack = createNativeStackNavigator<ReportStackParamList>();

export default function ReportStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ReportHistory"
        component={ReportHistoryScreen}
        options={{ title: '历史报告' }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: '分析报告' }}
      />
    </Stack.Navigator>
  );
}
