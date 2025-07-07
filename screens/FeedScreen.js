// src/screens/FeedScreen.js
import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Linking,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { SafeAreaView } from 'react-native'; 
import Ionicons from 'react-native-vector-icons/Ionicons';
import EditNoteModal from '../screens/EditNoteModal';
import { FeedContext } from '../context/FeedContext';


export default function FeedScreen() {
  const { accessToken, API_BASE_URL, handleLogout, userProfile } = useContext(AuthContext);

  const profilePicUrl = userProfile?.profile_picture_url || 'https://placehold.co/40x40';
  const [feedPosts, setFeedPosts] = useState([]);
  const navigation = useNavigation();
  const [feedLocked, setFeedLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState('');
  const [editNoteModalVisible, setEditNoteModalVisible] = useState(false);
  const [currentEditPostId, setCurrentEditPostId] = useState(null);
  const [currentEditNote, setCurrentEditNote] = useState('');
  const { checkFeedLockStatus, forceLock } = useContext(FeedContext);

  const showEditNoteModal = (postId, note) => {
    setCurrentEditPostId(postId);
    setCurrentEditNote(note);
    setEditNoteModalVisible(true);
  };
  
  const fetchFeedPosts = async () => {
    try {
      if (!accessToken) {
        console.log('No access token available, skipping feed fetch');
        return;
      }

      const res = await fetch(`${API_BASE_URL}/feed`, { 
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await res.json();
      
      if (data.locked) {
        setFeedLocked(true);
        setLockMessage(data.message);
        setFeedPosts([]);
        console.log('[feed screen] Feed is locked:', data.message);
      } else if (Array.isArray(data)) {
        setFeedLocked(false);
        setFeedPosts(data);
      } else {
        console.error('Feed error:', data.error);
      }
    } catch (err) {
      console.error('Error fetching feed:', err);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (userProfile) {
        fetchFeedPosts();
      }
    }, [userProfile])
  );

  const handleToggleLike = async (postId) => {
    try {
      if (!accessToken) return;
      
      const res = await fetch(`${API_BASE_URL}/toggle-like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ postId }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchFeedPosts();
      } else {
        Alert.alert('Error', data.error || 'Failed to toggle like');
      }
    } catch (error) {
      console.error('Toggle like error:', error);
      Alert.alert('Error', 'Something went wrong toggling like');
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      if (!accessToken) return;
      
      const res = await fetch(`${API_BASE_URL}/daily-post/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        if (data.feedLocked) {
          console.log('Post deleted - feed should be locked now');
          
          Alert.alert(
            'Post Deleted', 
            'Your post has been deleted and the feed is now locked.',
            [
              {
                text: 'OK',
                onPress: () => {
                  console.log("User acknowledged post deletion, forcing lock");
                  forceLock();
                }
              }
            ],
            { cancelable: false } 
          );
        } else {
          fetchFeedPosts();
          Alert.alert('Success', 'Post deleted successfully');
        }
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to delete post');
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const handleOpenSpotify = (trackId, fallbackUrl) => {
    const spotifyUri = `spotify:track:${trackId}`;
    Linking.openURL(spotifyUri).catch(() => {
      Linking.openURL(fallbackUrl);
    });
  };

  const handleUpdateNote = async (updatedNote) => {
    try {
      if (!accessToken) return;
      
      const res = await fetch(`${API_BASE_URL}/daily-post/${currentEditPostId}/update-note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ note: updatedNote }),
      });
      
      if (res.ok) {
        setFeedPosts(prevPosts => 
          prevPosts.map(post => 
            post.id === currentEditPostId 
              ? { ...post, note: updatedNote } 
              : post
          )
        );
        
        setEditNoteModalVisible(false);
        Alert.alert('Success', 'Note updated successfully');
      } else {
        const data = await res.json();
        Alert.alert('Error', data.error || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      Alert.alert('Error', 'Something went wrong');
    }
  };

  const renderLockedFeed = () => (
    <View style={styles.lockedContainer}>
      <View style={styles.lockIconContainer}>
        <Ionicons name="lock-closed" size={50} color="#1DB954" />
      </View>
      <Text style={styles.lockTitle}>Feed Locked</Text>
      <Text style={styles.lockMessage}>{lockMessage}</Text>
      <Image 
        source={require('../assets/logo2.png')} 
        style={styles.placeholderImage}
        resizeMode="contain"
      />
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => navigation.navigate('SearchTrack')}
      >
        <Text style={styles.actionButtonText}>Post Your Daily Song</Text>
      </TouchableOpacity>
    </View>
  );
  
  if (!userProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Feed</Text>
        </View>
        <View style={styles.lockedContainer}>
          <Text style={styles.lockMessage}>Please log in to view your feed</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={styles.actionButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Feed</Text>
      </View>
        {feedLocked ? renderLockedFeed() : (
      <FlatList
        data={feedPosts}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.feedContent}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <TouchableOpacity 
                onPress={() => {
                  if (item.user_id === userProfile?.id) {
                    navigation.navigate('Profile');
                  } else {
                    navigation.navigate('UserProfile', { userId: item.user_id });
                  }
                }}
                style={styles.userInfo}
              >
                <Image
                  source={{ uri: item.profile_picture_url || 'https://placehold.co/40x40' }}
                  style={styles.profilePic}
                />
                <Text style={styles.postUser}>
                  {item.custom_username || item.username || `User #${item.user_id}`}
                </Text>
              </TouchableOpacity>
              
              {item.user_id === userProfile?.id && (
                <TouchableOpacity 
                  style={styles.moreOptions}
                  onPress={() => {
                    Alert.alert(
                      'Post Options',
                      'What would you like to do?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Edit Note', 
                          onPress: () => showEditNoteModal(item.id, item.note || '')
                        },
                        { 
                          text: 'Delete Post', 
                          style: 'destructive', 
                          onPress: () => {
                            Alert.alert(
                              'Delete Post',
                              'Are you sure you want to delete this post?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => handleDeletePost(item.id) }
                              ]
                            )
                          } 
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={styles.songContent}
              onPress={() => handleOpenSpotify(item.spotify_track_id, item.spotify_url)}
            >
              <Image source={{ uri: item.album_image_url }} style={styles.albumCover} />
              <View style={styles.songInfo}>
                <Text style={styles.songTitle} numberOfLines={1}>{item.song_name}</Text>
                <Text style={styles.artistName} numberOfLines={1}>{item.artist_name}</Text>
                <Text style={styles.postDate}>
                  {new Date(item.post_date).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
              </View>
            </TouchableOpacity>
            
            {item.note && item.note.trim() !== '' && (
              <TouchableOpacity 
                style={styles.noteWrapper}
                activeOpacity={0.9}
                onPress={() => {
                  if (item.note.length > 120) {
                    Alert.alert("Note", item.note);
                  }
                }}
              >
                <View style={styles.noteContainer}>
                  <Text style={styles.noteText} numberOfLines={4}>
                    {item.note}
                  </Text>
                  {item.note.length > 120 && (
                    <Text style={styles.showMoreText}>Tap to read more</Text>
                  )}
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.interactions}>
              <TouchableOpacity 
                style={styles.likeButton} 
                onPress={() => handleToggleLike(item.id)}
              >
                <Ionicons 
                  name={item.user_liked ? "heart" : "heart-outline"} 
                  size={24} 
                  color={item.user_liked ? "#ff4c4c" : "#888"} 
                />
                <Text style={styles.interactionCount}>{item.like_count}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commentButton}
                onPress={() => navigation.navigate('Comments', {
                  postId: item.id,
                  postOwnerId: item.user_id,
                })}
              >
                <Ionicons name="chatbubble-outline" size={22} color="#888" />
                <Text style={styles.commentButtonText}>Comments</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    )}

    <EditNoteModal
      visible={editNoteModalVisible}
      note={currentEditNote}
      onClose={() => setEditNoteModalVisible(false)}
      onSave={handleUpdateNote}
    />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingTop: 7,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  feedContent: {
    padding: 12,
  },
  postCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  postUser: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  deleteButton: {
    backgroundColor: '#ff4c4c',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  songContent: {
    flexDirection: 'row',
    padding: 12,
    alignItems: 'center',
  },
  albumCover: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  songInfo: {
    flex: 1,
    marginLeft: 12,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  artistName: {
    fontSize: 14,
    color: '#555',
    marginBottom: 8,
  },
  postDate: {
    fontSize: 12,
    color: '#888',
  },
  interactions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    padding: 12,
  },
  likeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  interactionCount: {
    marginLeft: 6,
    color: '#555',
    fontSize: 14,
  },
  commentButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentButtonText: {
    marginLeft: 6,
    color: '#555',
    fontSize: 14,
  },
  actionButton: {
    backgroundColor: '#1DB954',
    margin: 16,
    padding: 11,
    borderRadius: 24,
    alignItems: 'center',
    width: '88%',
    alignSelf: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  moreOptions: {
    padding: 8,
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
  noteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  noteWrapper: {
    marginTop: 5,
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  noteContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#1DB954',
    borderRadius: 8,
  },
  noteHeading: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  noteText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
    fontWeight: '400',
    marginTop: -3,
    marginBottom: -3,
  },
  showMoreText: {
    fontSize: 12,
    color: '#1DB954',
    marginTop: 4,
    fontWeight: '500',
  },
});