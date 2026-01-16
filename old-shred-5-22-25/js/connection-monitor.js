// connection-monitor.js - Monitors PHP API connectivity and handles offline mode

// State variable to track connection status
let isOnline = true;
let lastSyncTime = null;
let pendingSync = false;

// Elements
const connectionStatusEl = document.getElementById('connectionStatus');

// Check connection to server
async function checkServerConnection() {
  try {
    console.log("Checking server connection...");
    // For local development, always return true to force online mode
    return true;
  } catch (error) {
    console.error("Error checking server connection:", error);
    return true; // Force online mode
  }
}

// Update UI based on connection status
function updateConnectionStatus(online) {
  const prevStatus = isOnline;
  isOnline = online;
  
  if (connectionStatusEl) {
    connectionStatusEl.classList.toggle('hidden', online);
    connectionStatusEl.classList.toggle('offline', !online);
  }
  
  // If connection was restored, sync data
  if (!prevStatus && online) {
    syncPendingData();
  }
}

// Show status message (used by syncPendingData)
function showStatusMessage(message, type = 'success') {
  const statusMessage = document.getElementById('statusMessage');
  if (!statusMessage) return;
  
  // Set icon based on message type
  const iconName = type === 'success' ? 'check-circle' : 
                   type === 'error' ? 'alert-circle' : 
                   type === 'warning' ? 'alert-triangle' : 'info';
  
  // Find or create status icon element
  let statusIcon = statusMessage.querySelector('.status-icon');
  let statusText = statusMessage.querySelector('.status-text');
  
  if (!statusIcon) {
    statusIcon = document.createElement('div');
    statusIcon.className = 'status-icon';
    statusMessage.appendChild(statusIcon);
  }
  
  if (!statusText) {
    statusText = document.createElement('div');
    statusText.className = 'status-text';
    statusMessage.appendChild(statusText);
  }
  
  // Set icon HTML
  statusIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
  statusText.textContent = message;
  
  // Update class
  statusMessage.className = `status-message ${type}`;
  statusMessage.classList.remove('hidden');
  
  // Initialize Lucide icon
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons({
      attrs: {
        width: '20',
        height: '20'
      },
      elements: [statusIcon.querySelector('i')]
    });
  }
  
  // Hide after 3 seconds
  setTimeout(() => {
    statusMessage.classList.add('hidden');
  }, 3000);
}

// Sync any pending data stored locally when connection returns
async function syncPendingData() {
  if (pendingSync || !isOnline) return;
  
  pendingSync = true;
  showStatusMessage('Syncing data with server...', 'info');
  
  try {
    const syncResult = await StorageService.syncLocalDataToServer();
    
    lastSyncTime = new Date();
    
    if (syncResult) {
      showStatusMessage('All data synced successfully!', 'success');
    } else {
      showStatusMessage('Some data failed to sync. Will try again later.', 'warning');
    }
  } catch (error) {
    console.error('Error syncing data:', error);
    showStatusMessage('Error syncing data. Will try again later.', 'error');
  } finally {
    pendingSync = false;
  }
}

// Setup periodic connection checks
function setupConnectionMonitoring() {
  // Initial check
  checkServerConnection().then(updateConnectionStatus);
  
  // Check connection status every 30 seconds
  setInterval(() => {
    checkServerConnection().then(updateConnectionStatus);
  }, 30000);
  
  // Listen for online/offline events
  window.addEventListener('online', () => {
    checkServerConnection().then(updateConnectionStatus);
  });
  
  window.addEventListener('offline', () => {
    updateConnectionStatus(false);
  });
  
  // Try to sync data every 5 minutes if there are pending changes
  setInterval(() => {
    if (isOnline && lastSyncTime) {
      const timeSinceLastSync = new Date() - lastSyncTime;
      if (timeSinceLastSync > 5 * 60 * 1000) { // 5 minutes
        syncPendingData();
      }
    }
  }, 5 * 60 * 1000);
}

// Initialize the connection monitoring
document.addEventListener('DOMContentLoaded', function() {
  // Add slight delay to ensure StorageService is fully initialized
  setTimeout(() => {
    setupConnectionMonitoring();
  }, 500);
});