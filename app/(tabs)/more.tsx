import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function MoreTab() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>More Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111017', alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontSize: 20 },
});