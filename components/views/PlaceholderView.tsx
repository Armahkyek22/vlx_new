import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import useThemeStore from '../../store/theme';

interface PlaceholderViewProps {
  title: string;
}

const PlaceholderView: React.FC<PlaceholderViewProps> = ({ title }) => {
  const { themeColors } = useThemeStore();
  return (
    <View style={styles.container}>
      <Text style={[styles.text, { color: themeColors.text }]}>{title}</Text>
      <Text style={styles.subtext}>Coming Soon</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtext: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
});

export default PlaceholderView;