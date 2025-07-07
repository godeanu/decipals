// src/navigation/MainTabs.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import FeedScreen from '../screens/FeedScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FriendsScreen from '../screens/FriendsScreen';
// ^ We'll create or combine "Friends" into one screen soon

// Optional: for icons, you could import Ionicons or other icon sets
// import Ionicons from 'react-native-vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

export default function MainTabs() {
  return (
    <Tab.Navigator
      // optional screenOptions for styling
      screenOptions={{
        headerShown: false,       // we don’t want a header on each tab
        // tabBarActiveTintColor: '#1DB954', // highlight color
        // tabBarInactiveTintColor: '#666',
      }}
    >
      <Tab.Screen 
        name="FeedTab" 
        component={FeedScreen}
        options={{
          title: 'Home',
          // optional: tabBarIcon: to show an icon
        }}
      />
      <Tab.Screen 
        name="FriendsTab" 
        component={FriendsScreen}
        options={{
          title: 'Friends',
        }}
      />
      <Tab.Screen 
        name="ProfileTab" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
}
