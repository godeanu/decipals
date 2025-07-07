// src/context/AuthContext.js - with loading issue fix
import React, { createContext, useState, useEffect } from 'react';
import { Linking, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import InAppBrowser from 'react-native-inappbrowser-reborn';

export const AuthContext = createContext();

const API_BASE_URL = 'https://musicmobileapp-avgee4fthhfwbac3.francecentral-01.azurewebsites.net';

export const AuthProvider = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [accessToken, setAccessToken] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);


  const fetchPendingCount = async () => {
    try {
      const jwtToken = await AsyncStorage.getItem('jwt');
      const res = await fetch(`${API_BASE_URL}/pending-requests`, {
        headers: { Authorization: `Bearer ${jwtToken}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setPendingCount(data.length);
      } else {
        setPendingCount(0);
        console.error('Error fetching pending count:', data.error);
      }
    } catch (error) {
      console.error('fetchPendingCount error:', error);
      setPendingCount(0);
    }
  };

  useEffect(() => {
    if (!accessToken || userProfile) return;
    
    const fetchProfileAfterTokenSet = async () => {
      console.log("Token set but no profile - fetching profile");
      try {
        const res = await fetch(`${API_BASE_URL}/profile`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const data = await res.json();
        
        if (!data.error) {
          console.log("Successfully loaded profile after token set");
          setUserProfile(data);
        } else {
          console.error("Failed to load profile after token:", data.error);
        }
      } catch (err) {
        console.error("Error fetching profile after token set:", err);
      }
    };
    
    fetchProfileAfterTokenSet();
  }, [accessToken, userProfile]);

  useEffect(() => {
    const initializeAuth = async () => {
      console.log('Starting auth initialization');
      setIsLoading(true);
      
      const safetyTimeout = setTimeout(() => {
        console.log('Safety timeout triggered - forcing load completion');
        setIsLoading(false);
        setInitializing(false);
        setAccessToken(null);
        setUserProfile(null);
      }, 8000); 
      
      try {
        const storedJWT = await AsyncStorage.getItem('jwt');
        
        if (storedJWT) {
          console.log('Found stored token, setting it immediately');
          setAccessToken(storedJWT);
          
          try {
            const controller = new AbortController();
            const profileTimeoutId = setTimeout(() => controller.abort(), 5000);
            
            const res = await fetch(`${API_BASE_URL}/profile`, {
              headers: { Authorization: `Bearer ${storedJWT}` },
              signal: controller.signal
            });
            
            clearTimeout(profileTimeoutId);
            
            const data = await res.json();
            
            if (!data.error) {
              setUserProfile(data);
              console.log('Profile loaded successfully');
            } else {
              if (res.status === 401) {
                console.log('Authentication failed, clearing token');
                await AsyncStorage.removeItem('jwt');
                setAccessToken(null);
                setUserProfile(null);
              }
            }
          } catch (err) {
            console.error('Error fetching profile:', err);
            if (err.name === 'AbortError') {
              console.log('Profile fetch timed out, continuing to login screen');
              await AsyncStorage.removeItem('jwt');
              setAccessToken(null);
              setUserProfile(null);
            }
          }
        } else {
          console.log('No stored token found');
          setAccessToken(null);
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAccessToken(null);
        setUserProfile(null);
      } finally {
        clearTimeout(safetyTimeout);
        setIsLoading(false);
        setInitializing(false);
        console.log('Auth initialization completed');
      }
    };
    
    initializeAuth();
  }, []); 

  useEffect(() => {
    const handleUrl = async (url) => {
      if (!url) return;
      try {
        console.log('Processing URL:', url);
        
        let processableUrl = url;
        if (typeof url === 'object' && url.url) {
          processableUrl = url.url;
        }
        
        if (processableUrl.includes('callback')) {
          console.log('Callback URL detected');
          let jwtToken = null;
          
          if (processableUrl.includes('musicapp://')) {
            const cleanUrl = processableUrl.replace('musicapp://', '');
            const params = new URLSearchParams(cleanUrl.split('?')[1]);
            jwtToken = params.get('jwt');
          } else {
            const urlObj = new URL(processableUrl);
            const params = new URLSearchParams(urlObj.search);
            jwtToken = params.get('jwt');
          }
          
          if (jwtToken) {
            console.log('JWT token found in URL');
            await AsyncStorage.setItem('jwt', jwtToken);
            setAccessToken(jwtToken);
            
            try {
              await InAppBrowser.close();
            } catch (e) {
              console.log('InAppBrowser not open or already closed');
            }
            
            setIsLoading(false);
          } else {
            console.warn('No JWT token found in URL:', processableUrl);
          }
        }
      } catch (error) {
        console.error('URL handling error:', error);
      }
    };
  
    const subscription = Linking.addEventListener('url', (event) => {
      console.log('Deep link event:', event);
      handleUrl(event.url);
    });
  
    Linking.getInitialURL().then((url) => {
      console.log('Initial URL:', url);
      if (url) handleUrl(url);
    });
  
    return () => subscription.remove();
  }, []);

  const handleLogin = async () => {
    try {
      setIsAuthenticating(true);
      const loginUrl = `${API_BASE_URL}/login`;
      
      if (await InAppBrowser.isAvailable()) {
        const result = await InAppBrowser.open(loginUrl, {
          dismissButtonStyle: 'cancel',
          preferredBarTintColor: '#1A1A1A',
          preferredControlTintColor: 'white',
          animated: true,
          modalEnabled: true,
          forceCloseOnRedirection: false, 
          ephemeralWebSession: false, 
          hasBackButton: true, 
          showTitle: true, 
          enableUrlBarHiding: false, 
          toolbarColor: '#1A1A1A',
          secondaryToolbarColor: '#1DB954',
        });
        
        console.log('InAppBrowser result:', result);
        
        if (result.type === 'dismiss') {
          console.log('Browser dismissed before auth completion');
        }
      } else {
        Linking.openURL(loginUrl);
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Could not open the Spotify login');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('Starting logout process...');
      
      setUserProfile(null);
      
      const currentToken = accessToken;
      
      setAccessToken(null);
      
      setPendingCount(0);
      
      setIsLoading(false);
      setInitializing(false);
      
      await AsyncStorage.removeItem('jwt');
      
      try {
        await AsyncStorage.removeItem('NAVIGATION_STATE');
      } catch (navError) {
        console.log('Failed to clear navigation state:', navError);
      }
      
      if (currentToken) {
        try {
          await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${currentToken}`,
            }
          }).catch(error => {
            console.log('Logout API call error, continuing anyway:', error);
          });
        } catch (error) {
          console.log('API logout call failed, continuing with local logout:', error);
        }
      }
      
      console.log('Logout completed successfully');
      
    } catch (error) {
      console.error('Logout error:', error);
      setAccessToken(null);
      setUserProfile(null);
      
      try {
        await AsyncStorage.removeItem('jwt');
      } catch (storageError) {
        console.error('Failed to clear storage during error recovery:', storageError);
      }
    }
  };
  
  const refreshUserProfile = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/profile`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      
      if (!data.error) {
        setUserProfile(data);
        return data;
      } else {
        console.error('Profile refresh error:', data.error);
        return null;
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
      return null;
    }
  };

  const forceReset = async () => {
    try {
      await AsyncStorage.removeItem('jwt');
      setAccessToken(null);
      setUserProfile(null);
      setIsLoading(false);
      setInitializing(false);
      console.log('Auth state forcibly reset');
    } catch (error) {
      console.error('Force reset error:', error);
    }
  };

  useEffect(() => {
    const forceBrowserClose = async () => {
      if (isAuthenticating) {
        try {
          setTimeout(async () => {
            if (isAuthenticating) {
              console.log('Force closing InAppBrowser after extended timeout');
              try {
                await InAppBrowser.close();
              } catch (e) {
              } finally {
                setIsAuthenticating(false);
              }
            }
          }, 60000); 
        } catch (error) {
          console.error('Error in force browser close:', error);
        }
      }
    };
  
    forceBrowserClose();
  }, [isAuthenticating]);
  

  const value = {
    accessToken,
    setAccessToken,
    userProfile,
    setUserProfile,
    isLoading,
    setIsLoading,
    initializing,
    pendingCount,
    setPendingCount,
    handleLogin,
    handleLogout,
    API_BASE_URL,
    fetchPendingCount,
    refreshUserProfile,
    isAuthenticating,
    isInitialized,
    forceReset, 
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};