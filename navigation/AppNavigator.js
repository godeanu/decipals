// src/navigation/AppNavigator.js with direct state handling for navigation issues
import React, { useContext, useEffect, useState, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LoginScreen from '../screens/LoginScreen';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchTrackScreen from '../screens/SearchTrackScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import CommentsScreen from '../screens/CommentsScreen';
import CombinedFriendsScreen from '../screens/CombinedFriendsScreen';
import InitialProfileScreen from '../screens/InitialProfileScreen';
import SplashScreen from '../screens/SplashScreen';
import ManageTopTracksScreen from '../screens/ManageTopTracksScreen';
import UserProfileScreen from '../screens/UserProfileScreen';
import ConfirmPostScreen from '../screens/ConfirmPostScreen';
import NotificationSettingsScreen from '../screens/NotificationSettingsScreen';
import { FeedContext } from '../context/FeedContext';
import FeedLockedScreen from '../screens/FeedLockedScreen';
import AdminThemeScreen from '../screens/AdminThemeScreen';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CommonActions } from '@react-navigation/native';


const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const FeedStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="FeedMain" component={FeedScreen} />
    <Stack.Screen name="SearchTrack" component={SearchTrackScreen} />
    <Stack.Screen name="Comments" component={CommentsScreen} />
    <Stack.Screen name="ConfirmPost" component={ConfirmPostScreen} options={{ headerShown: false }} />
  </Stack.Navigator>
);

const ProfileStack = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen 
      name="ProfileMain" 
      component={ProfileScreen}
    />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="ManageTopTracks" component={ManageTopTracksScreen} />
  </Stack.Navigator>
);

// Main tab navigator
const MainTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;

        if (route.name === 'Home') {
          iconName = focused ? 'home' : 'home-outline';
        } else if (route.name === 'Friends') {
          iconName = focused ? 'people' : 'people-outline';
        } else if (route.name === 'Profile') {
          iconName = focused ? 'person' : 'person-outline';
        }

        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: '#1DB954', 
      tabBarInactiveTintColor: 'gray',
      headerShown: false
    })}
  >
    <Tab.Screen name="Home" component={FeedStack} />
    <Tab.Screen name="Friends" component={CombinedFriendsScreen} />
    <Tab.Screen 
      name="Profile" 
      component={ProfileStack}
      options={{
        tabBarIcon: ({ focused, color, size }) => {
          return <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />;
        },
        unmountOnBlur: false
      }}
    />
  </Tab.Navigator>
);

const clearNavigationStateIfFreshInstall = async () => {
  try {
    const hasRunBefore = await AsyncStorage.getItem('APP_HAS_RUN_BEFORE');
    
    if (!hasRunBefore) {
      console.log('Fresh install detected, clearing navigation state');
      await AsyncStorage.removeItem('NAVIGATION_STATE');
      
      await AsyncStorage.setItem('APP_HAS_RUN_BEFORE', 'true');
    }
  } catch (error) {
    console.error('Error checking/clearing navigation state:', error);
  }
};

export default function AppNavigator() {
  const { isLoading, accessToken, userProfile, initializing } = useContext(AuthContext);
  const { feedLocked, checkingLockStatus, checkFeedLockStatus } = useContext(FeedContext);
  const [showLoading, setShowLoading] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(null);
  const [navigationReady, setNavigationReady] = useState(false);
  
  // Reference to track whether this is the first render
  const isFirstRender = useRef(true);
  const navigationResetDone = useRef(false);
  
  // Debug log to help identify state combinations
  useEffect(() => {
    console.log("App navigation state:", { 
      isLoading, 
      initializing,
      accessToken: !!accessToken,
      profile: !!userProfile?.custom_username,
      checkingLockStatus,
      feedLocked,
      navigationReady,
      isFirstRender: isFirstRender.current
    });
    
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
  }, [isLoading, initializing, accessToken, userProfile, checkingLockStatus, feedLocked, navigationReady]);

  // Run clear navigation state on first launch
  useEffect(() => {
    clearNavigationStateIfFreshInstall();
  }, []);

  // Critical fix: If we've just created a profile, ensure we check feed lock status
  useEffect(() => {
    if (userProfile?.custom_username && accessToken) {
      // Check feed lock status after profile is set up
      checkFeedLockStatus();
    }
  }, [userProfile?.custom_username, accessToken]);

  // Safety timeout - don't show loading screen forever
  useEffect(() => {
    if (isLoading || initializing) {
      // If still loading after 8 seconds, force continue
      const timeout = setTimeout(() => {
        console.log("Loading timeout triggered - forcing navigation");
        setShowLoading(false);
      }, 8000);
      
      setLoadingTimeout(timeout);
      setShowLoading(true);
    } else {
      setShowLoading(false);
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    }
    
    return () => {
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [isLoading, initializing]);

  // Show splash while loading, but with timeout protection
  if (showLoading) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
      </Stack.Navigator>
    );
  }
  
  // No token - show login
  if (!accessToken) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
    );
  }
  
  // Has token but no profile - show profile setup
  if (accessToken && !userProfile?.custom_username) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="InitialProfile" component={InitialProfileScreen} />
      </Stack.Navigator>
    );
  }
  
  // UNIFIED APPROACH: Use a single navigator with conditionally rendered initial screen
  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }}
      initialRouteName={feedLocked ? "FeedLocked" : "Main"}
    >
      {/* Conditional initial route based on feedLocked state */}
      {feedLocked ? (
        <Stack.Screen name="FeedLocked" component={FeedLockedScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainTabs} />
      )}
      
      {/* Common screens accessible from both locked and unlocked states */}
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
      <Stack.Screen name="SearchTrack" component={SearchTrackScreen} />
      <Stack.Screen name="ConfirmPost" component={ConfirmPostScreen} />
      <Stack.Screen name="Comments" component={CommentsScreen} />
      <Stack.Screen name="AdminTheme" component={AdminThemeScreen} />
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} />
    </Stack.Navigator>
  );
}