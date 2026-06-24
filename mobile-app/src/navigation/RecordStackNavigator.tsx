import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RecordStackParamList } from '../types';
import RecordListScreen from '../screens/RecordListScreen';
import RecordDetailScreen from '../screens/RecordDetailScreen';
import ReportDetailScreen from '../screens/ReportDetailScreen';

const Stack = createNativeStackNavigator<RecordStackParamList>();

export default function RecordStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RecordList"
        component={RecordListScreen}
        options={{ title: '记录' }}
      />
      <Stack.Screen
        name="RecordDetail"
        component={RecordDetailScreen}
        options={{ title: '记录详情' }}
      />
      <Stack.Screen
        name="ReportDetail"
        component={ReportDetailScreen}
        options={{ title: '分析报告' }}
      />
    </Stack.Navigator>
  );
}
