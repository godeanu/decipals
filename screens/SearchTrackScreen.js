// src/screens/SearchTrackScreen.js
import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  StyleSheet, 
  SafeAreaView,
  Image,
  ActivityIndicator
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function SearchTrackScreen() {
  const { accessToken, API_BASE_URL } = useContext(AuthContext);
  const navigation = useNavigation();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const handleSearchTracks = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSearchError('');
    setSearchResults([]);

    try {
      const res = await fetch(`${API_BASE_URL}/search-tracks?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (data.error) {
        setSearchError(data.error);
      } else {
        setSearchResults(data.tracks || []);
      }
    } catch (error) {
      console.error('Failed to search tracks:', error);
      setSearchError('Failed to search tracks');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTrack = (track) => {
    navigation.navigate('ConfirmPost', { track });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Search Track</Text>
        
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Text style={styles.title}>Search for a Track</Text>

        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.input}
            placeholder="Song or artist name"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchTracks}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.searchButton,
            !searchQuery.trim() && styles.searchButtonDisabled
          ]} 
          onPress={handleSearchTracks}
          disabled={!searchQuery.trim() || isSearching}
        >
          {isSearching ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={styles.searchButtonText}>Search</Text>
          )}
        </TouchableOpacity>
      </View>

      {searchError ? (
        <Text style={styles.errorText}>{searchError}</Text>
      ) : (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.resultsList}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.resultItem}
              onPress={() => handleSelectTrack(item)}
              activeOpacity={0.7}
            >
              <Image 
                source={{ uri: item.album?.images[0]?.url || 'https://placehold.co/60x60/gray/white?text=No+Image' }} 
                style={styles.albumArt}
              />
              
              <View style={styles.trackInfo}>
                <Text style={styles.trackName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.artistName} numberOfLines={1}>
                  {item.artists[0]?.name || 'Unknown Artist'}
                </Text>
              </View>
              
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </TouchableOpacity>
          )}

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
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 16,
    color: '#333',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#1DB954',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  searchButtonDisabled: {
    backgroundColor: '#a5d5b3',
  },
  searchButtonText: {
    color: '#fff', 
    fontWeight: '600',
    fontSize: 16,
  },
  resultsList: {
    paddingHorizontal: 20,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  albumArt: {
    width: 50,
    height: 50,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  trackInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  trackName: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: '#666',
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 16,
  },
});