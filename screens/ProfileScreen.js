// src/screens/ProfileScreen.js
import React, { useState, useContext, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
  Dimensions,
  ActivityIndicator,
  Alert,
Linking,
} from 'react-native';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';

import Ionicons from 'react-native-vector-icons/Ionicons'; 

const { width } = Dimensions.get('window');
const SONG_ITEM_WIDTH = width / 2 - 15; 

export default function ProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { userProfile, pendingCount, fetchPendingCount, handleLogout, accessToken, API_BASE_URL } = useContext(AuthContext);

  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.emptyStateText}>Please log in to view your profile</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.emptyStateButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const userId = userProfile.id; 
  const isOwnProfile = true;    

  const [profileData, setProfileData] = useState(isOwnProfile ? userProfile : null);
  const [songPosts, setSongPosts] = useState([]);
  const [topTracks, setTopTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); 
  const [adminPressCount, setAdminPressCount] = useState(0);
  const [adminModeEnabled, setAdminModeEnabled] = useState(false);

  const ADMIN_USER_IDS = [1,2]; 
  const isAdmin = ADMIN_USER_IDS.includes(userProfile.id);

  useEffect(() => {
    if (isOwnProfile) {
      fetchPendingCount();
      setProfileData(userProfile);
      fetchUserData(userProfile.id);
    } else {
      fetchUserProfile(userId);
      fetchUserData(userId);
    }
  }, [userId]);


