#!/usr/bin/env node

// Test script cho backend API
const axios = require('axios');
const moment = require('moment-timezone');

const API_BASE_URL = 'http://localhost:5000';

// Màu sắc cho console
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// Test functions
async function testHealthCheck() {
  log('\n=== Testing Health Check ===', 'cyan');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    logSuccess('Health check endpoint accessible');
    
    if (response.data.success) {
      logSuccess('Health check passed');
      log(`Server uptime: ${response.data.timestamp}`, 'blue');
    } else {
      logError('Health check failed');
    }
  } catch (error) {
    logError(`Health check failed: ${error.message}`);
  }
}

async function testTimeAccess() {
  log('\n=== Testing Time Access Control ===', 'cyan');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/rooms`);
    const currentTime = moment().tz('Asia/Ho_Chi_Minh');
    const currentHour = currentTime.hour();
    
    if (currentHour >= 2 && currentHour < 5) {
      if (response.status === 503) {
        logSuccess('Time access control working - blocked during maintenance hours');
      } else {
        logWarning('Time access control might not be working during maintenance hours');
      }
    } else {
      if (response.status === 200) {
        logSuccess('Time access control working - access allowed outside maintenance hours');
      } else {
        logError('Unexpected response during allowed hours');
      }
    }
    
    logInfo(`Current time: ${currentTime.format('HH:mm:ss DD/MM/YYYY')} (GMT+7)`);
  } catch (error) {
    if (error.response && error.response.status === 503) {
      logSuccess('Time access control working - maintenance mode active');
    } else {
      logError(`Time access test failed: ${error.message}`);
    }
  }
}

async function testDatabaseConnection() {
  log('\n=== Testing Database Connection ===', 'cyan');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health/db`);
    
    if (response.data.success && response.data.data.status === 'healthy') {
      logSuccess('Database connection healthy');
      logInfo(`Database: ${response.data.data.name}`);
      logInfo(`Host: ${response.data.data.host}`);
      
      if (response.data.data.documentCounts) {
        const counts = response.data.data.documentCounts;
        logInfo(`Documents - Rooms: ${counts.rooms}, Tenants: ${counts.tenants}, Contracts: ${counts.contracts}, Payments: ${counts.payments}, Notes: ${counts.notes}`);
      }
    } else {
      logError('Database connection unhealthy');
    }
  } catch (error) {
    logError(`Database test failed: ${error.message}`);
  }
}

async function testDiscordWebhook() {
  log('\n=== Testing Discord Webhook ===', 'cyan');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health/discord`);
    
    if (response.data.success) {
      if (response.data.data.status === 'healthy') {
        logSuccess('Discord webhook healthy');
        logInfo(`Webhook: ${response.data.data.webhook.name}`);
      } else if (response.data.data.status === 'warning') {
        logWarning('Discord webhook not configured');
      } else {
        logError('Discord webhook unhealthy');
      }
    } else {
      logError('Discord webhook test failed');
    }
  } catch (error) {
    logError(`Discord webhook test failed: ${error.message}`);
  }
}

async function testQRService() {
  log('\n=== Testing QR Service ===', 'cyan');
  
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health/qr`);
    
    if (response.data.success) {
      if (response.data.data.status === 'healthy') {
        logSuccess('QR service healthy');
        logInfo(`Bank: ${response.data.data.config.bankCode.toUpperCase()}`);
        logInfo(`Account: ${response.data.data.config.accountNumber}`);
      } else if (response.data.data.status === 'warning') {
        logWarning('QR service not fully configured');
      } else {
        logError('QR service unhealthy');
      }
    } else {
      logError('QR service test failed');
    }
  } catch (error) {
    logError(`QR service test failed: ${error.message}`);
  }
}

