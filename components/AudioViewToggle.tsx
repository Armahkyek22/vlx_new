import React, { useMemo, useCallback } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import * as Icon from "lucide-react-native";
import useThemeStore from "../store/theme";

const AudioViewToggle = ({ activePage = 0, scrollTo, setIndex }) => {
  const { themeColors } = useThemeStore();

  const tags = useMemo(
    () => [
      { Icon: Icon.LayoutGrid, name: 'Albums' },
      { Icon: Icon.ListVideo, name: 'Tracks' },
      { Icon: Icon.Disc3, name: 'Artists' },
      { Icon: Icon.SquareUserRound, name: 'Genres' },
      { Icon: Icon.Heart, name: 'Favorites' },
    ],
    []
  );

  const handlePress = useCallback(
    (index) => {
      setIndex(index);
      scrollTo(index);
    },
    [setIndex, scrollTo]
  );

  return (
    <View style={styles.container}>
      {tags.map(({ Icon }, index) => {
        const isActive = activePage === index;
        const iconColor = isActive ? themeColors.primary : themeColors.text;

        return (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => handlePress(index)}
            style={[
              styles.buttonContainer,
              { backgroundColor: isActive ? "#1e1e1e" : "transparent" },
            ]}
          >
            <Icon size={24} color={iconColor} />
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#282828",
    flexDirection: "row",
    padding: 5,
    justifyContent: "space-between",
    width: "95%",
    alignSelf: 'center',
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
});

export default React.memo(AudioViewToggle);
