import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import { StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootTabParamList } from '../types';
import { AuthProvider } from '../contexts/AuthContext';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import WatchlistStackNavigator from './WatchlistStackNavigator';
import RecordStackNavigator from './RecordStackNavigator';
import MineStackNavigator from './MineStackNavigator';
import AskDrawerNavigator from './AskDrawerNavigator';

const Tab = createBottomTabNavigator<RootTabParamList>();

const TAB_ICONS: Record<string, string> = {
  '自选': '★',
  '问股': '?',
  '记录': '☰',
  '我的': '◎',
};

export default function AppNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <AuthProvider>
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerShown: false,
            tabBarStyle: [styles.tabBar, { height: 56 + insets.bottom, paddingBottom: insets.bottom || 6 }],
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textSubtle,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarPressOpacity: 1,
            tabBarPressColor: 'transparent',
            tabBarButton: (props) => (
              <PlatformPressable {...props} android_ripple={{ color: 'transparent' }} />
            ),
            tabBarIcon: ({ color }) => (
              <Text style={[styles.tabIcon, { color }]}>
                {TAB_ICONS[route.name] || '?'}
              </Text>
            ),
          })}
        >
          <Tab.Screen name="自选" component={WatchlistStackNavigator} />
          <Tab.Screen name="问股" component={AskDrawerNavigator} />
          <Tab.Screen name="记录" component={RecordStackNavigator} />
          <Tab.Screen name="我的" component={MineStackNavigator} />
        </Tab.Navigator>
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tabBarLabel: {
    ...typography.helper,
    fontSize: 11,
    fontWeight: '600',
  },
  tabIcon: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 24,
  },
});
