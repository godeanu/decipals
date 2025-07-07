// src/screens/EditProfileScreen.js - Hooks error fixed
import React, { useState, useContext, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import ImagePicker from 'react-native-image-crop-picker';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import DeleteAccountModal from '../components/DeleteAccountModal';

export default function EditProfileScreen() {
  const { accessToken, userProfile, setUserProfile, API_BASE_URL, handleLogout, refreshUserProfile } = useContext(AuthContext);
  const navigation = useNavigation();
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newCustomUsername, setNewCustomUsername] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [profileImage, setProfileImage] = useState('https://placehold.co/200x200');
  const [inImagePickerFlow, setInImagePickerFlow] = useState(false);
  
  const isComponentMounted = useRef(true);
  
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
    };
  }, []);
  
  useEffect(() => {
    if (userProfile) {
      setNewCustomUsername(userProfile.custom_username || '');
      if (userProfile.profile_picture_url) {
        setProfileImage(userProfile.profile_picture_url);
      }
      if (isComponentMounted.current) {
        setIsLoading(false);
      }
    } else if (isComponentMounted.current) {
      navigation.goBack();
    }
  }, [userProfile, navigation]);
  
  useEffect(() => {
    if (inImagePickerFlow) {
      const unsubscribe = navigation.addListener('beforeRemove', (e) => {
        e.preventDefault();
      });
      return unsubscribe;
    }
  }, [inImagePickerFlow, navigation]);

  const handleSaveProfile = async () => {
    if (!newCustomUsername.trim()) {
      Alert.alert('Error', 'Username cannot be empty.');
      return;
    }
    
    if (!accessToken) {
      Alert.alert('Error', 'You need to be logged in.');
      return;
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/update-profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          customUsername: newCustomUsername,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        await refreshUserProfile();
        Alert.alert('Success', data.message);
        if (userProfile) {
          setUserProfile((prev) => ({
            ...prev,
            custom_username: newCustomUsername,
          }));
        }
        navigation.goBack();
      } else {
        Alert.alert('Error', data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Something went wrong updating profile');
    }
  };

  const handleChoosePhoto = async () => {
    try {
      Alert.alert(
        'Profile Picture',
        'Choose a profile picture',
        [
          {
            text: 'Choose from Library',
            onPress: () => {
              setTimeout(() => {
                ImagePicker.openPicker({
                  width: 400,
                  height: 400,
                  cropping: true,
                  cropperCircleOverlay: true,
                  compressImageQuality: 0.8,
                })
                .then(image => {
                  if (image && image.path) {
                    const fileName = image.filename || `profile-${Date.now()}.jpg`;
                    const mimeType = image.mime || 'image/jpeg';
                    uploadProfilePic(image.path, fileName, mimeType);
                  }
                })
                .catch(pickerError => {
                  if (!pickerError?.message?.includes('User cancelled')) {
                    console.error('Error picking image:', pickerError);
                    Alert.alert('Error', 'Could not pick image');
                  }
                });
              }, 300);
            }
          },
          { 
            text: 'Cancel', 
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Photo selection error:', error);
    }
  };

  const uploadProfilePic = async (uri, fileName, mimeType) => {
    if (!accessToken) {
      Alert.alert('Error', 'You need to be logged in.');
      return;
    }
    
    try {
      const formData = new FormData();
      formData.append('image', {
        uri,
        name: fileName,
        type: mimeType,
      });
  
      const res = await fetch(`${API_BASE_URL}/upload-profile-pic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const data = await res.json();
      
      if (!isComponentMounted.current) return;
      
      if (res.ok) {
        setProfileImage(data.url);
        
        if (userProfile) {
          setUserProfile((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              profile_picture_url: data.url,
            };
          });
        }
        
        Alert.alert(
          'Success', 
          'Profile picture updated successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                if (isComponentMounted.current) {
                  navigation.goBack();
                }
              }
            }
          ]
        );
      } else {
        Alert.alert('Error', data.error || 'Upload failed');
      }
    } catch (err) {
      if (isComponentMounted.current) {
        console.error('uploadProfilePic error:', err);
        Alert.alert('Error', 'Something went wrong');
      }
    }
  };

  const confirmLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Log Out', 
          style: 'destructive', 
          onPress: async () => {
            try {
              navigation.goBack();
              
              setTimeout(() => {
                handleLogout();
              }, 300);
            } catch (error) {
              console.error('Error during logout navigation:', error);
              handleLogout();
            }
          }
        }
      ]
    );
  };
  
  
  const handleDeleteAccount = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/delete-account`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (res.ok) {
        navigation.goBack();
        
        setTimeout(() => {
          handleLogout();
          Alert.alert('Success', 'Your account has been deleted');
        }, 300);
        
        return true;
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      throw error;
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      );
    }
    
    if (!userProfile) {
      return (
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>User profile not available</Text>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSaveProfile}>
            <Text style={styles.saveButton}>Save</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content}>
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={handleChoosePhoto} style={styles.profileImageContainer}>
              <Image 
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={22} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.photoPrompt}>Tap to change profile photo</Text>
          </View>
          
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={newCustomUsername}
              onChangeText={setNewCustomUsername}
              placeholderTextColor="#999"
            />
            <Text style={styles.inputHint}>This is how other users will identify you.</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>
            
            <TouchableOpacity style={styles.optionItem} onPress={() => setShowDeleteModal(true)}>
              <Ionicons name="trash-outline" size={22} color="#ff4c4c" />
              <Text style={styles.deleteAccountText}>Delete Account</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.optionItem} onPress={confirmLogout}>
              <Ionicons name="log-out-outline" size={22} color="#ff4c4c" />
              <Text style={styles.logoutText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderContent()}
      
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onDeleteAccount={handleDeleteAccount}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    color: '#1DB954',
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  },
  photoSection: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: 'white',
    marginBottom: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraOverlay: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    backgroundColor: '#1DB954',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  photoPrompt: {
    color: '#1DB954',
    fontSize: 14,
    marginTop: 8,
  },
  inputSection: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
  },
  section: {
    backgroundColor: 'white',
    paddingVertical: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoutText: {
    color: '#ff4c4c',
    marginLeft: 12,
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteAccountText: {
    color: '#ff4c4c',
    marginLeft: 12,
    fontSize: 16,
  },
});