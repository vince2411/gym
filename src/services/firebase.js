import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword as fbSignIn, 
  createUserWithEmailAndPassword as fbCreateUser, 
  signOut as fbSignOut, 
  onAuthStateChanged as fbOnAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  collection as fbCollection, 
  doc as fbDoc, 
  setDoc as fbSetDoc, 
  getDoc as fbGetDoc, 
  getDocs as fbGetDocs, 
  addDoc as fbAddDoc, 
  query as fbQuery, 
  where as fbWhere,
  orderBy as fbOrderBy,
  deleteDoc as fbDeleteDoc
} from 'firebase/firestore';

// Check if firebase config exists and is valid (not placeholder)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'YOUR_API_KEY' && firebaseConfig.projectId;

let app;
let auth;
let db;
let isOfflineMode = false;

if (isValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    console.log('Firebase initialized successfully.');
  } catch (error) {
    console.error('Firebase initialization failed, falling back to mock mode:', error);
    isOfflineMode = true;
  }
} else {
  console.warn('Firebase API key missing or placeholder. Running in Offline Mock Mode (using localStorage).');
  isOfflineMode = true;
}

// --- Offline Mock Fallback Implementation ---

const getMockData = (key) => {
  const data = localStorage.getItem(`gymtrack_${key}`);
  return data ? JSON.parse(data) : {};
};

const setMockData = (key, data) => {
  localStorage.setItem(`gymtrack_${key}`, JSON.stringify(data));
};

// Initial setup for mock users if empty
if (isOfflineMode) {
  const users = getMockData('users');
  if (Object.keys(users).length === 0) {
    // Add a default test user
    users['test-uid'] = {
      uid: 'test-uid',
      email: 'alex@gymtrack.pro',
      displayName: 'Alex Smith',
      geminiApiKey: '',
      createdAt: new Date().toISOString()
    };
    setMockData('users', users);

    // Initialize with empty collections so everything starts at 0 as requested
    setMockData('users_test-uid_rutinas', {});
    setMockData('users_test-uid_history', []);
  }
}

// Mock auth state
let mockCurrentUser = null;
const authListeners = new Set();

const triggerAuthListeners = () => {
  authListeners.forEach(cb => cb(mockCurrentUser));
};

const mockAuth = {
  currentUser: null,
  signInWithEmailAndPassword: async (email, password) => {
    const users = getMockData('users');
    const user = Object.values(users).find(u => u.email === email);
    if (!user) {
      throw new Error('Auth/user-not-found: Usuario no encontrado.');
    }
    // Simple mock check: password must be at least 6 chars
    if (password.length < 6) {
      throw new Error('Auth/wrong-password: Contraseña incorrecta.');
    }
    mockCurrentUser = user;
    mockAuth.currentUser = user;
    triggerAuthListeners();
    return { user };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    if (password.length < 6) {
      throw new Error('Auth/weak-password: La contraseña debe tener al menos 6 caracteres.');
    }
    const users = getMockData('users');
    if (Object.values(users).find(u => u.email === email)) {
      throw new Error('Auth/email-already-in-use: El correo ya está registrado.');
    }
    const uid = 'uid_' + Math.random().toString(36).substr(2, 9);
    const newUser = {
      uid,
      email,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    users[uid] = newUser;
    setMockData('users', users);
    mockCurrentUser = newUser;
    mockAuth.currentUser = newUser;
    triggerAuthListeners();
    return { user: newUser };
  },
  signOut: async () => {
    mockCurrentUser = null;
    mockAuth.currentUser = null;
    triggerAuthListeners();
  },
  onAuthStateChanged: (callback) => {
    authListeners.add(callback);
    // Trigger immediately with current state
    callback(mockCurrentUser);
    return () => authListeners.delete(callback);
  }
};

// Mock Firestore database calls
const mockDb = {
  getRoutines: async (uid) => {
    const routines = getMockData(`users_${uid}_rutinas`);
    return Object.values(routines);
  },
  saveRoutine: async (uid, routine) => {
    const routines = getMockData(`users_${uid}_rutinas`);
    const id = routine.id || 'rutina_' + Math.random().toString(36).substr(2, 9);
    const newRoutine = { ...routine, id };
    routines[id] = newRoutine;
    setMockData(`users_${uid}_rutinas`, routines);
    return newRoutine;
  },
  deleteRoutine: async (uid, routineId) => {
    const routines = getMockData(`users_${uid}_rutinas`);
    delete routines[routineId];
    setMockData(`users_${uid}_rutinas`, routines);
  },
  getProgressHistory: async (uid) => {
    return getMockData(`users_${uid}_history`);
  },
  logProgress: async (uid, logEntry) => {
    const history = getMockData(`users_${uid}_history`);
    const newEntry = {
      ...logEntry,
      id: 'log_' + Math.random().toString(36).substr(2, 9),
      date: logEntry.date || new Date().toISOString().split('T')[0]
    };
    history.push(newEntry);
    setMockData(`users_${uid}_history`, history);
    return newEntry;
  },
  getCustomExercises: async (uid) => {
    const list = getMockData(`users_${uid}_custom_exercises`);
    return Object.values(list);
  },
  saveCustomExercise: async (uid, exercise) => {
    const list = getMockData(`users_${uid}_custom_exercises`);
    const id = 'custom_ex_' + Math.random().toString(36).substr(2, 9);
    const newEx = { ...exercise, id };
    list[id] = newEx;
    setMockData(`users_${uid}_custom_exercises`, list);
    return newEx;
  },
  updateProfile: async (uid, profileData) => {
    const users = getMockData('users');
    if (users[uid]) {
      users[uid] = { ...users[uid], ...profileData };
      setMockData('users', users);
      if (mockCurrentUser && mockCurrentUser.uid === uid) {
        mockCurrentUser = users[uid];
        mockAuth.currentUser = users[uid];
        triggerAuthListeners();
      }
    }
  }
};

export { 
  auth, 
  db, 
  isOfflineMode,
  mockAuth,
  mockDb,
  isValidConfig
};
