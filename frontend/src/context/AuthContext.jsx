import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // When token changes or app loads, verify it or load user
  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          // Assuming an endpoint to get the current profile
          const res = await api.get('/auth/me');
          if (res.data && res.data.user) {
            setUser(res.data.user);
          } else {
            setUser(res.data);
          }
        } catch (error) {
          console.error("Failed to fetch user:", error);
          logout();
        }
      }
      setLoading(false);
    };
    
    fetchUser();
  }, [token]);

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    const { token, user } = res.data;
    
    localStorage.setItem('token', token);
    setToken(token);
    setUser(user);
    
    return res.data;
  };

  const register = async (userData) => {
    const res = await api.post('/auth/register', userData);
    const { token, user } = res.data;
    
    if (token) {
      localStorage.setItem('token', token);
      setToken(token);
    }
    setUser(user);
    
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
