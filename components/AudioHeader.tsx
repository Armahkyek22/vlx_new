import * as Icons from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import useThemeStore from '../store/theme';
import useAudioControlStore from '../store/useAudioControl';


const AudioHeader = () => {
  const { themeColors } = useThemeStore();
  const { previous, playlist } = useAudioControlStore();

  const headIcons = [
    {
      name: Icons.Search,
      onPress: () => router.push('/tabs/search'), // Navigate to search screen
    },
    {
      name: Icons.History,
      onPress: async () => {
        if (playlist.length > 0) {
          await previous();
        }
      },
    },
    {
      name: Icons.EllipsisVertical,
      onPress: () => {
        console.log('More options');
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.title, { color: themeColors.text }]}>Music</Text>
      <View style={styles.iconsContainer}>
        {headIcons.map((icon, index) => (
          <TouchableOpacity
            key={index}
            onPress={icon.onPress}
            activeOpacity={0.7}
            style={styles.iconButton}
          >
            <icon.name size={22} color={themeColors.text} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  iconsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '30%',
  },
  iconButton: {
    padding: 5,
  },
});

export default AudioHeader;