import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { RootTabParamList } from '../types';
import WatchlistStackNavigator from './WatchlistStackNavigator';
import ReportStackNavigator from './ReportStackNavigator';
import AskScreen from '../screens/AskScreen';
import MineScreen from '../screens/MineScreen';

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
        <Tab.Screen
          name="报告"
          component={ReportStackNavigator}
          options={{ headerShown: false }}
        />
        <Tab.Screen name="我的" component={MineScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
