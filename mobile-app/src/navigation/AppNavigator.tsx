import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../types';
import WatchlistStackNavigator from './WatchlistStackNavigator';
import AskScreen from '../screens/AskScreen';
import MarketScreen from '../screens/MarketScreen';
import SettingsScreen from '../screens/SettingsScreen';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="自选"
          component={WatchlistStackNavigator}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="问股" component={AskScreen} />
        <Tab.Screen name="大盘" component={MarketScreen} />
        <Tab.Screen name="设置" component={SettingsScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
