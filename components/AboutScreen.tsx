import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import React from "react";
import useThemeStore from "../store/theme";
import * as Icons from "lucide-react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

const AboutScreen = () => {
  const { themeColors, activeTheme } = useThemeStore();
  const router = useRouter();

  const showComingSoonAlert = (feature) => {
    Alert.alert(
      "Coming Soon! 🚀",
      `We're working hard to bring you this exciting feature.`,
      [{ text: "OK", style: "default" }]
    );
  };

  const InfoSection = ({ title, children }) => (
    <View style={{ marginBottom: 24 }}>
      <Text style={{ color: themeColors.primary, fontSize: 14, fontWeight: '500', paddingHorizontal: 16, paddingVertical: 8 }}>{title}</Text>
      <View style={{ backgroundColor: themeColors.sectionBackground }}>{children}</View>
    </View>
  );

  const InfoItem = ({ icon, title, description }) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
      <View style={{ width: 40 }}>{icon}</View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: themeColors.text, fontWeight: '500' }}>{title}</Text>
        {description && (
          <Text style={{ color: activeTheme === "dark" ? "rgba(255,255,255,0.7)" : themeColors.tabIconColor, fontSize: 13, marginTop: 4 }}>{description}</Text>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: "rgba(147, 51, 234, 0.1)" }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Icons.ArrowLeft size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <Text style={{ color: themeColors.text, fontSize: 18, fontWeight: 'bold', marginLeft: 16 }}>About VLC</Text>
      </View>
      <ScrollView style={{ flex: 1, backgroundColor: themeColors.background }}>
        <View style={{ marginTop: 16 }}>
          <InfoSection title="APPLICATION">
            <InfoItem icon={<Icons.Play size={24} color={themeColors.primary} />} title="VLC Media Player" description="Version 1.0.0" />
            <InfoItem icon={<Icons.Code size={24} color={themeColors.primary} />} title="Build Version" description="Latest Stable Release" />
          </InfoSection>
          <InfoSection title="LEGAL">
            <InfoItem icon={<Icons.Scale size={24} color={themeColors.primary} />} title="License" description="GNU General Public License" />
            <TouchableOpacity onPress={() => showComingSoonAlert("Privacy Policy") }>
              <InfoItem icon={<Icons.FileText size={24} color={themeColors.primary} />} title="Privacy Policy" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showComingSoonAlert("Terms of Service") }>
              <InfoItem icon={<Icons.FileTerminal size={24} color={themeColors.primary} />} title="Terms of Service" />
            </TouchableOpacity>
          </InfoSection>
          <InfoSection title="SUPPORT">
            <TouchableOpacity onPress={() => showComingSoonAlert("Help Center") }>
              <InfoItem icon={<Icons.HelpCircle size={24} color={themeColors.primary} />} title="Help Center" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => showComingSoonAlert("Feedback") }>
              <InfoItem icon={<Icons.MessageCircle size={24} color={themeColors.primary} />} title="Feedback" description="Help us improve VLC" />
            </TouchableOpacity>
          </InfoSection>
          <View style={{ padding: 16 }}>
            <Text style={{ color: activeTheme === "dark" ? "rgba(255,255,255,0.7)" : themeColors.tabIconColor, fontSize: 13, textAlign: 'center' }}>© 2025 VideoLAN. All rights reserved.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AboutScreen;
