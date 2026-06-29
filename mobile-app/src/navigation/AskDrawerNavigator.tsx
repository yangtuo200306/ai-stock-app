import { createDrawerNavigator } from '@react-navigation/drawer';
import AskScreen from '../screens/AskScreen';
import SessionDrawer from '../components/SessionDrawer';

const Drawer = createDrawerNavigator();

export default function AskDrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <SessionDrawer {...props} />}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        drawerStyle: { width: 280 },
      }}
    >
      <Drawer.Screen name="AskMain" component={AskScreen} />
    </Drawer.Navigator>
  );
}
