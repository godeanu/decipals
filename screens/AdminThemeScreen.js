// src/screens/AdminThemeScreen.js
import React, { useState, useEffect, useContext } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { AuthContext } from '../context/AuthContext';
import Ionicons from 'react-native-vector-icons/Ionicons';

export default function AdminThemeScreen({ navigation }) {
  const { accessToken, API_BASE_URL } = useContext(AuthContext);
  const [themes, setThemes] = useState([]);
  const [scheduledThemes, setScheduledThemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('themes');
  
  const [newTheme, setNewTheme] = useState({ title: '', description: '' });
  const [selectedThemeId, setSelectedThemeId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [notificationHour, setNotificationHour] = useState(10);
  const [notificationMinute, setNotificationMinute] = useState(0);
  const [isScheduling, setIsScheduling] = useState(false); 

  
  
  useEffect(() => {
    fetchThemes();
    fetchScheduledThemes();
  }, []);

  const handleManualActivation = (themeId) => {
    Alert.alert(
      'Activate Theme',
      'Are you sure you want to activate this theme immediately?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Activate', 
          style: 'default',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE_URL}/admin/activate-theme/${themeId}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                },
              });
              
              const data = await response.json();
              
              if (response.ok) {
                Alert.alert('Success', data.message);
                fetchScheduledThemes();
              } else {
                Alert.alert('Error', data.error || 'Failed to activate theme');
              }
            } catch (error) {
              console.error('Error activating theme:', error);
              Alert.alert('Error', 'Failed to activate theme');
            }
          }
        }
      ]
    );
  };
  
  const fetchThemes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/themes`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setThemes(data);
      } else {
        Alert.alert('Error', 'Failed to fetch themes');
      }
    } catch (error) {
      console.error('Error fetching themes:', error);
      Alert.alert('Error', 'Failed to fetch themes');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchScheduledThemes = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/scheduled-themes`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched scheduled themes:', data);
        setScheduledThemes(data);
      } else {
        Alert.alert('Error', 'Failed to fetch scheduled themes');
      }
    } catch (error) {
      console.error('Error fetching scheduled themes:', error);
    }
  };
  
  const handleCreateTheme = async () => {
    if (!newTheme.title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/admin/themes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(newTheme),
      });
      
      if (response.ok) {
        const data = await response.json();
        setThemes([...themes, data]);
        setNewTheme({ title: '', description: '' });
        Alert.alert('Success', 'Theme created successfully');
      } else {
        Alert.alert('Error', 'Failed to create theme');
      }
    } catch (error) {
      console.error('Error creating theme:', error);
      Alert.alert('Error', 'Failed to create theme');
    }
  };
  
  const handleToggleThemeStatus = async (id, currentActive) => {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/themes/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ active: !currentActive }),
      });
      
      if (response.ok) {
        setThemes(themes.map(theme => 
          theme.id === id ? { ...theme, active: !theme.active } : theme
        ));
      } else {
        Alert.alert('Error', 'Failed to update theme status');
      }
    } catch (error) {
      console.error('Error updating theme status:', error);
      Alert.alert('Error', 'Failed to update theme status');
    }
  };
  
  const handleScheduleTheme = async () => {
    if (!selectedThemeId) {
      Alert.alert('Error', 'Please select a theme');
      return;
    }
    
    const dateStr = selectedDate.toISOString().split('T')[0];
    
    try {
      setIsScheduling(true);
      
      const response = await fetch(`${API_BASE_URL}/admin/schedule-theme`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          themeId: selectedThemeId,
          date: dateStr
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Schedule theme response:', data);
        
        Alert.alert('Success', `Theme scheduled for ${dateStr}`);
        fetchScheduledThemes();
        setSelectedThemeId(null);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.error || 'Failed to schedule theme');
      }
    } catch (error) {
      console.error('Error scheduling theme:', error);
      Alert.alert('Error', 'Failed to schedule theme');
    } finally {
      setIsScheduling(false);
    }
  };
  
  const handleDeleteScheduledTheme = async (id) => {
    try {
      console.log(`Attempting to delete scheduled theme with ID: ${id}`);
      
      const response = await fetch(`${API_BASE_URL}/admin/scheduled-themes/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      const data = await response.json();
      console.log("Delete response:", data);
      
      if (response.ok) {
        // Update the local state to remove the deleted theme
        setScheduledThemes(scheduledThemes.filter(theme => theme.id !== id));
        Alert.alert('Success', 'Scheduled theme deleted');
      } else {
        console.error('Server returned error:', data);
        Alert.alert('Error', data.error || 'Failed to delete scheduled theme');
      }
    } catch (error) {
      console.error('Error deleting scheduled theme:', error);
      Alert.alert('Error', 'Failed to delete scheduled theme');
    }
  };
  
  const renderThemesTab = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text>Loading themes...</Text>
        </View>
      );
    }
    
    return (
      <View style={styles.tabContent}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Create New Theme</Text>
          <TextInput
            style={styles.input}
            placeholder="Title"
            value={newTheme.title}
            onChangeText={(text) => setNewTheme({ ...newTheme, title: text })}
          />
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Description"
            value={newTheme.description}
            onChangeText={(text) => setNewTheme({ ...newTheme, description: text })}
            multiline
          />
          <TouchableOpacity
            style={styles.button}
            onPress={handleCreateTheme}
          >
            <Text style={styles.buttonText}>Create Theme</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Theme Library</Text>
        
        {themes.length === 0 ? (
          <Text style={styles.emptyText}>No themes found. Create one!</Text>
        ) : (
          <FlatList
            data={themes}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <View style={styles.themeItem}>
                <View style={styles.themeInfo}>
                  <Text style={styles.themeTitle}>{item.title}</Text>
                  {item.description ? (
                    <Text style={styles.themeDescription} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={[
                    styles.statusButton,
                    { backgroundColor: item.active ? '#1DB954' : '#ff3b30' }
                  ]}
                  onPress={() => handleToggleThemeStatus(item.id, item.active)}
                >
                  <Text style={styles.statusButtonText}>
                    {item.active ? 'Active' : 'Inactive'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          />
        )}
      </View>
    );
  };
  
  const renderScheduleTab = () => {
    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Schedule a Theme</Text>
          
          <Text style={styles.inputLabel}>Select Theme</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.themeSelector}
          >
            {themes
              .filter(theme => theme.active)
              .map(theme => (
                <TouchableOpacity
                  key={theme.id.toString()}
                  style={[
                    styles.themeOption,
                    selectedThemeId === theme.id && styles.selectedThemeOption
                  ]}
                  onPress={() => setSelectedThemeId(theme.id)}
                >
                  <Text style={[
                    styles.themeOptionText,
                    selectedThemeId === theme.id && styles.selectedThemeOptionText
                  ]}>
                    {theme.title}
                  </Text>
                </TouchableOpacity>
              ))
            }
          </ScrollView>
          
          <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
          <View style={styles.dateInputContainer}>
            <TextInput
              style={styles.input}
              value={selectedDate.toISOString().split('T')[0]}
              onChangeText={(text) => {
                // Simple date validation
                if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
                  const newDate = new Date(text);
                  if (!isNaN(newDate.getTime())) {
                    setSelectedDate(newDate);
                  }
                }
              }}
              placeholder="YYYY-MM-DD"
            />
            <TouchableOpacity 
              style={styles.dateButton}
              onPress={() => {
                const nextDay = new Date(selectedDate);
                nextDay.setDate(nextDay.getDate() + 1);
                setSelectedDate(nextDay);
              }}
            >
              <Text style={styles.dateButtonText}>+1 Day</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.inputLabel}>Notification Time</Text>
          <View style={styles.timeInputContainer}>
            <Text style={styles.timeLabel}>Hour:   </Text>
            <View style={styles.timeControlGroup}>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setNotificationHour(prev => Math.max(0, prev - 1))}
              >
                <Text style={styles.timeButtonText}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.timeValue}>{notificationHour}</Text>
              
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setNotificationHour(prev => Math.min(23, prev + 1))}
              >
                <Text style={styles.timeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.timeLabel}>Minute:</Text>
            <View style={styles.timeControlGroup}>
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setNotificationMinute(prev => Math.max(0, prev - 3))}
              >
                <Text style={styles.timeButtonText}>-</Text>
              </TouchableOpacity>
              
              <Text style={styles.timeValue}>{String(notificationMinute).padStart(2, '0')}</Text>
              
              <TouchableOpacity 
                style={styles.timeButton}
                onPress={() => setNotificationMinute(prev => Math.min(57, prev + 3))}
              >
                <Text style={styles.timeButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity
  style={[
    styles.button,
    (!selectedThemeId || isScheduling) && styles.disabledButton
  ]}
  onPress={handleScheduleTheme}
  disabled={!selectedThemeId || isScheduling}
>
  {isScheduling ? (
    <ActivityIndicator color="white" size="small" />
  ) : (
    <Text style={styles.buttonText}>Schedule Theme</Text>
  )}
</TouchableOpacity>
        </View>
        
        <Text style={styles.sectionTitle}>Scheduled Themes</Text>
        
        {scheduledThemes.length === 0 ? (
          <Text style={styles.emptyText}>No scheduled themes yet</Text>
        ) : (
          scheduledThemes.map(theme => {
            if (!theme || !theme.id) return null;
            
            return (
                <View key={theme.id.toString()} style={styles.scheduledThemeItem}>
                  <View style={styles.scheduledThemeInfo}>
                    <Text style={styles.scheduledDate}>
                      {theme.scheduled_date ? new Date(theme.scheduled_date).toLocaleDateString() : 'No date'}
                    </Text>
                    <Text style={styles.scheduledTime}>
                      {typeof theme.notification_hour === 'number' ? theme.notification_hour : 0}:
                      {typeof theme.notification_minute === 'number' ? 
                        String(theme.notification_minute).padStart(2, '0') : '00'}
                    </Text>
                    <Text style={styles.scheduledThemeTitle}>
                      {theme.title || 'Unnamed theme'}
                    </Text>
                    
                    {theme.notification_sent && (
                      <View style={styles.sentBadge}>
                        <Text style={styles.sentBadgeText}>Sent</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.scheduledThemeActions}>
                    {!theme.notification_sent && (
                      <TouchableOpacity
                        style={styles.activateButton}
                        onPress={() => handleManualActivation(theme.theme_id)}
                      >
                        <Ionicons name="play" size={16} color="#1DB954" />
                        <Text style={styles.activateButtonText}>Activate</Text>
                      </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => {
                        Alert.alert(
                          'Delete Scheduled Theme',
                          'Are you sure you want to delete this scheduled theme?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                              text: 'Delete', 
                              onPress: () => handleDeleteScheduledTheme(theme.id),
                              style: 'destructive'
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="trash-outline" size={22} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
          })
        )}
      </ScrollView>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Theme Management</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'themes' && styles.activeTab]}
          onPress={() => setActiveTab('themes')}
        >
          <Text style={[styles.tabText, activeTab === 'themes' && styles.activeTabText]}>
            Themes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
          onPress={() => setActiveTab('schedule')}
        >
          <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
            Schedule
          </Text>
        </TouchableOpacity>
      </View>
      
      {activeTab === 'themes' ? renderThemesTab() : renderScheduleTab()}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1DB954',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#1DB954',
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
  },
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  button: {
    backgroundColor: '#1DB954',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  themeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  themeInfo: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statusButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  statusButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 20,
  },
  themeSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  themeOption: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
  },
  selectedThemeOption: {
    backgroundColor: '#1DB954',
  },
  themeOptionText: {
    color: '#333',
  },
  selectedThemeOptionText: {
    color: 'white',
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#555',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scheduledThemeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  scheduledThemeInfo: {
    flex: 1,
  },
  scheduledDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1DB954',
  },
  scheduledTime: {
    fontSize: 12,
    color: '#666',
  },
  scheduledThemeTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  deleteButton: {
    padding: 8,
  },
  sentBadge: {
    backgroundColor: '#007AFF',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  sentBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  timeLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
  },
  timeControlGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 100,
  },
  timeButton: {
    width: 36,
    height: 36,
    backgroundColor: '#f0f0f0',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  timeValue: {
    fontSize: 18,
    fontWeight: '500',
    width: 40,
    textAlign: 'center',
  },
  scheduledThemeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff0',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  activateButtonText: {
    color: '#1DB954',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
});