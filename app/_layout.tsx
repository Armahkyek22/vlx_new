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
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {
          backgroundColor: '#18151f',      // Deep dark background
          borderTopWidth: 0,               // No default border
          height: 90,                      // Standard height
          // Subtle shadow for depth (optional)
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          elevation: 4,
        },
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
