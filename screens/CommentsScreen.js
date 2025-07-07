// src/screens/CommentsScreen.js
import React, { useContext, useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Keyboard
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { AuthContext } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function CommentsScreen() {
  const route = useRoute();
  const { postId, postOwnerId } = route.params;
  const { accessToken, API_BASE_URL, userProfile } = useContext(AuthContext);
  const navigation = useNavigation();
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const flatListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchComments(postId);
    
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        if (comments.length > 0 && flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: true });
        }
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [postId]);

  const fetchComments = async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/comments?postId=${id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setComments(data);
        setTimeout(() => {
          if (flatListRef.current && data.length > 0) {
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }, 200);
      } else {
        console.error('Comments fetch error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleAddComment = async () => {

    if (!commentText.trim()) return;
    try {
      const res = await fetch(`${API_BASE_URL}/add-comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ postId, comment: commentText }),
      });
      const data = await res.json();
      if (res.ok) {
        setCommentText('');
        fetchComments(postId);
        Keyboard.dismiss();
      } else {
        Alert.alert('Error', data.error || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Add comment error:', error);
      Alert.alert('Error', 'Something went wrong adding comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/delete-comment`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ commentId }),
      });
      const data = await res.json();
      if (res.ok) {
        fetchComments(postId);
      } else {
        Alert.alert('Error', data.error || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Delete comment error:', error);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const myUserId = userProfile.id;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 5 : 0}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color="#007AFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={{ width: 60 }} />
        </View>

        <FlatList
          ref={flatListRef}
          data={comments}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.commentsList}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No comments yet. Be the first to comment!</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isOwnComment = item.user_id === myUserId;
            const canDelete = isOwnComment || postOwnerId === myUserId;
            
            return (
              <View style={[
                styles.commentContainer,
                isOwnComment ? styles.ownCommentContainer : {}
              ]}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentUser}>
                    <Image 
                      source={{ uri: item.profile_picture_url || 'https://placehold.co/30x30' }} 
                      style={styles.commentPic}
                    />
                    <Text style={styles.commentUsername}>
                      {item.custom_username || item.username}
                    </Text>
                  </View>
                  
                  {canDelete && (
                    <TouchableOpacity 
                      onPress={() => {
                        Alert.alert(
                          'Delete Comment',
                          'Are you sure you want to delete this comment?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => handleDeleteComment(item.id) }
                          ]
                        );
                      }}
                      hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                    >
                      <Ionicons name="trash-outline" size={16} color="#ff4c4c" />
                    </TouchableOpacity>
                  )}
                </View>
                
                <View style={styles.commentContent}>
                  <Text style={styles.commentText}>{item.comment}</Text>
                  <Text style={styles.commentTime}>
                    {formatTime(item.created_at)}
                  </Text>
                </View>
              </View>
            );
          }}
        />
        
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Write a comment..."
            value={commentText}
            onChangeText={setCommentText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.sendButton,
              !commentText.trim() ? styles.sendButtonDisabled : {}
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim()}
          >
            <Ionicons 
              name="send" 
              size={20} 
              color={!commentText.trim() ? '#ccc' : 'white'} 
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between', 
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#007AFF',
    fontSize: 16,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  commentsList: {
    padding: 16,
    paddingBottom: 8,
  },
  emptyContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
  commentContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 5,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  ownCommentContainer: {
    backgroundColor: '#f0f9ff',
    marginLeft: 30,
    padding: 5,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  commentUser: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentPic: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  commentUsername: {
    fontWeight: '600',
    fontSize: 14,
    color: '#444',
  },
  commentContent: {
    marginLeft: 36,
  },
  commentText: {
    fontSize: 15,
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: '#888',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  input: {
    flex: 1,
    backgroundColor: '#f2f2f2',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingRight: 50,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    position: 'absolute',
    right: 26,
    backgroundColor: '#1DB954',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#e0e0e0',
  },
});