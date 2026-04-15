import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5001/api',
});

// Add a request interceptor to attach the JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for unified error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // We could handle 401 Unauthorized globally here
    return Promise.reject(error);
  }
);

export default api;
