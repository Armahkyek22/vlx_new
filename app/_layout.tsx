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
        tabBarActiveTintColor: '#f44bf8',
        tabBarInactiveTintColor: '#aaa',
        tabBarStyle: {  backgroundColor: 'rgba(24, 21, 31, 0.85)', // Added alpha channel for transparency
          height: 90,
          position: 'absolute',
          borderTopWidth: 0,
          shadowColor: '#f44bf8',
          shadowOffset: { width: 0, height: 0},
          shadowOpacity: 0.6,
          shadowRadius: 30,
          elevation: 3,
          borderTopLeftRadius: 0,   // Optional: Rounded top corners
          borderTopRightRadius: 0,  // Optional: Rounded top corners
          overflow: 'hidden',
          borderWidth: 0,            // Ensure no border
          paddingBottom: 0,
       
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
