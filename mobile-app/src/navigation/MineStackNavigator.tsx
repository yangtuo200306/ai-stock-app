import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MineStackParamList } from '../types';
import MineScreen from '../screens/MineScreen';
import LoginScreen from '../screens/LoginScreen';

const Stack = createNativeStackNavigator<MineStackParamList>();

export default function MineStackNavigator() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Mine" component={MineScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login" component={LoginScreen} options={{ title: '登录 / 注册' }} />
    </Stack.Navigator>
  );
}
