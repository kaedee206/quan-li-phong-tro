import axios from 'axios';
import { API_BASE_URL } from './constants';

// Tạo axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Client-Timezone': Intl.DateTimeFormat().resolvedOptions().timeZone,
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Thêm timestamp để tránh cache
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
    }
    
    // Log request trong development
    if (import.meta.env.DEV) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.params || config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Log response trong development
    if (import.meta.env.DEV) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    console.error('[API Response Error]', error);
    
    // Xử lý lỗi dựa trên status code
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          // Bad Request
          console.error('Bad Request:', data.message);
          break;
        case 401:
          // Unauthorized
          console.error('Unauthorized:', data.message);
          // Có thể redirect to login
          break;
        case 403:
          // Forbidden
          console.error('Forbidden:', data.message);
          break;
        case 404:
          // Not Found
          console.error('Not Found:', data.message);
          break;
        case 500:
          // Internal Server Error
          console.error('Server Error:', data.message);
          break;
        case 503:
          // Service Unavailable (maintenance mode)
          console.error('Service Unavailable:', data.message);
          break;
        default:
          console.error('API Error:', data.message);
      }
    } else if (error.request) {
      // Network error
      console.error('Network Error:', error.message);
    } else {
      // Other error
      console.error('Error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// Base API functions
export const api = {
  // GET request
  get: (url, params = {}) => apiClient.get(url, { params }),
  
  // POST request
  post: (url, data = {}) => apiClient.post(url, data),
  
  // PUT request
  put: (url, data = {}) => apiClient.put(url, data),
  
  // DELETE request
  delete: (url) => apiClient.delete(url),
  
  // PATCH request
  patch: (url, data = {}) => apiClient.patch(url, data),
  
  // Upload file
  upload: (url, formData, onUploadProgress) => {
    return apiClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  // Download file
  download: (url, params = {}) => {
    return apiClient.get(url, {
      params,
      responseType: 'blob',
    });
  },
};

// Helper functions
export const handleApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.status === 503) {
    return 'Hệ thống đang bảo trì. Vui lòng thử lại sau.';
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'Yêu cầu đã quá thời gian chờ. Vui lòng thử lại.';
  }
  
  if (error.request) {
    return 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.';
  }
  
  return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.';
};

export const buildQueryString = (params) => {
  const query = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      if (Array.isArray(value)) {
        value.forEach(item => query.append(key, item));
      } else {
        query.append(key, value);
      }
    }
  });
  
  return query.toString();
};

export const createFormData = (data) => {
  const formData = new FormData();
  
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (item instanceof File) {
            formData.append(key, item);
          } else {
            formData.append(`${key}[${index}]`, item);
          }
        });
      } else if (value instanceof File) {
        formData.append(key, value);
      } else if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else {
        formData.append(key, value);
      }
    }
  });
  
  return formData;
};

export default apiClient;