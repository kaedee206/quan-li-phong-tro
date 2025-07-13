// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Application Configuration
export const APP_CONFIG = {
  name: 'Quản lý phòng trọ',
  version: '1.0.0',
  description: 'Hệ thống quản lý phòng trọ dành cho admin',
  author: 'Admin',
  
  // API endpoints
  endpoints: {
    rooms: '/rooms',
    tenants: '/tenants',
    contracts: '/contracts',
    payments: '/payments',
    notes: '/notes',
    discord: '/discord',
    qr: '/qr',
    backup: '/backup',
    health: '/health',
  },
  
  // Pagination
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
    pageSizes: [10, 25, 50, 100],
  },
  
  // Date formats
  dateFormats: {
    display: 'DD/MM/YYYY',
    displayWithTime: 'DD/MM/YYYY HH:mm',
    api: 'YYYY-MM-DD',
    apiWithTime: 'YYYY-MM-DD HH:mm:ss',
  },
  
  // Currency
  currency: {
    symbol: 'VND',
    locale: 'vi-VN',
    format: {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    },
  },
  
  // File upload
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: {
      images: ['image/jpeg', 'image/png', 'image/gif'],
      documents: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      all: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    },
  },
  
  // Notification
  notification: {
    position: {
      vertical: 'top',
      horizontal: 'right',
    },
    autoHideDuration: 6000,
  },
  
  // Table
  table: {
    rowsPerPageOptions: [10, 25, 50],
    defaultRowsPerPage: 10,
  },
  
  // Sidebar
  sidebar: {
    width: 280,
    miniWidth: 64,
  },
  
  // Theme
  theme: {
    transitions: {
      duration: 300,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  
  // Time zones
  timezone: 'Asia/Ho_Chi_Minh',
  
  // Maintenance window
  maintenanceWindow: {
    start: 2, // 2 AM
    end: 5,   // 5 AM
  },
  
  // Pricing
  pricing: {
    waterPrice: 5000,        // VND per unit
    electricityPrice: 3000,  // VND per unit
    roomBasePrice: 800000,   // VND fixed
  },
  
  // QR Code
  qr: {
    size: 256,
    errorCorrectionLevel: 'M',
  },
  
  // Backup
  backup: {
    autoBackupTime: '02:00', // 2 AM
    retentionDays: 30,
  },
  
  // Status colors
  statusColors: {
    room: {
      available: '#4caf50',
      occupied: '#2196f3',
      maintenance: '#ff9800',
      reserved: '#9c27b0',
    },
    tenant: {
      active: '#4caf50',
      inactive: '#9e9e9e',
      moved_out: '#f44336',
    },
    contract: {
      active: '#4caf50',
      expired: '#f44336',
      terminated: '#9e9e9e',
      renewed: '#2196f3',
    },
    payment: {
      paid: '#4caf50',
      pending: '#ff9800',
      overdue: '#f44336',
      cancelled: '#9e9e9e',
    },
    note: {
      low: '#4caf50',
      medium: '#ff9800',
      high: '#f44336',
      urgent: '#d32f2f',
    },
  },
  
  // Menu items
  menuItems: [
    {
      id: 'dashboard',
      title: 'Tổng quan',
      icon: 'Dashboard',
      path: '/',
      exact: true,
    },
    {
      id: 'rooms',
      title: 'Quản lý phòng',
      icon: 'Room',
      path: '/rooms',
    },
    {
      id: 'tenants',
      title: 'Khách thuê',
      icon: 'People',
      path: '/tenants',
    },
    {
      id: 'contracts',
      title: 'Hợp đồng',
      icon: 'Description',
      path: '/contracts',
    },
    {
      id: 'payments',
      title: 'Thu chi',
      icon: 'Payment',
      path: '/payments',
    },
    {
      id: 'notes',
      title: 'Ghi chú',
      icon: 'Notes',
      path: '/notes',
    },
    {
      id: 'settings',
      title: 'Cài đặt',
      icon: 'Settings',
      path: '/settings',
    },
  ],
  
  // Quick actions
  quickActions: [
    {
      id: 'add-room',
      title: 'Thêm phòng',
      icon: 'AddHome',
      color: 'primary',
      path: '/rooms/add',
    },
    {
      id: 'add-tenant',
      title: 'Thêm khách thuê',
      icon: 'PersonAdd',
      color: 'secondary',
      path: '/tenants/add',
    },
    {
      id: 'create-contract',
      title: 'Tạo hợp đồng',
      icon: 'NoteAdd',
      color: 'success',
      path: '/contracts/add',
    },
    {
      id: 'create-payment',
      title: 'Tạo thanh toán',
      icon: 'MonetizationOn',
      color: 'warning',
      path: '/payments/add',
    },
  ],
  
  // Chart colors
  chartColors: [
    '#1976d2', '#dc004e', '#4caf50', '#ff9800', '#9c27b0',
    '#00bcd4', '#ff5722', '#795548', '#607d8b', '#3f51b5',
  ],
  
  // Breakpoints
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
};