useFocusEffect(
    useCallback(() => {
      console.log("ProfileScreen focused - refreshing data");
      
      if (isOwnProfile) {
        setProfileData(userProfile);
      }
      
      fetchUserData(userId);
      
      return () => {
      };
    }, [userProfile, userId])
  );

  const fetchUserProfile = async (uid) => {
    try {
      const res = await fetch(`${API_BASE_URL}/user/${uid}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      if (!data.error) {
        setProfileData(data);
      } else {
        Alert.alert('Error', 'Could not load user profile');
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchUserData = async (uid) => {
    setLoading(true);
    
    try {
      const postsRes = await fetch(`${API_BASE_URL}/user/${uid}/posts`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const postsData = await postsRes.json();
      if (Array.isArray(postsData)) {
        setSongPosts(postsData);
      }
      
      const tracksRes = await fetch(`${API_BASE_URL}/user/${uid}/top-tracks`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const tracksData = await tracksRes.json();

      if (Array.isArray(tracksData)) {
        setTopTracks(tracksData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSpotify = (trackId, fallbackUrl) => {
    const spotifyUri = `spotify:track:${trackId}`;
    Linking.openURL(spotifyUri).catch(() => {
      Linking.openURL(fallbackUrl || 'https://open.spotify.com');
    });
  };

  const handleToggleVisibility = async (postId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/daily-post/${postId}/toggle-visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        }
      });
      
      if (res.ok) {
        fetchUserData(userId);
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to update post');
      }
    } catch (error) {
      console.error('Error toggling post visibility:', error);
      Alert.alert('Error', 'Failed to update post visibility');
    }
  };

  if (!profileData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.profileHeader}>
          <Image 
            source={{ uri: profileData.profile_picture_url || 'https://placehold.co/100x100' }} 
            style={styles.profilePic} 
          />
          
          <View style={styles.profileInfo}>
            <Text style={styles.username}>{profileData.custom_username || profileData.username}</Text>
            {isOwnProfile && (
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => navigation.navigate('EditProfile')}
              >
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
  <View style={styles.sectionTitleContainer}>
    <Text style={styles.sectionTitle}>Top Tracks This Month</Text>
    <TouchableOpacity 
      style={styles.refreshButton}
      onPress={() => fetchUserData(userId)}
    >
      <Ionicons name="refresh-outline" size={16} color="#777" />
    </TouchableOpacity>
  </View>
  
  {isOwnProfile && (
    <TouchableOpacity 
      style={styles.sectionAction}
      onPress={() => navigation.navigate('ManageTopTracks')}
    >
      <Text style={styles.sectionActionText}>Edit</Text>
    </TouchableOpacity>
  )}
</View>
          
          {topTracks.length > 0 ? (
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.topTracksScroll}
            >
              {topTracks.map((track) => (
                <TouchableOpacity 
                  key={track.id}
                  style={styles.topTrackItem}
                  onPress={() => handleOpenSpotify(track.spotify_track_id)}
                >
                  <Image 
                    source={{ uri: track.album_image_url }} 
                    style={styles.topTrackImage} 
                  />
                  <Text style={styles.topTrackName} numberOfLines={1}>
                    {track.track_name}
                  </Text>
                  <Text style={styles.topTrackArtist} numberOfLines={1}>
                    {track.artist_name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {isOwnProfile 
                  ? "You haven't added any top tracks yet." 
                  : "This user hasn't added any top tracks yet."}
              </Text>
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('ManageTopTracks')}
                >
                  <Text style={styles.emptyStateButtonText}>Add Top Tracks</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Song History</Text>
            <View style={styles.viewToggle}>
              <TouchableOpacity 
                style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleActive]}
                onPress={() => setViewMode('grid')}
              >
                <Text style={viewMode === 'grid' ? styles.viewToggleTextActive : styles.viewToggleText}>Grid</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={viewMode === 'list' ? styles.viewToggleTextActive : styles.viewToggleText}>List</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {loading ? (
            <ActivityIndicator size="large" color="#1DB954" style={{ marginTop: 20 }} />
          ) : songPosts.length > 0 ? (
            viewMode === 'grid' ? (
              <View style={styles.gridContainer}>
                {songPosts.map((post) => (
                <View key={post.id} style={styles.gridItemContainer}>
                    <TouchableOpacity 
                    style={[
                        styles.gridItem,
                        post.hidden && isOwnProfile ? styles.hiddenGridItem : {}
                    ]}
                    onPress={() => handleOpenSpotify(post.spotify_track_id, post.spotify_url)}
                    >
                    <Image 
                        source={{ uri: post.album_image_url }} 
                        style={styles.gridItemImage} 
                    />
                    <View style={styles.gridItemInfo}>
                        <Text style={styles.gridItemDate}>
                        {new Date(post.post_date).toLocaleDateString()}
                        </Text>
                    </View>
                    </TouchableOpacity>
                    
                    {isOwnProfile && (
                    <TouchableOpacity 
                        style={styles.postOptions}
                        onPress={() => {
                        Alert.alert(
                            'Post Options',
                            'What would you like to do?',
                            [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: post.hidden ? 'Show in Profile' : 'Hide from Profile',
                                onPress: () => handleToggleVisibility(post.id)
                            }
                            ]
                        );
                        }}
                    >
                        <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
                    </TouchableOpacity>
                    )}
                    
                    {post.hidden && isOwnProfile && (
                    <View style={styles.hiddenBadge}>
                        <Text style={styles.hiddenText}>Hidden</Text>
                    </View>
                    )}
                </View>
                ))}
              </View>
            ) : (
              <View style={styles.listContainer}>
  {songPosts.map((post) => (
    <View key={post.id} style={styles.listItemContainer}>
      <TouchableOpacity 
        style={[
          styles.listItem,
          post.hidden && isOwnProfile ? styles.hiddenListItem : {}
        ]}
        onPress={() => handleOpenSpotify(post.spotify_track_id, post.spotify_url)}
      >
        <Image 
          source={{ uri: post.album_image_url }} 
          style={styles.listItemImage} 
        />
        <View style={styles.listItemInfo}>
          <Text style={styles.listItemTitle} numberOfLines={1}>
            {post.song_name}
          </Text>
          <Text style={styles.listItemArtist} numberOfLines={1}>
            {post.artist_name}
          </Text>
          <Text style={styles.listItemDate}>
            {new Date(post.post_date).toLocaleDateString()}
          </Text>
        </View>
      </TouchableOpacity>
      
      {isOwnProfile && (
        <TouchableOpacity 
          style={styles.listOptions}
          onPress={() => {
            Alert.alert(
              'Post Options',
              'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: post.hidden ? 'Show in Profile' : 'Hide from Profile',
                  onPress: () => handleToggleVisibility(post.id)
                }
              ]
            );
          }}
        >
          <Ionicons name="ellipsis-horizontal" size={16} color="#666" />
        </TouchableOpacity>
      )}
      
      {post.hidden && isOwnProfile && (
        <View style={styles.listHiddenBadge}>
          <Text style={styles.hiddenText}>Hidden</Text>
        </View>
      )}
    </View>
  ))}
</View>
            )
          ) : (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {isOwnProfile 
                  ? "You haven't shared any songs yet." 
                  : "This user hasn't shared any songs yet."}
              </Text>
              {isOwnProfile && (
                <TouchableOpacity 
                  style={styles.emptyStateButton}
                  onPress={() => navigation.navigate('SearchTrack')}
                >
                  <Text style={styles.emptyStateButtonText}>Share a Song</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={{marginTop: 20}}>
  {isAdmin && (
    <TouchableOpacity 
      onPress={() => {
        setAdminPressCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 0) {
            setAdminModeEnabled(true);
            return 0;
          }
          return newCount;
        });
      }}
      style={{padding: 10}}
    >
      {adminModeEnabled && (
        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate('AdminTheme')}
        >
          <Text style={styles.adminButtonText}>Admin Control Panel</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  )}
</View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileHeader: {
    flexDirection: 'row',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profilePic: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 20,
    justifyContent: 'center',
  },
  username: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  editButton: {
    borderWidth: 1,
    borderColor: '#1DB954',
    borderRadius: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    alignSelf: 'flex-start',
  },
  editButtonText: {
    color: '#1DB954',
    fontWeight: '500',
  },
  sectionContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  sectionAction: {
    padding: 5,
  },
  sectionActionText: {
    color: '#1DB954',
    fontWeight: '500',
  },
  topTracksScroll: {
    flexDirection: 'row',
  },
  topTrackItem: {
    width: 120,
    marginRight: 15,
  },
  topTrackImage: {
    width: 120,
    height: 120,
    borderRadius: 5,
    marginBottom: 5,
  },
  topTrackName: {
    fontWeight: '600',
    fontSize: 13,
  },
  topTrackArtist: {
    fontSize: 12,
    color: '#666',
  },
  viewToggle: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 5,
    overflow: 'hidden',
  },
  viewToggleButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  viewToggleActive: {
    backgroundColor: '#1DB954',
  },
  viewToggleText: {
    color: '#666',
  },
  viewToggleTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: SONG_ITEM_WIDTH,
    marginBottom: 15,
  },
  gridItemImage: {
    width: SONG_ITEM_WIDTH,
    height: SONG_ITEM_WIDTH,
    borderRadius: 5,
  },
  gridItemInfo: {
    padding: 5,
  },
  gridItemDate: {
    fontSize: 12,
    color: '#666',
  },
  listContainer: {
    marginTop: 5,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  listItemImage: {
    width: 60,
    height: 60,
    borderRadius: 5,
  },
  listItemInfo: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  listItemTitle: {
    fontWeight: '600',
    fontSize: 15,
  },
  listItemArtist: {
    fontSize: 13,
    color: '#666',
  },
  listItemDate: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  emptyStateContainer: {
    alignItems: 'center',
    padding: 20,
  },
  emptyStateText: {
    color: '#666',
    marginBottom: 10,
  },
  emptyStateButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ff4c4c',
    margin: 20,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  refreshButton: {
    padding: 4,
    marginLeft: 6,
  },
  gridItemContainer: {
    width: SONG_ITEM_WIDTH,
    marginBottom: 15,
    position: 'relative',
  },
  postOptions: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  hiddenGridItem: {
    opacity: 0.6,
  },
  hiddenBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    zIndex: 2,
  },
  hiddenText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  listItemContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  listOptions: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  hiddenListItem: {
    opacity: 0.6,
  },
  listHiddenBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    zIndex: 2,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#f9f9f9',
    marginTop: 10,
  },
  settingsButtonText: {
    color: '#1DB954',
    fontWeight: '600',
    marginLeft: 6,
  },
});