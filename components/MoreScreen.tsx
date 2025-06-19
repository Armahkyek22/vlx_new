import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import React, { useState } from "react";
import useThemeStore from "../store/theme";
import * as Icons from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import MoreOptionsMenu from "./MoreOptionsMenu";

const MoreScreen = () => {
  const { themeColors, activeTheme } = useThemeStore();
  const router = useRouter();
  const [moreOptionsVisible, setMoreOptionsVisible] = useState(false);

  const ActionButton = ({ icon, label, onPress }) => (
    <TouchableOpacity
      onPress={onPress}
      style={{ 
        flex: 1, paddingVertical: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: themeColors.sectionBackground,
        borderWidth: activeTheme === "dark" ? 1 : 0,
        borderColor: "rgba(255, 255, 255, 0.1)"
      }}
    >
      {icon}
      <Text style={{ color: themeColors.primary, marginLeft: 8, fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );

  const Section = ({ title, children, showArrow = false }) => (
    <View style={{ marginBottom: 32 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={{ color: themeColors.primary, fontSize: 18, fontWeight: 'bold' }}>{title}</Text>
        {showArrow && (
          <Icons.ChevronRight size={20} color={themeColors.primary} />
        )}
      </View>
      {children}
    </View>
  );

  const HistoryItem = ({ title, subtitle }) => (
    <TouchableOpacity style={{ width: 96, marginRight: 16 }} onPress={() => console.log("History item pressed") }>
      <View style={{ width: 96, height: 96, borderRadius: 12, marginBottom: 8, backgroundColor: themeColors.sectionBackground, borderWidth: activeTheme === "dark" ? 1 : 0, borderColor: "rgba(255, 255, 255, 0.1)", alignItems: 'center', justifyContent: 'center' }}>
        <Icons.Music size={24} color={themeColors.primary} style={{ margin: 8 }} />
      </View>
      <Text style={{ color: themeColors.text, fontSize: 12, fontWeight: '500' }} numberOfLines={1}>{title}</Text>
      <Text style={{ color: activeTheme === "dark" ? "rgba(255,255,255,0.7)" : themeColors.tabIconColor, fontSize: 12 }} numberOfLines={1}>{subtitle}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 40, height: 40, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: themeColors.sectionBackground, borderWidth: activeTheme === "dark" ? 1 : 0, borderColor: "rgba(255,255,255,0.1)" }}>
            <Icons.Play size={20} color={themeColors.primary} />
          </View>
          <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold' }}>VLC</Text>
        </View>
        <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }} onPress={() => setMoreOptionsVisible(true)}>
          <Icons.MoreVertical size={24} color={themeColors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 16, backgroundColor: themeColors.background }} contentContainerStyle={{ paddingTop: 20, paddingBottom: 20 }}>
        {/* Top Actions */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 32 }}>
          <ActionButton icon={<Icons.Settings size={20} color={themeColors.primary} />} label="SETTINGS" onPress={() => router.push("/(tabs)/more/settings")} />
          <ActionButton icon={<Icons.Info size={20} color={themeColors.primary} />} label="ABOUT" onPress={() => router.push("/(tabs)/more/about")} />
        </View>

        {/* Streams Section */}
        <Section title="Streams" showArrow>
          <TouchableOpacity style={{ backgroundColor: activeTheme === "dark" ? 'transparent' : themeColors.sectionBackground, borderWidth: activeTheme === "dark" ? 1 : 0, borderColor: "rgba(255,255,255,0.2)", width: 162, height: 106, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }} onPress={() => console.log("New stream pressed") }>
            <Icons.Plus size={24} color={themeColors.primary} />
            <Text style={{ color: themeColors.text, marginTop: 8, fontSize: 16 }}>New stream</Text>
          </TouchableOpacity>
        </Section>

        {/* History Section */}
        <Section title="History" showArrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <HistoryItem title="Justin Bieber" subtitle="15.5K Views" />
            <HistoryItem title="The Weeknd" subtitle="10.2K Views" />
            <HistoryItem title="Drake" subtitle="8.7K Views" />
            <HistoryItem title="Taylor Swift" subtitle="12.3K Views" />
          </ScrollView>
        </Section>

        {/* Additional Features */}
        <Section title="Features">
          <View style={{ gap: 16 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, backgroundColor: themeColors.sectionBackground, borderWidth: activeTheme === "dark" ? 1 : 0, borderColor: "rgba(255,255,255,0.1)" }} onPress={() => console.log("Downloads pressed") }>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icons.Download size={24} color={themeColors.primary} />
                <Text style={{ color: themeColors.text, marginLeft: 12, fontWeight: '500' }}>Downloads</Text>
              </View>
              <Icons.ChevronRight size={20} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, backgroundColor: themeColors.sectionBackground, borderWidth: activeTheme === "dark" ? 1 : 0, borderColor: "rgba(255,255,255,0.1)" }} onPress={() => console.log("Network pressed") }>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icons.Wifi size={24} color={themeColors.primary} />
                <Text style={{ color: themeColors.text, marginLeft: 12, fontWeight: '500' }}>Network</Text>
              </View>
              <Icons.ChevronRight size={20} color={themeColors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderRadius: 12, backgroundColor: themeColors.sectionBackground, borderWidth: activeTheme === "dark" ? 1 : 0, borderColor: "rgba(255,255,255,0.1)" }} onPress={() => console.log("Storage pressed") }>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Icons.HardDrive size={24} color={themeColors.primary} />
                <Text style={{ color: themeColors.text, marginLeft: 12, fontWeight: '500' }}>Storage</Text>
              </View>
              <Icons.ChevronRight size={20} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </Section>
      </ScrollView>

      <MoreOptionsMenu visible={moreOptionsVisible} onClose={() => setMoreOptionsVisible(false)} />
    </SafeAreaView>
  );
};

export default MoreScreen;
