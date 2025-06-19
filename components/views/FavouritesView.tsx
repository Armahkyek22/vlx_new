import { router } from 'expo-router';
import { CircleOff, HeartOff, Music4, Trash2 } from 'lucide-react-native';
import React, { useCallback } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import useThemeStore from '../../store/theme';
import useAudioControlStore from '../../store/useAudioControl';
import useAudioStore from '../../store/useAudioStore';
import useLayoutStore from '../../store/useLayoutStore';

export default function FavoritesView() {
  const { permissionGranted, musicFavourite, setFavourites, getPermissions } = useAudioStore();
  const { setPlaylist } = useAudioControlStore();
  const { bottomPlayerHeight } = useLayoutStore();
  const { themeColors } = useThemeStore();

  const handlePlayFavorite = useCallback(async (item, index) => {
    // Create a playlist of favorites starting from the selected track
    const newPlaylist = musicFavourite.slice(index).map(fav => ({ uri: fav.uri }));
    await setPlaylist(newPlaylist, 0);
    router.push('/player');
  }, [musicFavourite, setPlaylist]);

  const handleRemoveFavourite = useCallback((uri: string) => {
    const updatedFavourites = musicFavourite.filter((e) => e.uri !== uri);
    setFavourites(updatedFavourites);
  }, [musicFavourite, setFavourites]);

  const renderItem = useCallback(({ item, index }) => (
    <TouchableOpacity
      style={[styles.itemContainer, { backgroundColor: themeColors.card }]}
      onPress={() => handlePlayFavorite(item, index)}
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
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFavourite(item.uri)}
        style={styles.optionsContainer}
      >
        <Trash2 size={20} color="#ef4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handlePlayFavorite, handleRemoveFavourite, themeColors]);

  const renderEmptyState = (icon: React.ReactNode, message: string, action?: React.ReactNode) => (
    <View style={styles.centeredContainer}>
      {icon}
      <Text style={styles.emptyText}>{message}</Text>
      {action}
    </View>
  );

  if (!permissionGranted) {
    return renderEmptyState(
      <CircleOff size={70} color="#444" />,
      "Media permission not granted.",
      <TouchableOpacity onPress={getPermissions}>
        <Text style={{ color: themeColors.primary, marginTop: 15 }}>Grant Permission</Text>
      </TouchableOpacity>
    );
  }

  if (musicFavourite.length === 0) {
    return renderEmptyState(
      <HeartOff size={80} color="#444" />,
      "You haven't added any favorites yet."
    );
  }

  return (
    <FlatList
      data={musicFavourite}
      keyExtractor={(item) => item.id.toString()}
      renderItem={renderItem}
      contentContainerStyle={{ paddingBottom: bottomPlayerHeight + 10, paddingTop: 10 }}
      initialNumToRender={10}
    />
  );
}

const styles = StyleSheet.create({
  centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  itemContainer: { flexDirection: 'row', padding: 10, width: '95%', alignSelf: 'center', marginVertical: 4, borderRadius: 10, alignItems: 'center' },
  artwork: { width: 50, height: 50, borderRadius: 8, marginRight: 15 },
  artworkPlaceholder: { width: 50, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  infoContainer: { flex: 1, justifyContent: 'center' },
  title: { fontWeight: 'bold', fontSize: 16 },
  optionsContainer: { padding: 10 },
  emptyText: { fontSize: 16, color: '#999', textAlign: 'center', marginTop: 20 },
});