// src/context/FeedContext.js - Improved for reliable navigation
import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { AppState } from 'react-native';
import { CommonActions } from '@react-navigation/native';

export const FeedContext = createContext();

export const FeedProvider = ({ children, navigationRef: navRefProp  }) => {
  const { accessToken, API_BASE_URL, userProfile } = useContext(AuthContext);
  const [feedLocked, setFeedLocked] = useState(true); 
  const [checkingLockStatus, setCheckingLockStatus] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(null);
  const navigationRef = navRefProp; 
  const midnightTimerRef = useRef(null); 


  // For debugging
  useEffect(() => {
    console.log("FeedContext initialized with:", {
      hasAccessToken: !!accessToken,
      hasUserProfile: !!userProfile,
      feedLocked,
      checkingLockStatus
    });
  }, [accessToken, userProfile, feedLocked, checkingLockStatus]);

  
  const forceLock = () => {
    console.log('[FEED] Explicitly forcing feed lock state');
    setFeedLocked(true);
    
};

  useEffect(() => {
    if (accessToken) {
      checkFeedLockStatus();
    }
  }, [accessToken]);

  useEffect(() => {
    if (userProfile && accessToken) {
      checkFeedLockStatus();
    }
  }, [userProfile]);

  const getNextResetTime = () => {
    const next = new Date();
    next.setHours(0, 1, 0, 0);
  
    if (next <= Date.now()) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  };
  
  const scheduleMidnightCheck = () => {
    if (midnightTimerRef.current) clearTimeout(midnightTimerRef.current);
  
    const nextReset = getNextResetTime();
    const delay = nextReset.getTime() - Date.now();     
  
    console.log(
      `[FEED] Next lock check in ${(delay / 1000 / 60).toFixed(1)} minutes`
    );
  
    midnightTimerRef.current = setTimeout(async () => {
      console.log('[FEED] 00:01 timer triggered - checking lock status');
      await checkFeedLockStatus();
      scheduleMidnightCheck();   
    }, delay);
  };
  

  
  useEffect(() => {
    if (!accessToken) return; 

    checkFeedLockStatus();

    scheduleMidnightCheck();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        console.log('[FEED] App became active - checking lock status');
        checkFeedLockStatus();
        scheduleMidnightCheck();
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
         if (midnightTimerRef.current) {
            clearTimeout(midnightTimerRef.current);
            midnightTimerRef.current = null;
            console.log('[FEED] Cleared midnight timer on background/inactive');
         }
      }
    });

    return () => {
      subscription.remove();
      if (midnightTimerRef.current) {
        clearTimeout(midnightTimerRef.current);
        console.log('[FEED] Cleared midnight timer on unmount');
      }
    };
  }, [accessToken]); 

  const unlockFeed = () => {
    console.log('[FEED] Unlocking feed');
    setFeedLocked(false);
    
};

  
  const checkFeedLockStatus = async () => {
    if (!accessToken || checkingLockStatus) return; 

    console.log('[FEED] Starting checkFeedLockStatus');
    setCheckingLockStatus(true);
    let isLockedResult = null; 
    try {
      const res = await fetch(`${API_BASE_URL}/feed/check-lock-status`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      if (!res.ok) {
        if (res.status === 401) {
            console.error('[FEED] Auth error checking lock status. User might need to re-login.');
        } else {
            console.error(`[FEED] Server error checking lock status: ${res.status}`);
        }
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();
      console.log('[FEED] Lock status response:', data);

      const newLockState = data.locked;
      isLockedResult = newLockState; 
      setCurrentTheme(data.theme); 

      if (newLockState !== feedLocked) {
        console.log(`[FEED] Lock state changed: ${feedLocked} -> ${newLockState}. Attempting navigation reset.`);
        setFeedLocked(newLockState); 
      } else {
        console.log(`[FEED] Lock state unchanged (${newLockState}). No navigation reset needed.`);
      }
    } catch (error) {
      console.error('[FEED] Error in checkFeedLockStatus:', error);
      isLockedResult = feedLocked;
    } finally {
      setCheckingLockStatus(false);
      console.log('[FEED] Finished checkFeedLockStatus');
      return isLockedResult;
    }
  };

  const contextValue = {
    feedLocked,
    checkingLockStatus,
    checkFeedLockStatus,
    unlockFeed,
    forceLock,
    currentTheme,
};


return (
<FeedContext.Provider value={contextValue}>
  {children}
</FeedContext.Provider>
);
};