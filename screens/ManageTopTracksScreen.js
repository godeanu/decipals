// src/screens/ManageTopTracksScreen.js
import React, { useState, useContext, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';


export default function ManageTopTracksScreen() {
  const navigation = useNavigation();
  const { accessToken, API_BASE_URL } = useContext(AuthContext);
  
  const [spotifyTracks, setSpotifyTracks] = useState([]);
  const [selectedTracks, setSelectedTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadData();
  }, []);
  
  const loadData = async () => {
    setLoading(true);
    
    try {
      console.log('Fetching Spotify tracks...');
      let savedSpotifyIds = [];
      
      try {
        console.log('Attempting to fetch user saved tracks...');
        const savedRes = await fetch(`${API_BASE_URL}/user/me/top-tracks`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        
        if (savedRes.ok) {
          const savedData = await savedRes.json();
          console.log(`Found ${Array.isArray(savedData) ? savedData.length : 0} saved tracks`);
          
          savedSpotifyIds = Array.isArray(savedData) 
            ? savedData.map(track => track.spotify_track_id)
            : [];
          
          console.log('Saved Spotify IDs:', savedSpotifyIds);
        } else {
          console.log('No saved tracks found or error occurred, continuing with empty selection');
        }
      } catch (savedError) {
        console.error('Error fetching saved tracks, continuing anyway:', savedError);
      }
      
      const spotifyRes = await fetch(`${API_BASE_URL}/spotify/top-tracks`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!spotifyRes.ok) {
        throw new Error(`Error fetching Spotify tracks: ${spotifyRes.status}`);
      }
      
      const spotifyData = await spotifyRes.json();
      
      if (!spotifyData.tracks || !Array.isArray(spotifyData.tracks)) {
        throw new Error('Invalid Spotify tracks data format');
      }
      
      console.log(`Found ${spotifyData.tracks.length} Spotify tracks`);
      
      const preSelectedIds = [];
      
      if (savedSpotifyIds.length > 0) {
        spotifyData.tracks.forEach(track => {
          if (savedSpotifyIds.includes(track.id)) {
            console.log(`Track "${track.name}" is pre-selected`);
            preSelectedIds.push(track.id);
          }
        });
      }
      
      console.log(`Pre-selected ${preSelectedIds.length} tracks`);
      
      setSpotifyTracks(spotifyData.tracks);
      setSelectedTracks(preSelectedIds);
      
    } catch (error) {
      console.error('Error loading Spotify tracks:', error.message);
      Alert.alert('Error', 'Failed to load track data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const toggleTrack = (trackId) => {
    setSelectedTracks(prev => {
      if (prev.includes(trackId)) {
        console.log(`Deselected track: ${trackId}`);
        return prev.filter(id => id !== trackId);
      } else {
        if (prev.length >= 10) {
          Alert.alert('Limit Reached', 'You can only select up to 10 tracks');
          return prev;
        }
        console.log(`Selected track: ${trackId}`);
        return [...prev, trackId];
      }
    });
  };
  
  const saveTopTracks = async () => {
    try {
      console.log('Deleting existing top tracks...');
      const deleteRes = await fetch(`${API_BASE_URL}/top-tracks/all`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (!deleteRes.ok) {
        const errorData = await deleteRes.json();
        throw new Error(errorData.error || 'Failed to clear existing tracks');
      }
      
      console.log(`Saving ${selectedTracks.length} new tracks...`);
      
      for (let i = 0; i < selectedTracks.length; i++) {
        const trackId = selectedTracks[i];
        const track = spotifyTracks.find(t => t.id === trackId);
        
        if (!track) {
          console.error(`Could not find track with ID: ${trackId}`);
          continue;
        }
        
        console.log(`Saving track ${i+1}/${selectedTracks.length}: ${track.name}`);
        
        const trackData = {
          trackName: track.name,
          artistName: track.artist,
          albumImageUrl: track.album_image,
          spotifyTrackId: track.id,
          displayOrder: i
        };
        
        const res = await fetch(`${API_BASE_URL}/top-tracks`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`
          },
          body: JSON.stringify(trackData)
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          console.error(`Error saving track ${track.name}:`, errorData);
          throw new Error(errorData.error || `Failed to save track ${track.name}`);
        }
      }
      
      console.log('All tracks saved successfully');
      Alert.alert('Success', 'Your top tracks have been updated');
      navigation.goBack();
    } catch (error) {
      console.error('Error saving top tracks:', error);
      Alert.alert('Error', error.message || 'Failed to save top tracks');
    }
  };
  
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Top Tracks This Month</Text>
        <TouchableOpacity onPress={saveTopTracks}>
          <Text style={[styles.headerButton, styles.saveButton]}>Save</Text>
        </TouchableOpacity>
      </View>
      
      <Text style={styles.helpText}>
        Select up to 10 of your most listened tracks to display on your profile
      </Text>
      
      <Text style={styles.selectionCount}>
        {selectedTracks.length}/10 tracks selected
      </Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#1DB954" style={styles.loader} />
      ) : (
        <FlatList
          data={spotifyTracks}
          keyExtractor={item => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedTracks.includes(item.id);
            return (
              <TouchableOpacity 
                style={[styles.trackItem, isSelected && styles.selectedTrack]}
                onPress={() => toggleTrack(item.id)}
              >
                <Image 
                  source={{ uri: item.album_image }} 
                  style={styles.trackImage}
                />
                <View style={styles.trackInfo}>
                  <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.artistName} numberOfLines={1}>{item.artist}</Text>
                </View>
                <Switch
                  value={isSelected}
                  onValueChange={() => toggleTrack(item.id)}
                  trackColor={{ false: "#767577", true: "#1DB954" }}
                />
              </TouchableOpacity>
            );
          }}
        />
      )}
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
  headerButton: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButton: {
    color: '#1DB954',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  helpText: {
    textAlign: 'center',
    marginVertical: 10,
    color: '#666',
    paddingHorizontal: 20,
  },
  selectionCount: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  selectedTrack: {
    backgroundColor: 'rgba(29, 185, 84, 0.1)',
  },
  trackImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  trackInfo: {
    flex: 1,
    marginLeft: 15,
  },
  trackName: {
    fontSize: 16,
    fontWeight: '600',
  },
  artistName: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  loader: {
    marginTop: 50,
  },
});