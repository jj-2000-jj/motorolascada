// storage-service.js - Handles data persistence with PHP API backend

// Load configuration
const CONFIG = window.APP_CONFIG || {};

// Debug mode - default to false unless overridden in config
const DEBUG_MODE =
  typeof CONFIG.DEBUG_MODE !== 'undefined' ? CONFIG.DEBUG_MODE : false;

// Base URL for API requests
const BASE_URL = CONFIG.API_BASE_URL || 'https://motorolascada.com';

// API endpoint base (for api.php routes)
const API_BASE_URL = `${BASE_URL}/api`;

// API URLs for data storage
const API_ENDPOINTS = {
  PING: `${API_BASE_URL}/ping`,
  USERS: `${API_BASE_URL}/users`,
  WORKOUTS: `${API_BASE_URL}/workouts`,
  USER_STATS: (username) => `${API_BASE_URL}/stats/${username}`
};

// Saving endpoints
const SAVE_ENDPOINTS = {
  NORMAL: `${BASE_URL}/save_workouts.php`,
  DEBUG: `${BASE_URL}/verify_save.php`
};

// Service for data storage
const StorageService = {
  // Check server connectivity
  async checkConnection() {
    try {
      console.log("Pinging server at:", API_ENDPOINTS.PING);
      
      // For testing - force online mode for better user experience
      console.log("Forcing online mode");
      return true;
      
      /*
      const response = await fetch(API_ENDPOINTS.PING, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      console.log("Server ping response:", response.status, response.ok);
      return response.ok;
      */
    } catch (error) {
      console.error("Error checking server connection:", error);
      return true; // Force online mode even on error
    }
  },
  
  // Get users
  async getUsers() {
    try {
      console.log("Fetching users from server...");
      
      // For testing - skip server request in offline mode
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.log("Local development - returning local users");
        return getFromLocalStorage('workoutApp_users', ['Jared', 'Cohen', 'Graham']);
      }
      
      const response = await fetch(API_ENDPOINTS.USERS);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      console.log("Users fetched successfully:", data);
      return data.users || [];
    } catch (error) {
      console.error("Error fetching users:", error);
      // Fall back to localStorage if server is unavailable
      const users = getFromLocalStorage('workoutApp_users', ['Jared', 'Cohen', 'Graham']);
      console.log("Falling back to local users:", users);
      return users;
    }
  },
  
  // Save users
  async saveUsers(users) {
    try {
      const response = await fetch(API_ENDPOINTS.USERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ users })
      });
      
      if (!response.ok) throw new Error('Failed to save users');
      
      // Also update localStorage as a backup
      saveToLocalStorage('workoutApp_users', users);
      return true;
    } catch (error) {
      console.error("Error saving users:", error);
      // Fall back to localStorage if server is unavailable
      saveToLocalStorage('workoutApp_users', users);
      return false;
    }
  },
  
  // Get workout history
  async getWorkoutHistory() {
    try {
      console.log("Fetching workout history...");
      
      // Try to get data from localStorage first for performance
      const localWorkoutHistory = getFromLocalStorage('workoutApp_history', {});
      
      // Array of possible data sources to try in order
      const dataSources = [
        { name: 'Direct JSON', url: `${BASE_URL}/workouts.json` },
        { name: 'API Endpoint', url: `${BASE_URL}/get_workouts.php` }
      ];
      
      // Try each data source until one works
      for (const source of dataSources) {
        try {
          console.log(`Trying to fetch from ${source.name}: ${source.url}`);
          const fileResponse = await fetch(source.url, {
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (fileResponse.ok) {
            let fileData;
            try {
              fileData = await fileResponse.json();
              console.log(`Response from ${source.name} parsed as JSON successfully:`, typeof fileData);
            } catch (jsonError) {
              console.error(`Error parsing JSON from ${source.name}:`, jsonError);
              const rawText = await fileResponse.text();
              console.error("Raw response text:", rawText);
              throw jsonError;
            }
            
            // Extract workout history from the response
            const history = fileData.workoutHistory || {};
            console.log(`Loaded history from ${source.name}:`, Object.keys(history).length + " entries");
            
            // Save to localStorage for future use
            saveToLocalStorage('workoutApp_history', history);
            
            return history;
          } else {
            console.warn(`Failed to fetch from ${source.name}, status:`, fileResponse.status);
            const errorText = await fileResponse.text();
            console.error(`Error response from ${source.name}:`, errorText);
          }
        } catch (sourceError) {
          console.error(`Error fetching from ${source.name}:`, sourceError);
        }
      }
      
      // If we couldn't fetch from any server source, use localStorage
      if (Object.keys(localWorkoutHistory).length > 0) {
        console.log("Using local workout history:", Object.keys(localWorkoutHistory).length + " entries");
        return localWorkoutHistory;
      }
      
      console.warn("No workout history available from any source");
      return {};
    } catch (error) {
      console.error("Error fetching workout history:", error);
      // Fall back to empty object if all else fails
      return {};
    }
  },
  
  // Save workout history
  async saveWorkoutHistory(workoutHistory) {
    try {
      console.log("Saving workout history to server...");
      
      // Deep clone the workout history to avoid modifying the original
      const workoutHistoryCopy = JSON.parse(JSON.stringify(workoutHistory));
      
      // Add a metadata timestamp when saving
      const now = new Date();
      const timestamp = now.getTime();
      workoutHistoryCopy._meta = {
        lastSaved: timestamp,
        saveDate: now.toISOString(),
        workoutCount: Object.keys(workoutHistoryCopy).filter(k => !k.startsWith('_')).length
      };
      
      console.log("Data to save:", Object.keys(workoutHistoryCopy).filter(k => !k.startsWith('_')).length, "workout entries");
      
      // Format the data as expected by the API
      const formattedData = {
        action: 'saveWorkouts',
        data: { workoutHistory: workoutHistoryCopy }
      };
      
      // Select the appropriate endpoint based on debug mode
      const saveEndpoint = DEBUG_MODE ? SAVE_ENDPOINTS.DEBUG : SAVE_ENDPOINTS.NORMAL;
      
      // Use PHP script to save to the workouts.json file
      console.log("Sending save request to:", saveEndpoint);
      const response = await fetch(saveEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(formattedData)
      });
      
      // For debugging - log the full response
      const responseText = await response.text();
      console.log("Save response status:", response.status);
      console.log("Save response body:", responseText);
      
      try {
        // Try to parse the response as JSON for better error handling
        const responseData = JSON.parse(responseText);
        console.log("Parsed response:", responseData);
        
        if (!response.ok) {
          console.error("Server error:", responseData.error || "Unknown error");
          throw new Error(responseData.error || 'Failed to save workout history');
        }
        
        console.log("Workout history saved successfully via PHP script");
        
        // Also update localStorage as a backup
        saveToLocalStorage('workoutApp_history', workoutHistory);
        
        // Record last successful save time
        const saveInfo = {
          timestamp: timestamp,
          date: now.toISOString(),
          status: 'success'
        };
        saveToLocalStorage('workoutApp_lastSave', saveInfo);
        
        return true;
      } catch (jsonError) {
        console.warn("Could not parse response as JSON:", jsonError);
        
        if (!response.ok) throw new Error('Failed to save workout history');
        
        console.log("Workout history saved successfully (non-JSON response)");
        saveToLocalStorage('workoutApp_history', workoutHistory);
        
        // Record last successful save time
        const saveInfo = {
          timestamp: timestamp,
          date: now.toISOString(),
          status: 'success-non-json'
        };
        saveToLocalStorage('workoutApp_lastSave', saveInfo);
        
        return true;
      }
    } catch (error) {
      console.error("Error saving workout history:", error);
      
      // Record save failure
      const saveInfo = {
        timestamp: new Date().getTime(),
        date: new Date().toISOString(),
        status: 'failed',
        error: error.message
      };
      saveToLocalStorage('workoutApp_lastSave', saveInfo);
      
      // Fall back to localStorage if server is unavailable
      saveToLocalStorage('workoutApp_history', workoutHistory);
      return false;
    }
  },
  
  // Get user stats
  async getUserStats(username) {
    try {
      const response = await fetch(API_ENDPOINTS.USER_STATS(username));
      if (!response.ok) throw new Error(`Failed to fetch stats for ${username}`);
      
      const data = await response.json();
      return data.stats || {
        bodyWeight: '',
        protein: '',
        creatine: ''
      };
    } catch (error) {
      console.error(`Error fetching stats for ${username}:`, error);
      // Fall back to localStorage if server is unavailable
      return getFromLocalStorage(`workoutApp_stats_${username}`, {
        bodyWeight: '',
        protein: '',
        creatine: ''
      });
    }
  },
  
  // Save user stats
  async saveUserStats(username, stats) {
    try {
      const response = await fetch(API_ENDPOINTS.USER_STATS(username), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(stats)
      });
      
      if (!response.ok) throw new Error(`Failed to save stats for ${username}`);
      
      // Also update localStorage as a backup
      saveToLocalStorage(`workoutApp_stats_${username}`, stats);
      return true;
    } catch (error) {
      console.error(`Error saving stats for ${username}:`, error);
      // Fall back to localStorage if server is unavailable
      saveToLocalStorage(`workoutApp_stats_${username}`, stats);
      return false;
    }
  },
  
  // Sync data from localStorage to server
  async syncLocalDataToServer() {
    let syncSuccessful = true;
    
    try {
      // Get all users
      const users = getFromLocalStorage('workoutApp_users', ['Jared']);
      
      // Sync users
      const userSyncResult = await this.saveUsers(users);
      if (!userSyncResult) syncSuccessful = false;
      
      // Sync workout history
      const workoutHistory = getFromLocalStorage('workoutApp_history', {});
      const workoutSyncResult = await this.saveWorkoutHistory(workoutHistory);
      if (!workoutSyncResult) syncSuccessful = false;
      
      // Sync stats for all users
      for (const user of users) {
        const stats = getFromLocalStorage(`workoutApp_stats_${user}`, {});
        const statSyncResult = await this.saveUserStats(user, stats);
        if (!statSyncResult) syncSuccessful = false;
      }
      
      return syncSuccessful;
    } catch (error) {
      console.error("Error syncing data to server:", error);
      return false;
    }
  }
};

// Helper functions for localStorage (as fallback)
function saveToLocalStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

function getFromLocalStorage(key, defaultValue = null) {
  const stored = localStorage.getItem(key);
  if (stored) {
    return JSON.parse(stored);
  }
  return defaultValue;
}