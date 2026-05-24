import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth as realAuth, 
  mockAuth, 
  isOfflineMode, 
  db as realDb, 
  mockDb,
  isValidConfig 
} from '../services/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(isOfflineMode);

  // Active auth service is either real Firebase or Mock
  const authService = isOffline ? mockAuth : realAuth;
  const dbService = isOffline ? mockDb : null; // Firestore uses standard API calls, but we wrap custom profile/keys

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(authService, async (firebaseUser) => {
      if (firebaseUser) {
        // Fetch additional profile info (like API keys)
        let profile = { ...firebaseUser };
        if (!isOffline) {
          try {
            const userDocRef = doc(realDb, 'users', firebaseUser.uid);
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists()) {
              profile = { ...profile, ...userDoc.data() };
            } else {
              // Create default document if it doesn't exist
              const initialData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
                createdAt: new Date().toISOString()
              };
              await setDoc(userDocRef, initialData);
              profile = { ...profile, ...initialData };
            }
          } catch (err) {
            console.error('Error fetching user document from Firestore:', err);
          }
        } else {
          // Fetch from mock database
          const users = JSON.parse(localStorage.getItem('gymtrack_users') || '{}');
          if (users[firebaseUser.uid]) {
            profile = { ...profile, ...users[firebaseUser.uid] };
          }
        }
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOffline]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      if (isOffline) {
        const res = await mockAuth.signInWithEmailAndPassword(email, password);
        return res;
      } else {
        const res = await signInWithEmailAndPassword(realAuth, email, password);
        return res;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const signup = async (email, password) => {
    setLoading(true);
    try {
      if (isOffline) {
        const res = await mockAuth.createUserWithEmailAndPassword(email, password);
        return res;
      } else {
        const res = await createUserWithEmailAndPassword(realAuth, email, password);
        return res;
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setLoading(true);
    if (isOffline) {
      await mockAuth.signOut();
    } else {
      await signOut(realAuth);
    }
    setUser(null);
    setLoading(false);
  };

  const updateProfileData = async (data) => {
    if (!user) return;
    try {
      if (isOffline) {
        await mockDb.updateProfile(user.uid, data);
      } else {
        const userDocRef = doc(realDb, 'users', user.uid);
        await setDoc(userDocRef, data, { merge: true });
      }
      setUser(prev => ({ ...prev, ...data }));
    } catch (error) {
      console.error('Failed to update profile data:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    isOffline,
    login,
    signup,
    logout,
    updateProfileData,
    dbService // Exposes the mock db helpers if in offline mode
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
