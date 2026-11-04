import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppHeader from './AppHeader';
import AppSidebar from './AppSidebar';
import OfflineBanner from './OfflineBanner';
import { colors } from '../theme/theme';

export default function AppLayout({
  title = 'Admin Dashboard',
  navigation,
  activeRoute,
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.bgCard}
      />
      <AppHeader
        title={title}
        onMenuPress={() => setIsSidebarOpen(true)}
      />
      <OfflineBanner />
      <AppSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        navigation={navigation}
        activeRoute={activeRoute || title}
      />
      <View style={styles.body}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
  body: {
    flex: 1,
    backgroundColor: colors.bgMain,
  },
});
