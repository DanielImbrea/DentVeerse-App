import { Tabs } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useTabBadges } from '@mobile/hooks/useTabBadges';
import { useAuthStore } from '@mobile/stores/authStore';

export default function TabsLayout() {
  const { t } = useTranslation();
  const userId = useAuthStore((s) => s.userId);
  const { notificationCount, messageCount } = useTabBadges(userId);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#0F6B66',
        tabBarInactiveTintColor: '#6B6F76',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E6E3DF',
          paddingTop: 6,
          height: 88,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginBottom: 8 },
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: t('tab.home', { ns: 'navigation' }),
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="discover/index"
        options={{
          title: t('tab.discover', { ns: 'navigation' }),
          tabBarIcon: ({ color, size }) => <Ionicons name="search-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen name="discover/map" options={{ href: null }} />
      <Tabs.Screen
        name="opportunities/index"
        options={{
          title: t('tab.opportunities', { ns: 'navigation' }),
          tabBarIcon: ({ color, size }) => <Ionicons name="briefcase-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages/index"
        options={{
          title: t('tab.messages', { ns: 'navigation' }),
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-outline" size={size} color={color} />,
          tabBarBadge: messageCount > 0 ? messageCount : undefined,
        }}
      />
      <Tabs.Screen
        name="notifications/index"
        options={{
          title: t('tab.notifications', { ns: 'navigation' }),
          tabBarIcon: ({ color, size }) => <Ionicons name="notifications-outline" size={size} color={color} />,
          tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: t('tab.profile', { ns: 'navigation' }),
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
