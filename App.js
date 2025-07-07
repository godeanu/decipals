// App.js
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { AuthProvider } from './context/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import { NotificationProvider } from './context/NotificationContext';
import { AppRegistry, Platform } from 'react-native';
import { FeedProvider } from './context/FeedContext';
import { LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';


LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);


// };

const App = () => {
  const [initialState, setInitialState] = useState(undefined);
  const [isReady, setIsReady] = useState(false);
  const navigationRef = useRef(null);

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem('NAVIGATION_STATE');
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;
        if (state !== undefined) {
            setInitialState(state);
        }
     } catch (e) {
         console.error("Failed to load navigation state", e);
     } finally {
         setIsReady(true);
     }
};
if (!isReady) {
    restoreState();
}
}, [isReady]);

  if (!isReady) {
    return null; 
  }
  

  return (
    <AuthProvider>
      <FeedProvider navigationRef={navigationRef}>
        <NotificationProvider>
          <NavigationContainer
            ref={navigationRef} 
            initialState={initialState}
            onStateChange={(state) =>
              AsyncStorage.setItem('NAVIGATION_STATE', JSON.stringify(state))
            }
            onReady={() => {
                console.log("Navigation Container is Ready");
            }}
          >
            <AppNavigator />
          </NavigationContainer>
        </NotificationProvider>
      </FeedProvider>
    </AuthProvider>
  );
};

export default App;