import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
          switch (route.name) {
            case '(tabs)/index': iconName = 'videocam'; break;
            case '(tabs)/audio': iconName = 'musical-notes'; break;
            case '(tabs)/browse': iconName = 'folder'; break;
            case '(tabs)/playlist': iconName = 'list'; break;
            case '(tabs)/more': iconName = 'ellipsis-horizontal'; break;
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#F44BF8',
        tabBarInactiveTintColor: '#FFFFFF',
        tabBarStyle: { backgroundColor: '#111017' },
        headerShown: false,
      })}
    >
      <Tabs.Screen name="(tabs)/index" options={{ title: 'Video' }} />
      <Tabs.Screen name="(tabs)/audio" options={{ title: 'Audio' }} />
      <Tabs.Screen name="(tabs)/browse" options={{ title: 'Browse' }} />
      <Tabs.Screen name="(tabs)/playlist" options={{ title: 'Playlists' }} />
      <Tabs.Screen name="(tabs)/more" options={{ title: 'More' }} />
    </Tabs>
  );
}