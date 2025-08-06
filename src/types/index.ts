// ====================================
// 🏛️ AGAPE WORSHIP - TYPE DEFINITIONS
// ====================================
// Типы для системы авторизации, филиалов и ролей

// ====================================
// USER TYPES
// ====================================

export type UserRole = 'user' | 'admin';
export type UserStatus = 'pending' | 'active' | 'banned';

export interface User {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  photoURL?: string | null;
  role: UserRole;
  branchId?: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ====================================
// BRANCH TYPES
// ====================================

export interface Branch {
  id: string;
  name: string;
  location: string;
  description?: string;
  createdBy: string; // userId
  createdAt: Date;
  updatedAt: Date;
  memberCount?: number;
}

// ====================================
// SETLIST TYPES (ОБНОВЛЕННЫЕ)
// ====================================

export interface SetList {
  id: string;
  branchId: string; // NEW: привязка к филиалу
  title: string;
  date: Date;
  songs: SetListSong[];
  createdBy: string; // userId
  createdAt: Date;
  updatedAt: Date;
}

export interface SetListSong {
  songId: string;
  preferredKey: string;
  order: number;
}

// ====================================
// TRANSFER REQUEST TYPES
// ====================================

export type TransferRequestStatus = 'pending' | 'approved' | 'rejected';

export interface TransferRequest {
  id: string;
  userId: string;
  userName: string;
  fromBranchId: string;
  fromBranchName: string;
  toBranchId: string;
  toBranchName: string;
  reason?: string;
  status: TransferRequestStatus;
  processedBy?: string; // adminId
  processedAt?: Date;
  createdAt: Date;
}

// ====================================
// AUTH TYPES
// ====================================

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email?: string;
  phone?: string;
  password?: string;
}

// ====================================
// API RESPONSE TYPES
// ====================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ====================================
// FIREBASE SPECIFIC TYPES
// ====================================

export interface FirebaseAuthError {
  code: string;
  message: string;
  customData?: any;
}

// ====================================
// PERMISSION TYPES
// ====================================

export interface Permission {
  resource: 'setlists' | 'users' | 'branches' | 'songs';
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface RolePermissions {
  user: Permission[];
  admin: Permission[];
}

// Default permissions
export const DEFAULT_PERMISSIONS: RolePermissions = {
  user: [
    { resource: 'setlists', actions: ['read'] },
    { resource: 'songs', actions: ['read'] },
  ],
  admin: [
    { resource: 'setlists', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['create', 'read', 'update'] },
    { resource: 'branches', actions: ['create', 'read', 'update'] },
    { resource: 'songs', actions: ['create', 'read', 'update', 'delete'] },
  ],
};