// Bottom tab bar (Home, Meals, AI, Shop, Budget). Sends new users to onboarding first.
import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import { ColorValue, Platform, StyleSheet, View } from 'react-native';

import { useAppState } from '../../context/AppContext';
import { colors } from '../../theme/colors';
import { fontFamilies } from '../../theme/fonts';

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: React.ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={styles.iconWrap}>
      {focused ? <View style={styles.activeDot} /> : null}
      <Ionicons name={name} color={color} size={size} />
    </View>
  );
}

export default function TabLayout() {
  const { hasOnboarded } = useAppState();

  if (!hasOnboarded) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="home" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="restaurant" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="sparkles" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="basket" color={color} size={size} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: 'Budget',
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="wallet" color={color} size={size} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: Platform.OS === 'ios' ? 20 : 16,
    height: 66,
    backgroundColor: colors.forestDeep,
    borderRadius: 26,
    borderTopWidth: 0,
    paddingTop: 8,
    paddingBottom: 8,
    shadowColor: '#141E14',
    shadowOpacity: 0.35,
    shadowRadius: 13,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  tabLabel: {
    fontFamily: fontFamilies.monoSemiBold,
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tabItem: {
    paddingTop: 4,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeDot: {
    position: 'absolute',
    top: -11,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.maize,
  },
});
