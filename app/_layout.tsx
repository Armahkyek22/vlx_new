import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from 'react-native';
import BottomPlayer from '../components/BottomPlayer';
import OnboardingScreen from '../components/onboarding';
import useThemeStore from '../store/theme';

export default function Layout() {
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);
  const { accentColor, themeColors, hydrate } = useThemeStore();
  const router = useRouter();

  useEffect(() => {
    hydrate();
    if (showOnboarding === null) {
      setShowOnboarding(true);
    }
  }, []);

  if (showOnboarding === null) return null;
  if (showOnboarding) {
    return (
      <OnboardingScreen
        onDone={() => {
          setShowOnboarding(false);
          router.push("tabs/index");
        }}
      />
    );
  }

  return (
    <View style={styles.container}>
      <Tabs
        initialRouteName="tabs/index"
        screenOptions={({ route }) => ({
          tabBarIcon: ({ color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'ellipse-outline';
            switch (route.name) {
              case 'tabs/index': iconName = 'videocam'; break;
              case 'tabs/audio': iconName = 'musical-notes'; break;
              case 'tabs/browse': iconName = 'folder'; break;
              case 'tabs/playlist': iconName = 'list'; break;
              case 'tabs/more': iconName = 'ellipsis-horizontal'; break;
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: accentColor,
          tabBarInactiveTintColor: themeColors.tabIconColor,
          tabBarStyle: {
            backgroundColor: themeColors.sectionBackground,
            height: 90,
            position: 'absolute',
            borderTopWidth: 0,
            shadowColor: accentColor,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.6,
            shadowRadius: 30,
            elevation: 3,
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            overflow: 'hidden',
            borderWidth: 0,
            paddingBottom: 0,
          },
          headerShown: false,
        })}
      >
        <Tabs.Screen name="tabs/index" options={{ title: 'Video' }} />
        <Tabs.Screen name="tabs/audio" options={{ title: 'Audio' }} />
        <Tabs.Screen name="tabs/browse" options={{ title: 'Browse' }} />
        <Tabs.Screen name="tabs/playlist" options={{ title: 'Playlists' }} />
        <Tabs.Screen name="tabs/more" options={{ title: 'More' }} />
      </Tabs>
      <BottomPlayer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});