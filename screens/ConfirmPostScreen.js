// src/screens/ConfirmPostScreen.js
import React, { useState, useContext } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FeedContext } from '../context/FeedContext';
import { CommonActions } from '@react-navigation/native';


export default function ConfirmPostScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { track } = route.params;
  const { accessToken, API_BASE_URL } = useContext(AuthContext);
  const { unlockFeed } = useContext(FeedContext);

  
  const [note, setNote] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  
  const handlePost = async () => {
    if (isPosting) return;
    setIsPosting(true);
    
    try {
      console.log("Starting to post song:", track.name);
      
      const res = await fetch(`${API_BASE_URL}/daily-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          song_name: track.name,
          artist_name: track.artists[0]?.name || '',
          spotify_track_id: track.id,
          album_image_url: track.album.images[0]?.url || '',
          spotify_url: track.external_urls?.spotify || '',
          note: note.trim() 
        }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        console.log("Post successful, unlocking feed");
        unlockFeed();

        
        Alert.alert(
          'Success', 
          'Song posted successfully!', 
          [
            {
              text: 'OK',
              onPress: () => {
                console.log("User acknowledged post, unlocking feed");
                
                
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'Main' }],
                  })
                );
              }
            }
          ],
          { cancelable: false } 
        );
      } else {
        console.log("Post failed:", data.message || data.error);
        Alert.alert('Error', data.message || data.error || 'Error posting song');
      }
    } catch (err) {
      console.error('Error posting song:', err);
      Alert.alert('Error', 'Something went wrong while posting the song.');
    } finally {
      setIsPosting(false);
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Confirm Your Post</Text>
            <View style={{ width: 24 }} />
          </View>
          
          <View style={styles.trackCard}>
            <Image 
              source={{ uri: track.album.images[0]?.url }} 
              style={styles.albumCover} 
            />
            <View style={styles.trackInfo}>
              <Text style={styles.trackName} numberOfLines={2}>{track.name}</Text>
              <Text style={styles.artistName} numberOfLines={1}>{track.artists[0]?.name}</Text>
            </View>
          </View>
          
          <View style={styles.noteSection}>
            <Text style={styles.sectionTitle}>Add a Note (Optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="What's on your mind about this track?"
              placeholderTextColor="#999"
              multiline
              maxLength={280}
              value={note}
              onChangeText={setNote}
            />
            <Text style={styles.charCount}>{note.length}/280</Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.postButton, isPosting && styles.postingButton]}
            onPress={handlePost}
            disabled={isPosting}
          >
            <Text style={styles.postButtonText}>
              {isPosting ? 'Posting...' : 'Share Today\'s Track'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    flexGrow: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  trackCard: {
    flexDirection: 'row',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  albumCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 16,
  },
  trackName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 16,
    color: '#666',
  },
  noteSection: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 16,
    minHeight: 120,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 8,
  },
  postButton: {
    backgroundColor: '#1DB954',
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postingButton: {
    opacity: 0.7,
  },
  postButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});