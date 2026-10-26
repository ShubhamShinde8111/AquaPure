/**
 * AquaPure — Tab Layout
 * Bottom navigation: Home, Categories, Cart, Orders, Profile
 * Follows DESIGN.md §6.1 Global Mobile Navigation with dynamic light/dark theming.
 */

import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, typography } from '@/theme';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

interface TabBarIconProps {
  focused: boolean;
  name: TabIconName;
  focusedName?: TabIconName;
  activeColor: string;
  inactiveColor: string;
}

function TabIcon({ focused, name, focusedName, activeColor, inactiveColor }: TabBarIconProps) {
  return (
    <Ionicons
      name={focused ? (focusedName ?? name) : name}
      size={24}
      color={focused ? activeColor : inactiveColor}
    />
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const bottomInset = Math.max(insets.bottom, 6);
  const tabHeight = 56 + bottomInset;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: bottomInset,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          ...typography.bodySmall,
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="home-outline"
              focusedName="home"
              activeColor={colors.primary}
              inactiveColor={colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="categories"
        options={{
          title: 'Categories',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="grid-outline"
              focusedName="grid"
              activeColor={colors.primary}
              inactiveColor={colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: 'Cart',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="cart-outline"
              focusedName="cart"
              activeColor={colors.primary}
              inactiveColor={colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="receipt-outline"
              focusedName="receipt"
              activeColor={colors.primary}
              inactiveColor={colors.textSecondary}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon
              focused={focused}
              name="person-outline"
              focusedName="person"
              activeColor={colors.primary}
              inactiveColor={colors.textSecondary}
            />
          ),
        }}
      />
    </Tabs>
  );
}
