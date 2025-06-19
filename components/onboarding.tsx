import { LinearGradient } from "expo-linear-gradient";
import { Folder, Music, Play, Settings } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

const OnboardingScreen = ({ onDone }: { onDone?: () => void }) => {
  const { width, height } = Dimensions.get("window");

  const onboardingData = [
    {
      title: "Welcome to VLC",
      subtitle: "Next Generation Media Player",
      description: "Experience your entertainment in a whole new way",
      icon: "play",
      gradient: ["#FF00FF", "#00FFFF"],
      pattern: "diagonal",
    },
    {
      title: "Smart Library",
      subtitle: "Intelligent Organization",
      description:
        "Your media, automatically categorized and beautifully presented",
      icon: "media",
      gradient: ["#FF00FF", "#FF8C00"],
      pattern: "grid",
    },
    {
      title: "Universal Player",
      subtitle: "Play Everything",
      description: "Any format, any device, anytime - without limits",
      icon: "folder",
      gradient: ["#00FFFF", "#FF00FF"],
      pattern: "circles",
    },
    {
      title: "Ready to Begin",
      subtitle: "Your Journey Starts Now",
      description: "Dive into a world of unlimited entertainment",
      icon: "complete",
      gradient: ["#FF8C00", "#FF00FF"],
      pattern: "waves",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const slideRef = useRef<any>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: currentIndex / (onboardingData.length - 1),
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const viewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems[0]) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const scrollTo = () => {
    if (currentIndex < onboardingData.length - 1) {
      slideRef.current?.scrollToIndex({ index: currentIndex + 1 ,animated: true });
    } else {
      if (onDone) onDone();
    }
  };

  const skip = () => {
    if (onDone) onDone();
  };

  const AnimatedIcon = ({
    icon,
    size,
    isActive,
  }: {
    icon: string;
    size: number;
    isActive: boolean;
  }) => {
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (isActive) {
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            tension: 50,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.5,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, [isActive]);

    const rotate = rotateAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0deg", "360deg"],
    });

    const renderIcon = () => {
      switch (icon) {
        case "play":
          return <Play size={size} color="#FFF" />;
        case "media":
          return <Music size={size} color="#FFF" />;
        case "folder":
          return <Folder size={size} color="#FFF" />;
        case "complete":
          return <Settings size={size} color="#FFF" />;
        default:
          return null;
      }
    };

    return (
      <Animated.View
        style={[
          styles.iconWrapper,
          {
            transform: [{ scale: scaleAnim }, { rotate }],
            opacity: opacityAnim,
          },
        ]}
      >
        {renderIcon()}
      </Animated.View>
    );
  };

  const BackgroundPattern = ({
    pattern,
    colors,
  }: {
    pattern: string;
    colors: string[];
  }) => {
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: 15000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(progressAnim, {
            toValue: currentIndex / (onboardingData.length - 1),
            duration: 350,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    }, []);

    const translateX = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, width * 0.1],
    });

    const translateY = animValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0, height * 0.1],
    });

    return (
      <Animated.View
        style={[
          styles.pattern,
          {
            transform: [{ translateX }, { translateY }],
          },
        ]}
      >
        <LinearGradient
          colors={colors}
          style={[
            styles.patternGradient,
            pattern === "diagonal" && styles.diagonalPattern,
            pattern === "grid" && styles.gridPattern,
            pattern === "circles" && styles.circlesPattern,
            pattern === "waves" && styles.wavesPattern,
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>
    );
  };

  const ProgressBar = () => {
    const widthAnim = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"],
    });

    return (
      <View style={styles.progressContainer}>
        <Animated.View
          style={[
            styles.progressBar,
            {
              width: widthAnim,
            },
          ]}
        />
      </View>
    );
  };

  return (
    <>
      <View style={styles.container}>
      <Animated.FlatList
  ref={slideRef}
  data={onboardingData}
  renderItem={({ item, index }) => (
    <View style={styles.slide}>
      <BackgroundPattern
        pattern={item.pattern}
        colors={item.gradient}
      />
      <View style={styles.contentContainer}>
        <AnimatedIcon
          icon={item.icon}
          size={80}
          isActive={index === currentIndex}
        />
        <View style={styles.textContainer}>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    </View>
  )}
  horizontal
  showsHorizontalScrollIndicator={false}
  pagingEnabled
  bounces={false}
  keyExtractor={(item) => item.title}
  onScroll={Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false }
  )}
  scrollEventThrottle={16}
  onViewableItemsChanged={viewableItemsChanged}
  viewabilityConfig={viewConfig}
  initialNumToRender={1}
  removeClippedSubviews={true}
  getItemLayout={(_, index) => ({
    length: Dimensions.get("window").width,
    offset: Dimensions.get("window").width * index,
    index,
  })}
/>
        <View style={styles.bottomContainer}>
          <ProgressBar />
          <View style={styles.buttonContainer}>
            <Pressable
              style={[styles.button, styles.skipButton]}
              onPress={skip}
            >
              <Text style={styles.buttonText}>Skip</Text>
            </Pressable>
            <Pressable
              style={[styles.button, styles.nextButton]}
              onPress={scrollTo}
            >
              <LinearGradient
                colors={onboardingData[currentIndex].gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <Text style={[styles.buttonText, styles.nextButtonText]}>
                  {currentIndex === onboardingData.length - 1
                    ? "Get Started"
                    : "Next"}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    paddingTop: 0,
  },
  slide: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    alignItems: "center",
    justifyContent: "center",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 2,
  },
  pattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  patternGradient: {
    width: Dimensions.get("window").width * 2,
    height: Dimensions.get("window").height * 2,
    position: "absolute",
  },
  diagonalPattern: {
    transform: [{ rotate: "45deg" }],
  },
  gridPattern: {
    transform: [{ scale: 0.5 }],
  },
  circlesPattern: {
    borderRadius: Dimensions.get("window").width,
  },
  wavesPattern: {
    transform: [{ rotate: "30deg" }],
  },
  iconWrapper: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 40,
  },
  textContainer: {
    alignItems: "center",
    paddingHorizontal: 30,
  },
  subtitle: {
    fontSize: 18,
    color: "#FF00FF",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "600",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#CCCCCC",
    textAlign: "center",
    lineHeight: 24,
    maxWidth: "80%",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  progressContainer: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    marginBottom: 30,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#FF00FF",
    borderRadius: 2,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    minWidth: 140,
  },
  skipButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  nextButton: {
    overflow: "hidden",
  },
  gradientButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  nextButtonText: {
    color: "#FFFFFF",
  },
});

export default OnboardingScreen;