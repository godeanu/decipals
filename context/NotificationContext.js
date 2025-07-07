import React, { createContext, useState, useEffect, useContext } from 'react';
import { Platform, Alert } from 'react-native';
import { AuthContext } from './AuthContext';
import PushNotificationIOS from '@react-native-community/push-notification-ios';
import PushNotification from 'react-native-push-notification';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const { accessToken, userProfile, API_BASE_URL } = useContext(AuthContext);
  const [deviceToken, setDeviceToken] = useState(null);
  const [currentTheme, setCurrentTheme] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({
    likes: true,
    comments: true,
    friendRequests: true
  });

  useEffect(() => {
    if (Platform.OS === 'ios') {
      configurePushNotifications();
    }
    
    return () => {
      if (Platform.OS === 'ios') {
        PushNotificationIOS.removeEventListener('register');
        PushNotificationIOS.removeEventListener('registrationError');
        PushNotificationIOS.removeEventListener('notification');
        PushNotificationIOS.removeEventListener('localNotification');
      }
    };
  }, []);

  useEffect(() => {
    if (accessToken && userProfile?.id) {
      fetchNotificationSettings();
      fetchCurrentTheme();
    }
  }, [accessToken, userProfile]);

  useEffect(() => {
    if (deviceToken && accessToken && userProfile?.id) {
      registerDeviceWithBackend();
    }
  }, [deviceToken, accessToken, userProfile]);

  const configurePushNotifications = () => {
    PushNotification.configure({
      onNotification: function(notification) {
        console.log('NOTIFICATION:', notification);
        
        if (notification.foreground) {
          PushNotification.localNotification({
            title: notification.title,
            message: notification.message,
          });
        }
        
        handleNotification(notification);
        
        notification.finish(PushNotificationIOS.FetchResult.NoData);
      },
      
      onRegister: function(token) {
        console.log('TOKEN:', token);
        setDeviceToken(token.token);
      },
      
      onRegistrationError: function(err) {
        console.error(err.message, err);
      },
      
      permissions: {
        alert: true,
        badge: true,
        sound: true,
      },
      
      popInitialNotification: true,
      
      requestPermissions: true,
    });
  };

  // const handleNotification = (notification) => {
  //   const data = notification.data || {};
    
  //   switch (data.type) {
  //     case 'like':
  //       break;
        
  //     case 'comment':
  //       if (data.postId) {
  //         // navigation.navigate('Comments', { postId: data.postId });
  //       }
  //       break;
        
  //     case 'friend_request':
  //       break;
  //   }
  // };

  const registerDeviceWithBackend = async () => {
    if (!deviceToken || !accessToken) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/register-device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          deviceToken: deviceToken,
          platform: Platform.OS,
        }),
      });
      
      if (!response.ok) {
        console.error('Failed to register device:', await response.text());
      }
    } catch (error) {
      console.error('Error registering device:', error);
    }
  };

  const fetchNotificationSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/notification-settings`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings({
          likes: data.likes_enabled,
          comments: data.comments_enabled,
          friendRequests: data.friend_requests_enabled,
        });
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const updateNotificationSettings = async (settings) => {
    try {
      const response = await fetch(`${API_BASE_URL}/notification-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          likes: settings.likes,
          comments: settings.comments,
          friendRequests: settings.friendRequests,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotificationSettings({
          likes: data.likes_enabled,
          comments: data.comments_enabled,
          friendRequests: data.friend_requests_enabled,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating notification settings:', error);
      return false;
    }
  };

  const fetchCurrentTheme = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/daily-theme`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCurrentTheme(data);
      } else {
        setCurrentTheme(null);
      }
    } catch (error) {
      console.error('Error fetching current theme:', error);
    }
  };

  return (
    <NotificationContext.Provider value={{ 
      deviceToken,
      currentTheme,
      notificationSettings,
      updateNotificationSettings,
      fetchCurrentTheme,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};