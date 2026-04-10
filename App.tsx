import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { View, ActivityIndicator, StyleSheet, Text, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

import { C, F } from './lib/theme';
import { getOnb } from './lib/storage';

import OnboardingScreen from './screens/OnboardingScreen';
import DashboardScreen from './screens/DashboardScreen';
import ProjectsScreen from './screens/ProjectsScreen';
import ProjectDetailScreen from './screens/ProjectDetailScreen';
import InventoryScreen from './screens/InventoryScreen';
import PaymentsScreen from './screens/PaymentsScreen';
import InvoicesScreen from './screens/InvoicesScreen';
import AlertsScreen from './screens/AlertsScreen';
import ScannerScreen from './screens/ScannerScreen';
import MoreScreen from './screens/MoreScreen';
import AnalyticsScreen from './screens/AnalyticsScreen';
import DeliveriesScreen from './screens/DeliveriesScreen';
import SettingsScreen from './screens/SettingsScreen';

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {error: Error | null}> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <View style={{ flex: 1, backgroundColor: '#FEE2E2', padding: 40, justifyContent: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#DC2626', marginBottom: 12 }}>App Error</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            <Text style={{ fontSize: 14, color: '#7F1D1D', lineHeight: 20 }}>{this.state.error.message}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function ProjectsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="PList" component={ProjectsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PDetail" component={ProjectDetailScreen} options={{ title: 'Project', headerStyle: { backgroundColor: C.bg }, headerTintColor: C.pri, headerShadowVisible: false }} />
    </Stack.Navigator>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dash" component={DashboardScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Alerts" component={AlertsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Scanner" component={ScannerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function MoreStack({ onReset }: { onReset: () => void }) {
  return (
    <Stack.Navigator>
      <Stack.Screen name="MoreMain" component={MoreScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ title: 'Analytics', headerStyle: { backgroundColor: C.bg }, headerTintColor: C.pri, headerShadowVisible: false }} />
      <Stack.Screen name="Deliveries" component={DeliveriesScreen} options={{ title: 'Deliveries', headerStyle: { backgroundColor: C.bg }, headerTintColor: C.pri, headerShadowVisible: false }} />
      <Stack.Screen name="SettingsDetail" options={{ title: 'Settings', headerStyle: { backgroundColor: C.bg }, headerTintColor: C.pri, headerShadowVisible: false }}>
        {(props) => <SettingsScreen {...props} onReset={onReset} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MainTabs({ onReset }: { onReset: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: C.card, borderTopWidth: 0, height: 64,
          paddingBottom: 10, paddingTop: 4, elevation: 8,
          shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 12,
        },
        tabBarActiveTintColor: C.priAccent,
        tabBarInactiveTintColor: C.text3,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, [string, string]> = {
            Home: ['grid', 'grid-outline'],
            ProjectsTab: ['business', 'business-outline'],
            Inventory: ['cube', 'cube-outline'],
            Payments: ['card', 'card-outline'],
            Invoices: ['document-text', 'document-text-outline'],
            MoreTab: ['menu', 'menu-outline'],
          };
          const [filled, outlined] = icons[route.name] || ['ellipse', 'ellipse-outline'];
          return <Ionicons name={(focused ? filled : outlined) as any} size={20} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="ProjectsTab" component={ProjectsStack} options={{ tabBarLabel: 'Projects' }} />
      <Tab.Screen name="Inventory" component={InventoryScreen} />
      <Tab.Screen name="Payments" component={PaymentsScreen} />
      <Tab.Screen name="Invoices" component={InvoicesScreen} />
      <Tab.Screen name="MoreTab" options={{ tabBarLabel: 'More' }}>
        {() => <MoreStack onReset={onReset} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    ...Ionicons.font,
    ...FontAwesome.font,
    ...MaterialIcons.font,
  });
  const [ready, setReady] = useState(false);
  const [onboarded, setOnboarded] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const val = await getOnb();
        if (mounted) { setOnboarded(val); setReady(true); }
      } catch {
        if (mounted) { setOnboarded(false); setReady(true); }
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (!fontsLoaded || !ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading BuildPro...</Text>
      </View>
    );
  }

  if (!onboarded) {
    return (
      <ErrorBoundary>
        <SafeAreaProvider>
          <StatusBar style="dark" />
          <OnboardingScreen onDone={() => setOnboarded(true)} />
        </SafeAreaProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <MainTabs onReset={() => setOnboarded(false)} />
        </NavigationContainer>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: '#F8FAFC', alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: '#64748B' },
});
