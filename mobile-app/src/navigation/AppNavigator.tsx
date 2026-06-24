import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../types';
import { AuthProvider } from '../contexts/AuthContext';
import WatchlistStackNavigator from './WatchlistStackNavigator';
import RecordStackNavigator from './RecordStackNavigator';
import MineStackNavigator from './MineStackNavigator';
import AskScreen from '../screens/AskScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Tab.Navigator>
          <Tab.Screen
            name="自选"
            component={WatchlistStackNavigator}
            options={{ headerShown: false }}
          />
          <Tab.Screen name="问股" component={AskScreen} />
          <Tab.Screen
            name="记录"
            component={RecordStackNavigator}
            options={{ headerShown: false }}
          />
          <Tab.Screen
            name="我的"
            component={MineStackNavigator}
            options={{ headerShown: false }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}
