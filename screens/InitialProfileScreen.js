// src/screens/InitialProfileScreen.js
import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
  Animated,
  ActivityIndicator,
  Image,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ImagePicker from 'react-native-image-crop-picker';

export default function InitialProfileScreen() {
  const navigation = useNavigation();
  const { accessToken, API_BASE_URL, userProfile, setUserProfile } = useContext(AuthContext);
  const [username, setUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const fadeAnim = new Animated.Value(1);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  const timerRef = React.useRef(null);

  const defaultProfileImage = require('../assets/default_profile2.png');

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    try {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true
      }).start();
    } catch (err) {
      console.error('Animation error:', err);
    }
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  useEffect(() => {
    if (errorMessage) {
      setErrorMessage('');
    }
    
    const isValidFormat = /^[a-zA-Z0-9_]+$/.test(username);
    setIsValid(username.trim().length >= 3 && isValidFormat);
  }, [username]);

  const handleChoosePhoto = async () => {
    try {
      const options = ['Choose from Library', 'Use Default', 'Cancel'];
      
      Alert.alert(
        'Profile Picture',
        'Choose a profile picture',
        [
          {
            text: options[0],
            onPress: () => openGallery(),
          },
          {
            text: options[1],
            onPress: () => setProfileImage(null),
          },
          {
            text: options[2],
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Error in handleChoosePhoto:', error);
    }
  };

  const openGallery = async () => {
    try {
      const imagePickerPromise = ImagePicker.openPicker({
        width: 400,
        height: 400,
        cropping: true,
        cropperCircleOverlay: true,
        compressImageQuality: 0.8,
      });
      
      const timeoutPromise = new Promise((_, reject) => {
        timerRef.current = setTimeout(() => {
          reject(new Error('Image picker timed out'));
        }, 15000); 
      });
      
      const image = await Promise.race([imagePickerPromise, timeoutPromise]);
      
      clearTimeout(timerRef.current);
      
      setProfileImage({ uri: image.path });
    } catch (error) {
      console.error('Error picking image:', error);
      clearTimeout(timerRef.current);
    }
  };


  const uploadProfilePic = async () => {
    if (!profileImage) return null; 
    
    try {
      setUploadingImage(true);
      
      const uploadTimeoutPromise = new Promise((_, reject) => {
        timerRef.current = setTimeout(() => {
          reject(new Error('Upload timed out'));
        }, 20000); 
      });
      
      const formData = new FormData();
      formData.append('image', {
        uri: profileImage.uri,
        type: 'image/jpeg',
        name: 'profile_picture.jpg',
      });

      const fetchPromise = fetch(`${API_BASE_URL}/upload-profile-pic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      
      const res = await Promise.race([fetchPromise, uploadTimeoutPromise]);
      
      clearTimeout(timerRef.current);
      
      const data = await res.json();
      
      if (res.ok) {
        return data.url;
      } else {
        console.error('Error uploading profile image:', data.error);
        return null;
      }
    } catch (error) {
      console.error('Error uploading profile image:', error);
      return null;
    } finally {
      setUploadingImage(false);
      clearTimeout(timerRef.current);
    }
  };

  const handleSaveProfile = async () => {
    setErrorMessage('');
    
    // Client-side validation
    if (username.trim() === '') {
      setErrorMessage('Username cannot be empty');
      return;
    }
    
    if (username.trim().length < 3) {
      setErrorMessage('Username must be at least 3 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      setErrorMessage('Username can only contain letters, numbers, and underscores');
      return;
    }
    
    setIsSubmitting(true);
    
    timerRef.current = setTimeout(() => {
      setIsSubmitting(false);
      setErrorMessage('Operation timed out. Please try again.');
    }, 30000); 
        
    try {
      let profilePictureUrl = null;
      if (profileImage) {
        try {
          profilePictureUrl = await uploadProfilePic();
        } catch (uploadErr) {
          console.error('Error uploading profile pic, continuing without it:', uploadErr);
        }
      }
      
      const res = await fetch(`${API_BASE_URL}/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customUsername: username.trim(),
          profilePictureUrl: profilePictureUrl,
        }),
      });
            
      const data = await res.json();
      
      clearTimeout(timerRef.current);
      
      if (res.ok) {
        setUserProfile((prev) => ({
          ...prev,
          custom_username: username.trim(),
          profile_picture_url: profilePictureUrl || prev?.profile_picture_url,
        }));
      } else {
        if (res.status === 400 && data.error?.includes('already taken')) {
          setErrorMessage('This username is already taken. Please choose another one.');
        } else if (data.error?.includes('empty')) {
          setErrorMessage('Username cannot be empty. Please enter a valid username.');
        } else {
          setErrorMessage(data.error || 'Failed to create username');
        }
      }
    } catch (err) {
      console.error('Failed to create username:', err);
      setErrorMessage('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
      clearTimeout(timerRef.current);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
           <Animated.ScrollView 
          style={{ 
            flex: 1,
            opacity: fadeAnim 
          }}
          contentContainerStyle={[
            styles.scrollContent,
            // Additional styling for iPad
            Platform.OS === 'ios' && Platform.isPad ? { minHeight: '80%' } : {}
          ]}
          showsVerticalScrollIndicator={true}
        >
            <View style={styles.header}>
              <Image 
                source={require('../assets/decipals.png')} 
                style={{ width: 90, height: 90, marginBottom: 0 }}
                resizeMode="contain"
              />
              <Text style={styles.welcomeTitle}>Welcome to Decipals!</Text>
              <Text style={styles.welcomeSubtitle}>Set up your profile.</Text>
            </View>
            
            <View style={styles.profilePicSection}>
              <TouchableOpacity 
                style={styles.profileImageContainer}
                onPress={handleChoosePhoto}
              >
                {profileImage ? (
                  <Image 
                    source={profileImage} 
                    style={styles.profileImage} 
                  />
                ) : (
                  <View style={styles.defaultProfileImage}>
                    <Image 
                      source={defaultProfileImage} 
                      style={styles.profileImage} 
                    />
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Ionicons name="camera" size={20} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.profilePicText}>Add Profile Picture (Optional)</Text>
            </View>
            
            <View style={styles.formSection}>
              <Text style={styles.inputLabel}>YOUR USERNAME</Text>
              <View style={[
                styles.inputWrapper,
                errorMessage ? styles.inputWrapperError : null
              ]}>
                <Text style={styles.inputPrefix}>@</Text>
                <TextInput
                  style={styles.input}
                  placeholder="yourusername"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                />
                {username.length > 0 && !errorMessage && (
                  <Ionicons 
                    name={isValid ? "checkmark-circle" : "alert-circle"} 
                    size={22} 
                    color={isValid ? "#1DB954" : "#FF3B30"}
                    style={styles.validationIcon}
                  />
                )}
              </View>
              
              {errorMessage ? (
                <Text style={styles.errorText}>{errorMessage}</Text>
              ) : (
                <Text style={styles.helperText}>
                  Letters, numbers, and underscores only (min 3 characters)
                </Text>
              )}
            </View>
            
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color="#666" />
              <Text style={styles.infoText}>
                Your username helps friends find you. Profile picture is optional.
              </Text>
            </View>
            
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                styles.saveButton, 
                (!isValid || isSubmitting || uploadingImage) && styles.saveButtonDisabled
              ]}
              onPress={handleSaveProfile}
              disabled={!isValid || isSubmitting || uploadingImage}
            >
              {isSubmitting || uploadingImage ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 100, 
    flexGrow: 1,
    justifyContent: 'center', 
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  // ... existing styles ...
  
  // New styles for profile image
  profilePicSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    position: 'relative',
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  defaultProfileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#1DB954',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  profilePicText: {
    fontSize: 14,
    color: '#1DB954',
    fontWeight: '500',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputWrapperError: {
    borderColor: '#FF3B30',
    backgroundColor: 'rgba(255, 59, 48, 0.05)',
  },
  inputPrefix: {
    fontSize: 18,
    color: '#888',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: 18,
    color: '#333',
    height: '100%',
  },
  validationIcon: {
    marginLeft: 12,
  },
  helperText: {
    fontSize: 13,
    color: '#888',
    marginTop: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
    fontWeight: '500',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 40,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    marginLeft: 12,
    lineHeight: 20,
  },
  buttonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    width: '100%',
    // For iPad, ensure button is always visible
    ...(Platform.OS === 'ios' && Platform.isPad ? {
      position: 'absolute',
      bottom: 40,
      left: 0,
      right: 0,
    } : {}),
  },
  saveButton: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    backgroundColor: '#a5d5b3',
    shadowOpacity: 0,
    elevation: 0,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  }
});