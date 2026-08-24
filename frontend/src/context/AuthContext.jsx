import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';
import { joinUserRoom } from '../services/socket.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('ticketnow_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('ticketnow_user');
    if (savedUser && token) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser._id || parsedUser.id) {
          joinUserRoom(parsedUser._id || parsedUser.id);
        }
      } catch (e) {
        localStorage.removeItem('ticketnow_user');
        localStorage.removeItem('ticketnow_token');
        setUser(null);
        setToken(null);
      }
    }
    setIsLoading(false);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('ticketnow_token', res.data.token);
      localStorage.setItem('ticketnow_user', JSON.stringify(res.data.user));
      if (res.data.user._id || res.data.user.id) {
        joinUserRoom(res.data.user._id || res.data.user.id);
      }
      return res.data.user;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (userData) => {
    const res = await api.post('/api/auth/register', userData);
    if (res.success && res.data) {
      setUser(res.data.user);
      setToken(res.data.token);
      localStorage.setItem('ticketnow_token', res.data.token);
      localStorage.setItem('ticketnow_user', JSON.stringify(res.data.user));
      if (res.data.user._id || res.data.user.id) {
        joinUserRoom(res.data.user._id || res.data.user.id);
      }
      return res.data.user;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('ticketnow_token');
    localStorage.removeItem('ticketnow_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || 'guest',
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
