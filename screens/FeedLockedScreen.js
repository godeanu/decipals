// src/screens/FeedLockedScreen.js
import React, { useContext } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { AuthContext } from '../context/AuthContext';
import { FeedContext } from '../context/FeedContext';

export default function FeedLockedScreen() {
  const navigation = useNavigation();
  const { handleLogout } = useContext(AuthContext);
  const { currentTheme } = useContext(FeedContext); 

  
  
  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: handleLogout }
      ]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={confirmLogout}
          >
            <Ionicons name="log-out-outline" size={24} color="#FF3B30" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Your Feed</Text>
          
          <View style={{width: 24}} />
        </View>
      </View>
      
      <View style={styles.lockedContainer}>
        <View style={styles.lockIconContainer}>
          <Ionicons name="lock-closed" size={50} color="#1DB954" />
        </View>
        <Text style={styles.lockTitle}>Feed Locked</Text>
        <Text style={styles.lockMessage}>
          Post your daily song to see what your friends are sharing today!
        </Text>
        
        {currentTheme && (
          <View style={styles.themeContainer}>
            <Text style={styles.themeLabel}>Today's Theme:</Text>
            <Text style={styles.themeTitle}>{currentTheme.title}</Text>
            {currentTheme.description && (
              <Text style={styles.themeDescription}>{currentTheme.description}</Text>
            )}
          </View>
        )}
        <Image 
          source={require('../assets/decipals.png')} 
          style={styles.logoImage} 
          resizeMode="contain"
        />
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => {
            console.log("Navigating to SearchTrack from FeedLocked");
            navigation.push('SearchTrack');
          }}
        >
          <Text style={styles.actionButtonText}>Post Your Daily Song</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingTop: 7,
    paddingBottom: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  logoutButton: {
    padding: 8,
    alignSelf: 'flex-start', 
  },
  lockedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  lockIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  lockTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  lockMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  placeholderImage: {
    width: 200,
    height: 200,
    opacity: 0.5,
    marginBottom: 30,
  },
  actionButton: {
    backgroundColor: '#1DB954',
    padding: 14,
    borderRadius: 24,
    alignItems: 'center',
    width: '96%',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 18,
  },
  themeContainer: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    alignItems: 'center',
    width: '90%',
    borderWidth: 1,
    borderColor: 'rgba(29, 185, 84, 0.3)',
  },
  themeLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  themeDescription: {
    fontSize: 14,
    color: '#444',
    textAlign: 'center',
  },
  logoImage: {
    width: 150,  
    height: 150, 
    marginBottom: 30,
  },
});