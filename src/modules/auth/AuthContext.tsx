// ====================================
// 🔐 AUTH CONTEXT
// ====================================
// Контекст для управления состоянием авторизации

import React, { createContext, useState, useEffect, useContext } from 'react';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../js/firebase/config.js';
import { User, AuthState, LoginCredentials, RegisterData } from '../../types';

// ====================================
// CONTEXT INTERFACE
// ====================================

interface AuthContextType extends AuthState {
  // Auth methods
  signInWithEmail: (credentials: LoginCredentials) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithPhone: (phoneNumber: string, appVerifier: RecaptchaVerifier) => Promise<any>;
  signUp: (data: RegisterData) => Promise<void>;
  signOut: () => Promise<void>;
  
  // User methods
  updateUserProfile: (data: Partial<User>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ====================================
// CREATE CONTEXT
// ====================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ====================================
// AUTH PROVIDER COMPONENT
// ====================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  // ====================================
  // FIREBASE USER TO APP USER
  // ====================================
  
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
      
      if (userDoc.exists()) {
        return userDoc.data() as User;
      } else {
        // Создаем нового пользователя если его нет в БД
        const newUser: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Новый пользователь',
          email: firebaseUser.email,
          phone: firebaseUser.phoneNumber,
          photoURL: firebaseUser.photoURL,
          role: 'user',
          branchId: null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        
        return newUser;
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // ====================================
  // AUTH STATE LISTENER
  // ====================================
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await fetchUserData(firebaseUser);
        setState({
          user: userData,
          loading: false,
          error: null,
        });
      } else {
        setState({
          user: null,
          loading: false,
          error: null,
        });
      }
    });

    return unsubscribe;
  }, []);

  // ====================================
  // AUTH METHODS
  // ====================================
  
  const signInWithEmail = async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, credentials.email, credentials.password);
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const signInWithGoogle = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const signInWithPhone = async (phoneNumber: string, appVerifier: RecaptchaVerifier) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      return confirmationResult;
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const signUp = async (data: RegisterData) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      if (data.email && data.password) {
        const { user: firebaseUser } = await createUserWithEmailAndPassword(
          auth, 
          data.email, 
          data.password
        );
        
        // Создаем профиль пользователя
        const newUser: User = {
          id: firebaseUser.uid,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          photoURL: null,
          role: 'user',
          branchId: null,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          ...newUser,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error: any) {
      setState(prev => ({ ...prev, loading: false, error: error.message }));
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setState({
        user: null,
        loading: false,
        error: null,
      });
    } catch (error: any) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const updateUserProfile = async (data: Partial<User>) => {
    if (!state.user) return;
    
    try {
      await setDoc(doc(db, 'users', state.user.id), {
        ...data,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      setState(prev => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...data } : null,
      }));
    } catch (error: any) {
      console.error('Update profile error:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!auth.currentUser) return;
    
    const userData = await fetchUserData(auth.currentUser);
    setState(prev => ({
      ...prev,
      user: userData,
    }));
  };

  // ====================================
  // CONTEXT VALUE
  // ====================================
  
  const value: AuthContextType = {
    ...state,
    signInWithEmail,
    signInWithGoogle,
    signInWithPhone,
    signUp,
    signOut,
    updateUserProfile,
    refreshUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ====================================
// CUSTOM HOOK
// ====================================

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};