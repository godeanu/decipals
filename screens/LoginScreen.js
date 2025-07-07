// src/screens/LoginScreen.js
import React, { useContext } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView, 
  StyleSheet, 
  Image, 
  Dimensions,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const { handleLogin, isLoading } = useContext(AuthContext);
  const { isAuthenticating } = useContext(AuthContext);

  

  if (isLoading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <Image 
          source={require('../assets/decipals.png')} 
          style={{ width: 120, height: 120, marginBottom: 10 }}
          resizeMode="contain"
        />
        <View style={styles.loadingIndicator}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.overlay} />
      
      <SafeAreaView style={styles.content}>
        <View style={styles.topSection}>
          <Image 
            source={require('../assets/decipals.png')} 
            style={{ width: 120, height: 120, marginBottom: 10 }}
            resizeMode="contain"
          />
          <Text style={styles.appName}>Decipals</Text>
          <Text style={styles.tagline}>Share your daily song!</Text>
        </View>
        
        <View style={styles.bottomSection}>
          <Text style={styles.infoText}>
          Stay in the loop with friends by sharing one track every day. Discover new favorites and keep the music flowing!          </Text>
          
          <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              disabled={isAuthenticating}
            >
              {isAuthenticating ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="musical-notes" size={22} color="white" />
                  <Text style={styles.loginButtonText}>Continue with Spotify</Text>
                </>
              )}
            </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A1A', 
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', 
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  topSection: {
    alignItems: 'center',
    marginTop: height * 0.1,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  logoSmall: {
    width: 80,
    height: 80,
  },
  appName: {
    fontSize: 36,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  tagline: {
    fontSize: 18,
    color: '#e0e0e0',
    textAlign: 'center',
  },
  bottomSection: {
    marginBottom: 40,
  },
  infoText: {
    fontSize: 16,
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
    marginHorizontal: 15,
  },
  loginButton: {
    backgroundColor: '#1DB954', 
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginBottom: 20,
    margin: 15,
  },
  loginButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    margin: 9,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingIndicator: {
    marginTop: 20,
  },
  loadingText: {
    color: '#e0e0e0',
    fontSize: 16,
  },
});