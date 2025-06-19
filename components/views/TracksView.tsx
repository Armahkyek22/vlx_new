import { router } from 'expo-router';
import { CircleOff, EllipsisVertical, FileX2, Music4 } from 'lucide-react-native';
import React, { useCallback, useMemo, useState } from 'react';
import {
    Image,
    RefreshControl,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import useThemeStore from '../../store/theme';
import useAudioControlStore from '../../store/useAudioControl';
import useAudioStore from '../../store/useAudioStore';
import useLayoutStore from '../../store/useLayoutStore';

export default function TracksView() {
  const { audioFiles, permissionGranted, getPermissions, loadAudioFiles } = useAudioStore();
  const { setPlaylist } = useAudioControlStore();
  const { bottomPlayerHeight } = useLayoutStore();
  const { themeColors } = useThemeStore();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    const hasPermission = await getPermissions();
    if (hasPermission) {
      await loadAudioFiles();
    }
    setRefreshing(false);
  }, [getPermissions, loadAudioFiles]);

  const formatDuration = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const groupedAudioFiles = useMemo(() => {
    if (!audioFiles.length) return [];

    const groups = audioFiles.reduce((acc, file) => {
      const firstChar = file.filename.charAt(0).toUpperCase();
      const key = /^[A-Z]$/.test(firstChar) ? firstChar : '#';
      if (!acc[key]) acc[key] = [];
      acc[key].push(file);
      return acc;
    }, {});

    return Object.keys(groups)
      .sort()
      .map((key) => ({
        title: key,
        data: groups[key],
      }));
  }, [audioFiles]);

  const handlePlayTrack = useCallback(async (track, index) => {
    // Create a playlist starting from the selected track
    const newPlaylist = audioFiles.slice(index).map(item => ({ uri: item.uri }));
    await setPlaylist(newPlaylist, 0); // Start from the first item in the new playlist
    router.push('/player');
  }, [audioFiles, setPlaylist]);

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: themeColors.card }]}
      onPress={() => handlePlayTrack(item, index)}
    >
      {item.artwork ? (
        <Image source={{ uri: item.artwork }} style={styles.artwork} />
      ) : (
        <View style={[styles.artworkPlaceholder, { backgroundColor: themeColors.background }]}>
          <Music4 size={20} color={themeColors.text} />
        </View>
      )}
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: themeColors.text }]} numberOfLines={1}>
          {item.filename.replace(/\.[^/.]+$/, '')}
        </Text>
        <Text style={styles.detail}>
          Duration: {formatDuration(item.duration)}
        </Text>
      </View>
      <TouchableOpacity style={styles.optionsContainer}>
        <EllipsisVertical size={20} color={themeColors.text} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: themeColors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: themeColors.primary }]}>{title}</Text>
    </View>
  );

  if (!permissionGranted) {
    return (
      <View style={styles.centeredContainer}>
        <CircleOff size={70} color="#444" />
        <Text style={styles.emptyText}>Media permission not granted.</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={{ color: themeColors.primary, marginTop: 15 }}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (audioFiles.length === 0) {
    return (
      <View style={styles.centeredContainer}>
        <FileX2 size={80} color="#444" />
        <Text style={styles.emptyText}>No songs found.</Text>
        <TouchableOpacity onPress={handleRefresh}>
          <Text style={{ color: themeColors.primary, marginTop: 15 }}>Tap to Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SectionList
      sections={groupedAudioFiles}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      renderSectionHeader={renderSectionHeader}
      stickySectionHeadersEnabled
      contentContainerStyle={{ paddingBottom: bottomPlayerHeight + 10 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={themeColors.primary}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  itemContainer: { flexDirection: 'row', padding: 10, width: '95%', alignSelf: 'center', marginVertical: 4, borderRadius: 10, alignItems: 'center' },
  artwork: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  artworkPlaceholder: { width: 50, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContainer: { flex: 1, justifyContent: 'center' },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 3 },
  detail: { fontSize: 12, color: '#888' },
  optionsContainer: { padding: 10 },
  sectionHeader: { padding: 10, paddingLeft: 15 },
  sectionHeaderText: { fontWeight: 'bold', fontSize: 16 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 20 },
});