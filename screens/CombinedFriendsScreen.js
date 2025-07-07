// src/screens/CombinedFriendsScreen.js
import React, { useState, useContext, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  Image, 
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  ActivityIndicator,
  Animated
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CombinedFriendsScreen() {
  const { accessToken, API_BASE_URL, fetchPendingCount, pendingCount } = useContext(AuthContext);
  
  const [activeTab, setActiveTab] = useState('friends');
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [foundUsers, setFoundUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [requestedUsers, setRequestedUsers] = useState({});
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = new Animated.Value(1);
  
  const navigation = useNavigation();

  useFocusEffect(
    React.useCallback(() => {
      if (activeTab === 'friends') {
        handleViewFriends();
      } else if (activeTab === 'requests') {
        handleViewPendingRequests();
      }
      
      if (activeTab === 'add') {
        setFoundUsers([]);
        setSearchQuery('');
        setHasSearched(false);
      }
    }, [activeTab])
  );

  useEffect(() => {
    fadeAnim.setValue(1);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fadeIn();
    
    if (activeTab === 'friends') {
      handleViewFriends();
    } else if (activeTab === 'requests') {
      handleViewPendingRequests();
    } else {
      setIsLoading(false);
    }
  }, [activeTab]);

  const fadeIn = () => {
    fadeAnim.setValue(1);
    
    Animated.timing(fadeAnim, {
      toValue: 0.99, 
      duration: 50,
      useNativeDriver: true
    }).start(() => {
      fadeAnim.setValue(1);
    });
  };

  const handleViewFriends = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/friends`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setFriendsList(data);
      } else {
        setErrorMessage(data.error || 'Failed to load friends');
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
      setErrorMessage('Error fetching friends');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewPendingRequests = async () => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/pending-requests`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPendingRequests(data);
        fetchPendingCount();
      } else {
        setErrorMessage(data.error || 'Failed to load pending requests');
      }
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      setErrorMessage('Error fetching pending requests');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/accept-friend-request`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ friendId: requesterId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingRequests(prev => prev.filter(req => req.requester_id !== requesterId));
        fetchPendingCount();
        handleViewFriends();
        Alert.alert('Success', data.message);
      } else {
        setErrorMessage(data.message || data.error);
      }
    } catch (error) {
      setErrorMessage('Error accepting friend request');
      console.error(error);
    }
  };

  const handleRejectRequest = async (friendRowId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/reject-friend-request`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ friendRowId }),
      });
      const data = await res.json();
      if (res.ok) {
        setPendingRequests(prev => prev.filter(req => req.friend_row_id !== friendRowId));
        fetchPendingCount();
        Alert.alert('Success', data.message);
      } else {
        setErrorMessage(data.message || data.error);
      }
    } catch (error) {
      setErrorMessage('Error rejecting friend request');
      console.error(error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setErrorMessage('');
    setHasSearched(true);
    setIsSearching(true);

    try {
      const res = await fetch(`${API_BASE_URL}/search-users?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        const processedUsers = data.map(user => ({
          ...user,
          requestSent: !!requestedUsers[user.id]
        }));
        setFoundUsers(processedUsers);
      } else {
        setFoundUsers([]);
        setErrorMessage(data.error || 'Failed to search users');
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setErrorMessage('Error searching users');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendFriendRequest = async (username, userId) => {
    setErrorMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/send-friend-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ friendUsername: username }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestedUsers(prev => ({
          ...prev,
          [userId]: true
        }));
        
        setFoundUsers(prev => 
          prev.map(user => {
            if (user.id === userId) {
              return { ...user, requestSent: true };
            }
            return user;
          })
        );
      } else {
        setErrorMessage(data.message || data.error);
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
      setErrorMessage('Error sending friend request');
    }
  };

  const handleRemoveFriend = (friend) => {
    setFriendToRemove(friend);
    setShowRemoveModal(true);
  };

  const confirmRemoveFriend = async () => {
    if (!friendToRemove) return;
    
    try {
      const res = await fetch(`${API_BASE_URL}/remove-friend`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ friendId: friendToRemove.id }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setFriendsList(prev => prev.filter(f => f.id !== friendToRemove.id));
        setShowRemoveModal(false);
        setFriendToRemove(null);
        Alert.alert('Success', 'Friend removed successfully');
      } else {
        Alert.alert('Error', data.error || 'Failed to remove friend');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
      Alert.alert('Error', 'Failed to remove friend');
    }
  };

  const renderFriendsTab = () => (
    <>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : friendsList.length > 0 ? (
        <FlatList
          data={friendsList}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <View style={styles.listItem}>
              <TouchableOpacity 
                style={styles.userInfo}
                onPress={() => navigation.navigate('UserProfile', { userId: item.id })}
                activeOpacity={0.7}
              >
                <Image
                  source={{ uri: item.profile_picture_url || 'https://placehold.co/40x40' }}
                  style={styles.profilePic}
                />
                <Text style={styles.userName}>
                  {item.custom_username || item.username || `Friend #${item.id}`}
                </Text>
              </TouchableOpacity>
              
              {/* More button for friend options */}
              <TouchableOpacity 
                style={styles.moreButton}
                onPress={() => handleRemoveFriend(item)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="people-outline" size={60} color="#ddd" />
          <Text style={styles.emptyStateText}>You don't have any friends yet</Text>
          <TouchableOpacity 
            style={styles.emptyStateButton}
            onPress={() => setActiveTab('add')}
          >
            <Text style={styles.emptyStateButtonText}>Find Friends</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  const renderRequestsTab = () => (
    <>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
        </View>
      ) : pendingRequests.length > 0 ? (
        <FlatList
          data={pendingRequests}
          keyExtractor={(item) => item.friend_row_id.toString()}
          renderItem={({ item }) => (
            <View style={styles.requestItem}>
              <Image
                source={{ uri: item.requester_profile_pic || 'https://placehold.co/40x40' }}
                style={styles.profilePic}
              />
              <View style={styles.requestInfo}>
                <Text style={styles.userName}>
                  {item.requester_custom_username || item.requester_username}
                </Text>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.acceptButton]}
                    onPress={() => handleAcceptRequest(item.requester_id)}
                  >
                    <Text style={styles.actionButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleRejectRequest(item.friend_row_id)}
                  >
                    <Text style={styles.actionButtonText}>Reject</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          contentContainerStyle={styles.listContainer}
        />
      ) : (
        <View style={styles.emptyStateContainer}>
          <Ionicons name="notifications-outline" size={60} color="#ddd" />
          <Text style={styles.emptyStateText}>No pending friend requests</Text>
        </View>
      )}
    </>
  );

  const renderAddFriendTab = () => (
    <View style={styles.addFriendContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a friend by username"
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>
      
      {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      
      <TouchableOpacity 
        style={[
          styles.searchButton,
          !searchQuery.trim() && styles.searchButtonDisabled
        ]} 
        onPress={handleSearch}
        disabled={!searchQuery.trim() || isSearching}
      >
        {isSearching ? (
          <ActivityIndicator color="white" size="small" />
        ) : (
          <Text style={styles.buttonText}>Search</Text>
        )}
      </TouchableOpacity>

      <FlatList
        data={foundUsers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.searchResultItem}>
            <Image
              source={{ uri: item.profile_picture_url || 'https://placehold.co/40x40' }}
              style={styles.profilePic}
            />
            <Text style={[styles.userName, {flex: 1}]}>
              {item.custom_username || item.username}
            </Text>
            <TouchableOpacity
              style={[
                styles.requestButton,
                item.requestSent && styles.requestedButton
              ]}
              onPress={() => handleSendFriendRequest(item.custom_username, item.id)}
              disabled={item.requestSent}
            >
              <Text style={[
                styles.requestButtonText,
                item.requestSent && styles.requestedButtonText
              ]}>
                {item.requestSent ? 'Requested' : 'Request'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          hasSearched && !isSearching ? (
            <Text style={styles.emptyText}>
              No users found matching "{searchQuery}".
            </Text>
          ) : null
        }
        contentContainerStyle={styles.searchResultsContainer}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.screenTitle}>Friends</Text>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'friends' && styles.activeTab]}
          onPress={() => setActiveTab('friends')}
        >
          <Text style={[styles.tabText, activeTab === 'friends' && styles.activeTabText]}>
            Friends
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'requests' && styles.activeTab]}
          onPress={() => setActiveTab('requests')}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, activeTab === 'requests' && styles.activeTabText]}>
              Requests
            </Text>
            {pendingCount > 0 && (
              <View style={styles.badgeContainer}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'add' && styles.activeTab]}
          onPress={() => setActiveTab('add')}
        >
          <Text style={[styles.tabText, activeTab === 'add' && styles.activeTabText]}>
            Add
          </Text>
        </TouchableOpacity>
      </View>

      <Animated.View 
        style={[
          styles.contentContainer,
          { opacity: fadeAnim }
        ]}
      >
        {activeTab === 'friends' && renderFriendsTab()}
        {activeTab === 'requests' && renderRequestsTab()}
        {activeTab === 'add' && renderAddFriendTab()}
      </Animated.View>
      
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Friend</Text>
            <Text style={styles.modalMessage}>
              Are you sure you want to remove {friendToRemove?.custom_username || 'this friend'}?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRemoveModal(false);
                  setFriendToRemove(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.removeButton]}
                onPress={confirmRemoveFriend}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 15,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1DB954',
  },
  tabText: {
    fontWeight: '500',
    color: '#666',
    fontSize: 15,
  },
  activeTabText: {
    color: '#1DB954',
    fontWeight: '600',
  },
  tabWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeContainer: {
    backgroundColor: '#1DB954',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
  },
  listContainer: {
    paddingTop: 8,
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profilePic: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 14,
  },
  userName: {
    fontWeight: '600',
    fontSize: 16,
    color: '#333',
  },
  moreButton: {
    padding: 10,
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestInfo: {
    flex: 1,
    marginLeft: 14,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 8,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
  },
  acceptButton: {
    backgroundColor: '#1DB954',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  addFriendContainer: {
    padding: 20,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 50,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  searchButton: {
    backgroundColor: '#1DB954',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 16,
  },
  searchButtonDisabled: {
    backgroundColor: '#a5d5b3',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  searchResultsContainer: {
    paddingBottom: 20,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  requestButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  requestedButton: {
    backgroundColor: '#e0e0e0',
  },
  requestButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  requestedButtonText: {
    color: '#666',
  },
  errorText: {
    color: '#f44336',
    marginTop: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 40,
    fontSize: 15,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#555',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  removeButton: {
    backgroundColor: '#f44336',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  removeButtonText: {
    color: 'white',
    fontWeight: '600',
  },
});