async function testAPIEndpoints() {
  log('\n=== Testing API Endpoints ===', 'cyan');
  
  const endpoints = [
    { method: 'GET', path: '/api/rooms', name: 'Rooms list' },
    { method: 'GET', path: '/api/tenants', name: 'Tenants list' },
    { method: 'GET', path: '/api/contracts', name: 'Contracts list' },
    { method: 'GET', path: '/api/payments', name: 'Payments list' },
    { method: 'GET', path: '/api/notes', name: 'Notes list' },
    { method: 'GET', path: '/api/rooms/stats/overview', name: 'Room statistics' },
    { method: 'GET', path: '/api/tenants/stats/overview', name: 'Tenant statistics' },
    { method: 'GET', path: '/api/contracts/stats/overview', name: 'Contract statistics' },
    { method: 'GET', path: '/api/payments/stats/overview', name: 'Payment statistics' },
    { method: 'GET', path: '/api/notes/stats/overview', name: 'Note statistics' },
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_BASE_URL}${endpoint.path}`);
      
      if (response.status === 200 && response.data.success) {
        logSuccess(`${endpoint.name} endpoint working`);
      } else {
        logError(`${endpoint.name} endpoint failed`);
      }
    } catch (error) {
      if (error.response && error.response.status === 503) {
        logWarning(`${endpoint.name} endpoint blocked by time access control`);
      } else {
        logError(`${endpoint.name} endpoint failed: ${error.message}`);
      }
    }
  }
}

async function testCreateRoom() {
  log('\n=== Testing Create Room ===', 'cyan');
  
  try {
    const roomData = {
      number: 'TEST01',
      name: 'Test Room',
      price: 800000,
      area: 20,
      floor: 1,
      status: 'available',
      description: 'Test room for API validation',
      amenities: {
        hasWifi: true,
        hasAirConditioner: true,
        hasRefrigerator: false,
        hasWashingMachine: false,
        hasBalcony: true,
        hasPrivateBathroom: true,
      },
    };
    
    const response = await axios.post(`${API_BASE_URL}/api/rooms`, roomData);
    
    if (response.status === 201 && response.data.success) {
      logSuccess('Room creation successful');
      
      const roomId = response.data.data._id;
      logInfo(`Created room ID: ${roomId}`);
      
      // Test room update
      const updateData = {
        description: 'Updated test room description',
        price: 850000,
      };
      
      const updateResponse = await axios.put(`${API_BASE_URL}/api/rooms/${roomId}`, updateData);
      
      if (updateResponse.status === 200 && updateResponse.data.success) {
        logSuccess('Room update successful');
      } else {
        logError('Room update failed');
      }
      
      // Test room deletion
      const deleteResponse = await axios.delete(`${API_BASE_URL}/api/rooms/${roomId}`);
      
      if (deleteResponse.status === 200 && deleteResponse.data.success) {
        logSuccess('Room deletion successful');
      } else {
        logError('Room deletion failed');
      }
    } else {
      logError('Room creation failed');
    }
  } catch (error) {
    if (error.response && error.response.status === 503) {
      logWarning('Room creation blocked by time access control');
    } else {
      logError(`Room creation test failed: ${error.message}`);
    }
  }
}

async function testBackupSystem() {
  log('\n=== Testing Backup System ===', 'cyan');
  
  try {
    // Test backup list
    const listResponse = await axios.get(`${API_BASE_URL}/api/backup/list`);
    
    if (listResponse.status === 200 && listResponse.data.success) {
      logSuccess('Backup list endpoint working');
      logInfo(`Found ${listResponse.data.data.total} backups`);
    } else {
      logError('Backup list endpoint failed');
    }
    
    // Test backup stats
    const statsResponse = await axios.get(`${API_BASE_URL}/api/backup/stats`);
    
    if (statsResponse.status === 200 && statsResponse.data.success) {
      logSuccess('Backup stats endpoint working');
      logInfo(`Backup directory: ${statsResponse.data.data.backupDirectory}`);
    } else {
      logError('Backup stats endpoint failed');
    }
  } catch (error) {
    logError(`Backup system test failed: ${error.message}`);
  }
}

async function runAllTests() {
  log('🚀 Starting API Test Suite', 'bright');
  log('================================', 'bright');
  
  await testHealthCheck();
  await testTimeAccess();
  await testDatabaseConnection();
  await testDiscordWebhook();
  await testQRService();
  await testAPIEndpoints();
  await testCreateRoom();
  await testBackupSystem();
  
  log('\n=== Test Suite Complete ===', 'cyan');
  log('Check the results above for any issues.', 'blue');
}

// Run tests
if (require.main === module) {
  runAllTests().catch(error => {
    logError(`Test suite failed: ${error.message}`);
    process.exit(1);
  });
}

module.exports = {
  runAllTests,
  testHealthCheck,
  testTimeAccess,
  testDatabaseConnection,
  testDiscordWebhook,
  testQRService,
  testAPIEndpoints,
  testCreateRoom,
  testBackupSystem,
};