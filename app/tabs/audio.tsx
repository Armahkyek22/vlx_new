import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, SafeAreaView, StyleSheet, View } from 'react-native';
import useThemeStore from '../../store/theme';
import useAudioStore from '../../store/useAudioStore';

// Import Components
import AudioHeader from '../../components/AudioHeader';
import AudioViewToggle from '../../components/AudioViewToggle';

// Import Views
import FavouritesView from '../../components/views/FavouritesView';
import PlaceholderView from '../../components/views/PlaceholderView';
import TracksView from '../../components/views/TracksView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const pages = [
  { key: 'albums', component: () => <PlaceholderView title="Albums" /> },
  { key: 'tracks', component: TracksView },
  { key: 'artists', component: () => <PlaceholderView title="Artists" /> },
  { key: 'genres', component: () => <PlaceholderView title="Genres" /> },
  { key: 'favourites', component: FavouritesView },
];

export default function AudioTab() {
  const { themeColors } = useThemeStore();
  const { getPermissions, loadAudioFiles, loadFavourites } = useAudioStore();
  const [activeIndex, setActiveIndex] = useState(1); // Default to Tracks view
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const initialize = async () => {
      const hasPermission = await getPermissions();
      if (hasPermission) {
        await loadAudioFiles();
      }
      await loadFavourites();
    };
    initialize();
  }, [getPermissions, loadAudioFiles, loadFavourites]);

  const scrollTo = useCallback((index: number) => {
    flatListRef.current?.scrollToIndex({ animated: true, index });
  }, []);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems.length > 0 && viewableItems[0].index !== null) {
      setActiveIndex(viewableItems[0].index!);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <AudioHeader />
      <AudioViewToggle
        activePage={activeIndex}
        setIndex={setActiveIndex}
        scrollTo={scrollTo}
      />
      <FlatList
        ref={flatListRef}
        data={pages}
        renderItem={({ item }) => <View style={styles.pageContainer}>{React.createElement(item.component)}</View>}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        initialScrollIndex={1} // Start on Tracks view
        getItemLayout={(data, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pageContainer: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});