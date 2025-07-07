// src/screens/NotificationSettingsScreen.js
import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function NotificationSettingsScreen() {
  const navigation = useNavigation();
  const { accessToken, API_BASE_URL } = useContext(AuthContext);
  
  const [settings, setSettings] = useState({
    notification_likes: true,
    notification_comments: true,
    notification_friend_requests: true,
    notification_daily_theme: true
  });
  
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchSettings();
  }, []);
  
  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/notification-settings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      const data = await res.json();
      if (res.ok) {
        setSettings(data);
      } else {
        Alert.alert('Error', data.error || 'Failed to load notification settings');
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      Alert.alert('Error', 'Something went wrong loading settings');
    } finally {
      setLoading(false);
    }
  };
  
  const updateSetting = async (setting, value) => {
    try {
      setSettings(prev => ({
        ...prev,
        [setting]: value
      }));
      
      const res = await fetch(`${API_BASE_URL}/notification-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          [setting]: value
        }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to update setting');
        setSettings(prev => ({
          ...prev,
          [setting]: !value
        }));
      }
    } catch (error) {
      console.error('Error updating notification setting:', error);
      Alert.alert('Error', 'Failed to update setting');
      setSettings(prev => ({
        ...prev,
        [setting]: !value
      }));
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.settingsContainer}>
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Likes</Text>
          <Switch
            value={settings.notification_likes}
            onValueChange={(value) => updateSetting('notification_likes', value)}
            trackColor={{ false: "#767577", true: "#1DB954" }}
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Comments</Text>
          <Switch
            value={settings.notification_comments}
            onValueChange={(value) => updateSetting('notification_comments', value)}
            trackColor={{ false: "#767577", true: "#1DB954" }}
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Friend Requests</Text>
          <Switch
            value={settings.notification_friend_requests}
            onValueChange={(value) => updateSetting('notification_friend_requests', value)}
            trackColor={{ false: "#767577", true: "#1DB954" }}
          />
        </View>
        
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>Daily Music Theme</Text>
          <Switch
            value={settings.notification_daily_theme}
            onValueChange={(value) => updateSetting('notification_daily_theme', value)}
            trackColor={{ false: "#767577", true: "#1DB954" }}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  settingsContainer: {
    padding: 20,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingLabel: {
    fontSize: 16,
    color: '#333',
  },
});