// app.js - Main application script for Shred-O-Tron 2000

// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("Application initializing...");
  
  // Create global variable for debug access with pre-loaded workout history
  window.state = {
    currentUser: "Jared",
    users: ["Jared", "Cohen", "Graham"],
    selectedDate: new Date(),
    workoutType: "Upper Body",
    exercises: [],
    selectedExercises: [],
    exerciseData: {},
    workoutHistory: window.preloadedWorkoutData || {}, // Use the preloaded data
    activeTab: "workout",
    prTracking: true, // Enable PR tracking
    restTimerEnabled: true // Enable rest timer
  };
  
  console.log("Using preloaded workout history:", 
    Object.keys(window.state.workoutHistory).length + " entries");
  
  // Force hide offline message
  const connectionStatus = document.getElementById('connectionStatus');
  if (connectionStatus) {
    connectionStatus.classList.add('hidden');
  }
  
  // Initialize PR tracker
  if (window.PRTracker && window.state.prTracking) {
    window.PRTracker.initialize();
    console.log("PR tracking enabled");
  }
  
  // Define helper functions needed by other functions
  
  // Helper function to get data from localStorage
  function getFromLocalStorage(key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(`Error retrieving ${key} from localStorage:`, e);
    }
    return defaultValue;
  }

  // Helper function to save data to localStorage
  function saveToLocalStorage(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Error saving ${key} to localStorage:`, e);
    }
  }
  
  // Define functions needed by event listeners BEFORE they are registered
  
  // Force sync to server
  window.forceSyncToServer = async function() {
    try {
      console.log("Force syncing workouts to server...");
      
      // Show a message to the user
      const statusMessage = document.getElementById('statusMessage');
      if (statusMessage) {
        statusMessage.textContent = "Syncing workout data to server...";
        statusMessage.classList.remove('hidden');
        statusMessage.classList.remove('success', 'error', 'warning');
        statusMessage.classList.add('warning');
      }
      
      // Get workout history from localStorage
      const workoutHistory = getFromLocalStorage('workoutApp_history', {});
      
      if (Object.keys(workoutHistory).length === 0) {
        console.log("No workout data to sync");
        
        if (statusMessage) {
          statusMessage.textContent = "No workout data to sync";
          statusMessage.classList.add('warning');
          
          // Hide the message after 3 seconds
          setTimeout(() => {
            statusMessage.classList.add('hidden');
          }, 3000);
        }
        
        return;
      }
      
      // Add timestamp metadata
      const timestamp = Date.now();
      workoutHistory._meta = {
        lastSaved: timestamp,
        saveDate: new Date().toISOString(),
        source: 'manualSync',
        workoutCount: Object.keys(workoutHistory).filter(k => !k.startsWith('_')).length
      };
      
      console.log(`Syncing ${Object.keys(workoutHistory).filter(k => !k.startsWith('_')).length} workouts to server...`);
      
      // Use StorageService if available
      let success = false;
      
      if (typeof StorageService !== 'undefined' && typeof StorageService.saveWorkoutHistory === 'function') {
        console.log("Using StorageService for sync");
        success = await StorageService.saveWorkoutHistory(workoutHistory);
      } else {
        // Fallback to direct fetch
        console.log("StorageService not available, using direct fetch");
        
        try {
          const response = await fetch('https://motorolascada.com/save_workouts.php', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
              action: 'saveWorkouts',
              data: { workoutHistory: workoutHistory }
            })
          });
          
          success = response.ok;
          
          if (success) {
            console.log("Direct fetch sync successful");
            
            // Save last sync info
            saveToLocalStorage('workoutApp_lastSave', {
              timestamp: timestamp,
              date: new Date().toISOString(),
              status: 'success',
              method: 'manualSync'
            });
          } else {
            console.error("Direct fetch sync failed:", response.status);
          }
        } catch (fetchError) {
          console.error("Error during direct fetch sync:", fetchError);
          success = false;
        }
      }
      
      // Update UI based on sync result
      if (statusMessage) {
        if (success) {
          statusMessage.textContent = "Workout data synced to server successfully!";
          statusMessage.classList.remove('warning', 'error');
          statusMessage.classList.add('success');
        } else {
          statusMessage.textContent = "Failed to sync workout data to server. Try again later.";
          statusMessage.classList.remove('warning', 'success');
          statusMessage.classList.add('error');
        }
        
        // Hide the message after 3 seconds
        setTimeout(() => {
          statusMessage.classList.add('hidden');
        }, 3000);
      }
      
      return success;
    } catch (error) {
      console.error("Error during force sync:", error);
      
      // Show error message
      const statusMessage = document.getElementById('statusMessage');
      if (statusMessage) {
        statusMessage.textContent = `Error syncing data: ${error.message}`;
        statusMessage.classList.remove('hidden', 'warning', 'success');
        statusMessage.classList.add('error');
        
        // Hide the message after 3 seconds
        setTimeout(() => {
          statusMessage.classList.add('hidden');
        }, 3000);
      }
      
      return false;
    }
  };
  
  // Initialize app state
  // initAppState(); // This function doesn't exist, so removing it
  
  // Backup function to load workout history from JSON file if preloaded data failed
  window.loadWorkoutHistoryFromFile = async function() {
    // If we already have preloaded data, no need to fetch again
    if (window.state.workoutHistory && Object.keys(window.state.workoutHistory).length > 0) {
      console.log("Using already loaded workout history data");
      console.log("Current workout history:", window.state.workoutHistory);
      return true;
    }
    
    console.log("Loading workout history from file...");
    
    try {
      // Get user's language preference for date formatting
      const lang = navigator.language || 'en-US';
      
      // Try to load from local storage first
      const localData = localStorage.getItem('workoutApp_history');
      if (localData) {
        try {
          const parsedData = JSON.parse(localData);
          if (parsedData && Object.keys(parsedData).length > 0) {
            console.log("Found data in localStorage:", Object.keys(parsedData).length, "entries");
            window.state.workoutHistory = parsedData;
            return true;
          }
        } catch (e) {
          console.error("Error parsing localStorage data:", e);
        }
      }
      
      // If localStorage fails, try to load from server
      const response = await fetch('data/workout_history.json');
      if (!response.ok) {
        throw new Error(`Failed to load workout history: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("Loaded workout history from file:", Object.keys(data).length, "entries");
      
      // Save to state
      window.state.workoutHistory = data;
      
      // Save to localStorage for future use
      try {
        localStorage.setItem('workoutApp_history', JSON.stringify(data));
      } catch (e) {
        console.error("Error saving to localStorage:", e);
      }
      
      return true;
    } catch (error) {
      console.error("Error loading workout history:", error);
      
      // Create empty workout history if loading fails
      window.state.workoutHistory = {};
      return false;
    }
  };
  
  // Only load if the preloaded data failed
  if (Object.keys(window.state.workoutHistory).length === 0) {
    console.log("Preloaded data was empty, falling back to fetch");
    window.loadWorkoutHistoryFromFile();
  }
  
  // Set up event listeners for the app
  window.setupEventListeners = function() {
    // Tab navigation
    document.getElementById('workoutTabBtn').addEventListener('click', () => window.switchTab('workout'));
    document.getElementById('historyTabBtn').addEventListener('click', () => window.switchTab('history'));
    document.getElementById('workoutNavBtn').addEventListener('click', () => window.switchTab('workout'));
    document.getElementById('historyNavBtn').addEventListener('click', () => window.switchTab('history'));
    
    // User management
    document.getElementById('userButton').addEventListener('click', window.openUserModal);
    document.getElementById('cancelUserModalBtn').addEventListener('click', window.closeUserModal);
    document.getElementById('addUserBtn').addEventListener('click', window.addUser);
    
    // Exercise selection (Removed listeners for modal)
    // document.getElementById('selectExercisesBtn')... (Removed)
    // document.getElementById('closeExerciseModalBtn')... (Removed)
    // document.getElementById('doneSelectingBtn')... (Removed)
    
    // Suggest workout button
    document.getElementById('suggestWorkoutBtn').addEventListener('click', window.suggestWorkout);
    
    // Workout saving
    document.getElementById('saveWorkoutBtn').addEventListener('click', window.saveWorkout);
    
    // Sync button - force sync to server
    const syncBtn = document.getElementById('syncBtn');
    if (syncBtn) {
      // Check if forceSyncToServer is defined before using it
      if (typeof window.forceSyncToServer === 'function') {
        syncBtn.addEventListener('click', window.forceSyncToServer);
      } else {
        console.error("forceSyncToServer function not found - using a fallback");
        // Direct implementation of sync button click handler
        syncBtn.addEventListener('click', async function() {
          console.log("Sync button clicked, using inline handler");
          const statusMessage = document.getElementById('statusMessage');
          if (statusMessage) {
            statusMessage.textContent = "Syncing to server...";
            statusMessage.classList.remove('hidden', 'success', 'error');
            statusMessage.classList.add('warning');
            
            // Try to use StorageService
            if (typeof StorageService !== 'undefined' && typeof StorageService.syncLocalDataToServer === 'function') {
              try {
                const result = await StorageService.syncLocalDataToServer();
                if (result && result.success) {
                  statusMessage.textContent = "Sync successful!";
                  statusMessage.classList.remove('warning', 'error');
                  statusMessage.classList.add('success');
                } else {
                  statusMessage.textContent = "Sync failed.";
                  statusMessage.classList.remove('warning', 'success');
                  statusMessage.classList.add('error');
                }
              } catch (e) {
                statusMessage.textContent = "Error: " + (e.message || "Unknown error");
                statusMessage.classList.remove('warning', 'success');
                statusMessage.classList.add('error');
              }
              
              // Hide after 3 seconds
              setTimeout(() => {
                statusMessage.classList.add('hidden');
              }, 3000);
            }
          }
        });
      }
    }
    
    // Manage workouts
    const manageWorkoutsBtn = document.getElementById('manageWorkoutsBtn');
    if (manageWorkoutsBtn) {
      manageWorkoutsBtn.addEventListener('click', window.openManageWorkoutsModal);
    }
    
    const closeManageWorkoutsBtn = document.getElementById('closeManageWorkoutsBtn');
    if (closeManageWorkoutsBtn) {
      closeManageWorkoutsBtn.addEventListener('click', window.closeManageWorkoutsModal);
    }
    
    const cancelManageBtn = document.getElementById('cancelManageBtn');
    if (cancelManageBtn) {
      cancelManageBtn.addEventListener('click', window.closeManageWorkoutsModal);
    }
    
    const selectAllWorkoutsBtn = document.getElementById('selectAllWorkoutsBtn');
    if (selectAllWorkoutsBtn) {
      selectAllWorkoutsBtn.addEventListener('click', window.selectAllWorkouts);
    }
    
    const deselectAllWorkoutsBtn = document.getElementById('deselectAllWorkoutsBtn');
    if (deselectAllWorkoutsBtn) {
      deselectAllWorkoutsBtn.addEventListener('click', window.deselectAllWorkouts);
    }
    
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    if (deleteSelectedBtn) {
      deleteSelectedBtn.addEventListener('click', window.deleteSelectedWorkouts);
    }
    
    // Stats saving
    document.getElementById('bodyWeightInput').addEventListener('change', window.saveUserStats);
    document.getElementById('proteinInput').addEventListener('change', window.saveUserStats);
    document.getElementById('creatineInput').addEventListener('change', window.saveUserStats);
    
    console.log("Event listeners set up");
  }
  
  // Render exercise category buttons on the main page
  window.renderExerciseCategoryButtons = function() {
    const container = document.getElementById('exerciseCategoryButtons');
    const focusDisplay = document.getElementById('workoutFocusDisplay');
    
    if (!container) {
      console.error("Cannot find exerciseCategoryButtons container");
      return;
    }
    
    container.innerHTML = '';
    
    // Update the focus display
    if (focusDisplay) {
      focusDisplay.textContent = window.state.workoutType;
    }
    
    // Create buttons for each exercise category
    Object.keys(defaultWorkouts).forEach(category => {
      const button = document.createElement('button');
      button.className = 'exercise-category-btn';
      button.textContent = category;
      
      // Style the button
      button.style.padding = '10px 15px';
      button.style.margin = '5px';
      button.style.borderRadius = '8px';
      button.style.fontWeight = '600';
      button.style.fontSize = '0.9em';
      button.style.cursor = 'pointer';
      button.style.border = 'none';
      button.style.transition = 'all 0.3s ease';
      
      // Highlight active category
      if (category === window.state.workoutType) {
        button.style.background = 'var(--gradient)';
        button.style.color = 'white';
      } else {
        button.style.background = '#f3f4f6';
        button.style.color = '#374151';
      }
      
      // Add click event
      button.addEventListener('click', () => {
        window.state.workoutType = category;
        window.state.exercises = defaultWorkouts[category] || [];
        window.renderExerciseCategoryButtons();
      });
      
      container.appendChild(button);
    });
  }
  
  // Switch between tabs
  window.switchTab = function(tabName) {
    console.log("Switching to tab:", tabName);
    
    // Update active tab state
    window.state.activeTab = tabName;
    
    // Update tab visibility
    const workoutTab = document.getElementById('workoutTab');
    const historyTab = document.getElementById('historyTab');
    
    if (workoutTab) workoutTab.classList.toggle('active', tabName === 'workout');
    if (historyTab) historyTab.classList.toggle('active', tabName === 'history');
    
    // Update tab button states
    const workoutTabBtn = document.getElementById('workoutTabBtn');
    const historyTabBtn = document.getElementById('historyTabBtn');
    const workoutNavBtn = document.getElementById('workoutNavBtn');
    const historyNavBtn = document.getElementById('historyNavBtn');
    
    if (workoutTabBtn) workoutTabBtn.classList.toggle('active', tabName === 'workout');
    if (historyTabBtn) historyTabBtn.classList.toggle('active', tabName === 'history');
    if (workoutNavBtn) workoutNavBtn.classList.toggle('active', tabName === 'workout');
    if (historyNavBtn) historyNavBtn.classList.toggle('active', tabName === 'history');
    
    // If switching to history tab, ensure we have data and render workout history
    if (tabName === 'history') {
      console.log("Switched to history tab, checking for workout data...");
      console.log("Workout history state before loading:", window.state.workoutHistory);
      
      // Check if we have workout history data
      if (!window.state.workoutHistory || Object.keys(window.state.workoutHistory).length === 0) {
        console.log("No workout history in state, loading from file first...");
        window.loadWorkoutHistoryFromFile().then(() => {
          console.log("File load complete, workout history now:", window.state.workoutHistory);
          if (typeof window.renderWorkoutHistory === 'function') {
            window.renderWorkoutHistory();
          }
        });
      } else {
        // We have data, just render
        console.log("Using existing workout history data:", Object.keys(window.state.workoutHistory).length + " entries");
        if (typeof window.renderWorkoutHistory === 'function') {
          window.renderWorkoutHistory();
        }
      }
    }
  };
  
  // User management functions
  window.openUserModal = function() {
    console.log("Opening user modal");
    window.renderUsersList();
    
    const userModal = document.getElementById('userModal');
    if (userModal) userModal.classList.remove('hidden');
  };
  
  window.closeUserModal = function() {
    console.log("Closing user modal");
    const userModal = document.getElementById('userModal');
    if (userModal) userModal.classList.add('hidden');
  };
  
  window.renderUsersList = function() {
    console.log("Rendering users list:", window.state.users);
    
    const usersList = document.getElementById('usersList');
    if (!usersList) {
      console.error("Cannot find usersList element");
      return;
    }
    
    usersList.innerHTML = '';
    
    window.state.users.forEach(user => {
      const userBtn = document.createElement('button');
      userBtn.className = 'user-item';
      userBtn.textContent = user;
      
      userBtn.addEventListener('click', () => {
        window.switchUser(user);
        window.closeUserModal();
      });
      
      usersList.appendChild(userBtn);
    });
  }
  
  window.switchUser = function(username) {
    console.log("Switching to user:", username);
    
    window.state.currentUser = username;
    
    // Update display elements
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    const historyUserDisplay = document.getElementById('historyUserDisplay');
    
    if (currentUserDisplay) currentUserDisplay.textContent = username;
    if (historyUserDisplay) historyUserDisplay.textContent = username;
    
    // Clear selected exercises
    window.state.selectedExercises = [];
    window.state.exerciseData = {};
    
    // Update UI
    window.loadUserData();
    
    // Make sure we reload the workout history for the new user
    if (window.state.activeTab === 'history') {
      // Force reload workout history from file to ensure we have the latest data
      loadWorkoutHistoryFromFile().then(() => {
        if (typeof window.renderWorkoutHistory === 'function') {
          window.renderWorkoutHistory();
        }
      });
    }
  };
  
  window.addUser = function() {
    const newUserInput = document.getElementById('newUserInput');
    if (!newUserInput) return;
    
    const username = newUserInput.value.trim();
    
    if (username && !window.state.users.includes(username)) {
      window.state.users.push(username);
      newUserInput.value = '';
      
      // Save to localStorage
      localStorage.setItem('workoutApp_users', JSON.stringify(window.state.users));
      
      // Update UI
      renderUsersList();
    }
  };
  
  // Function to suggest exercises for the workout
  window.suggestWorkout = function() {
    console.log("Suggesting workout...");
    
    // Clear previously selected exercises
    window.state.selectedExercises = [];
    window.state.exerciseData = {};
    
    // Get the currently selected workout type from the UI
    const selectedWorkoutType = window.state.workoutType;
    
    // Determine what type of workout to suggest based on previous workout (for future reference)
    const lastWorkoutType = getLastWorkoutType();
    const alternatingType = lastWorkoutType === "Lower Body" ? "Upper Body" : "Lower Body";
    
    // Use the user's explicitly selected workout type instead of the alternating suggestion
    // This maintains the alternating logic in the background but respects user selection
    console.log(`Last workout type: ${lastWorkoutType}, alternating would suggest: ${alternatingType}`);
    console.log(`Using selected workout type: ${selectedWorkoutType}`);
    
    // Get the available exercises for each category
    const upperBodyExercises = defaultWorkouts["Upper Body"];
    const lowerBodyExercises = defaultWorkouts["Lower Body"];
    
    // Randomly select exercises
    let selectedExercises = [];
    
    if (selectedWorkoutType === "Upper Body") {
      // 4 upper body exercises
      selectedExercises = selectedExercises.concat(getRandomItems(upperBodyExercises, 4));
      // 1 lower body exercise
      selectedExercises = selectedExercises.concat(getRandomItems(lowerBodyExercises, 1));
    } else {
      // 4 lower body exercises
      selectedExercises = selectedExercises.concat(getRandomItems(lowerBodyExercises, 4));
      // 1 upper body exercise
      selectedExercises = selectedExercises.concat(getRandomItems(upperBodyExercises, 1));
    }
    
    // Add each selected exercise to the workout
    selectedExercises.forEach(exercise => addExerciseToWorkout(exercise));
    
    console.log("Workout suggestion: ", selectedExercises);
    
    // Show selected exercises
    renderSelectedExercises();
  };
  
  // Helper function to get random items from an array
  function getRandomItems(array, count) {
    const shuffled = [...array].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
  
  // Helper function to determine the type of the last workout
  function getLastWorkoutType() {
    // Get workout history for current user
    const userWorkouts = Object.keys(window.state.workoutHistory)
      .filter(key => key.startsWith(`${window.state.currentUser}_`))
      .sort((a, b) => {
        // Sort by date/timestamp (most recent first)
        const partsA = a.split('_');
        const partsB = b.split('_');
        
        let dateA, dateB;
        
        if (partsA.length > 2) {
          dateA = parseInt(partsA[2]);
        } else {
          dateA = new Date(partsA[1]).getTime();
        }
        
        if (partsB.length > 2) {
          dateB = parseInt(partsB[2]);
        } else {
          dateB = new Date(partsB[1]).getTime();
        }
        
        return dateB - dateA; // Latest first
      });
    
    // If no workout history, return undefined (will default to Upper Body)
    if (userWorkouts.length === 0) {
      return undefined;
    }
    
    // Get most recent workout
    const lastWorkoutKey = userWorkouts[0];
    const lastWorkout = window.state.workoutHistory[lastWorkoutKey];
    
    // Get exercises from last workout
    const exercises = Object.keys(lastWorkout).filter(e => e !== '_stats' && !e.startsWith('_'));
    
    // Count upper body and lower body exercises
    let upperBodyCount = 0;
    let lowerBodyCount = 0;
    
    exercises.forEach(exercise => {
      if (defaultWorkouts["Upper Body"].includes(exercise)) {
        upperBodyCount++;
      } else if (defaultWorkouts["Lower Body"].includes(exercise)) {
        lowerBodyCount++;
      }
    });
    
    // Determine workout type based on which has more exercises
    return upperBodyCount > lowerBodyCount ? "Upper Body" : "Lower Body";
  }
  
  function renderExerciseCategories() {
    console.log('[renderExerciseCategories] Starting function');
    const container = document.getElementById('mainExerciseListContainer'); // Target new container
    if (!container) {
      console.error("[renderExerciseCategories] Cannot find mainExerciseListContainer");
      return;
    }
    console.log('[renderExerciseCategories] Found container', container);
    
    // Clear only the content added by this function, keeping the title
    const existingCategories = container.querySelectorAll('.exercise-category');
    existingCategories.forEach(cat => cat.remove());

    console.log('[renderExerciseCategories] Cleared existing categories');
    
    // Get the current workout type (still needed for suggesting/default checks)
    const day = getDayOfWeek(window.state.selectedDate);
    const workoutType = defaultSplitDays[day] || "Upper Body";
    console.log(`[renderExerciseCategories] Day: ${day}, Workout Type: ${workoutType}`);
    
    window.state.workoutType = workoutType;
    window.state.exercises = defaultWorkouts[workoutType] || []; // Re-enabled this line
    
    console.log('[renderExerciseCategories] Starting category loop');
    // Create a category for each workout type
    Object.keys(defaultWorkouts).forEach(category => {
      console.log(`[renderExerciseCategories] Processing category: ${category}`);
      const categoryDiv = document.createElement('div');
      categoryDiv.className = 'exercise-category';
      
      // Create header with toggle functionality
      const headerDiv = document.createElement('div');
      headerDiv.className = 'category-header';
      headerDiv.style.display = 'flex';
      headerDiv.style.alignItems = 'center';
      headerDiv.style.justifyContent = 'space-between';
      headerDiv.style.cursor = 'pointer';
      
      // Title
      const title = document.createElement('h4');
      title.className = 'section-subtitle';
      title.textContent = category;
      title.style.margin = '0';
      
      // Toggle icon
      const toggleIcon = document.createElement('span');
      toggleIcon.className = 'toggle-icon';
      toggleIcon.innerHTML = '▶'; // Right-pointing triangle
      
      headerDiv.appendChild(title);
      headerDiv.appendChild(toggleIcon);
      
      // Create container for exercises (hidden by default)
      const exercisesContainer = document.createElement('div');
      exercisesContainer.className = 'exercises-container';
      // No need to set style.display = 'none' as the CSS class defaults to this
      
      // Add header to category div
      categoryDiv.appendChild(headerDiv);
      categoryDiv.appendChild(exercisesContainer);
      
      console.log(`[renderExerciseCategories] Added title for ${category}`);
      
      const exercisesInCategory = defaultWorkouts[category];
      if (!exercisesInCategory) {
        console.warn(`[renderExerciseCategories] No exercises found for category: ${category}`);
        container.appendChild(categoryDiv); // Add the title even if no exercises
        return; // Continue to next category
      }
      console.log(`[renderExerciseCategories] Found ${exercisesInCategory.length} exercises for ${category}`);

      // Add exercises for this category
      exercisesInCategory.forEach(exercise => {
        console.log(`[renderExerciseCategories]   Adding exercise: ${exercise}`);
        const exerciseLabel = document.createElement('label');
        exerciseLabel.className = 'exercise-item';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = window.state.selectedExercises.includes(exercise);
        checkbox.className = 'exercise-checkbox';
        checkbox.id = `exercise-${exercise.replace(/\s+/g, '-')}`; // Add ID for label association

        checkbox.addEventListener('change', () => {
          if (checkbox.checked) {
            addExerciseToWorkout(exercise);
          } else {
            removeExerciseFromWorkout(exercise);
          }
        });
        
        const span = document.createElement('span');
        span.className = 'exercise-name';
        span.textContent = exercise;

        // Associate label with checkbox using 'for' attribute
        exerciseLabel.setAttribute('for', checkbox.id);
        
        exerciseLabel.appendChild(checkbox);
        exerciseLabel.appendChild(span);
        
        exercisesContainer.appendChild(exerciseLabel); // Add to exercises container instead of categoryDiv
      });
      
      // Append category to container
      container.appendChild(categoryDiv);
      console.log(`[renderExerciseCategories] Appended categoryDiv for ${category} to main container`);
    });
    console.log('[renderExerciseCategories] Finished function');
  }
  
  // Restore the addExerciseToWorkout function that was removed
  function addExerciseToWorkout(exercise) {
    if (!window.state.selectedExercises.includes(exercise)) {
      window.state.selectedExercises.push(exercise);
      
      // Initialize exercise data
      window.state.exerciseData[exercise] = {
        sets: [
          { weight: '', reps: '' },
          { weight: '', reps: '' },
          { weight: '', reps: '' },
          { weight: '', reps: '' }
        ]
      };
      
      renderSelectedExercises();
    }
  }
  
  // Ensure init runs properly - Add a direct initialization call
  document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM fully loaded - ensuring initialization");
    
    // Force the suggestWorkout button to work
    const suggestBtn = document.getElementById('suggestWorkoutBtn');
    if (suggestBtn) {
      console.log("Re-attaching suggest workout button event");
      suggestBtn.addEventListener('click', function() {
        console.log("Suggest button clicked directly");
        if (typeof window.suggestWorkout === 'function') {
          window.suggestWorkout();
        } else {
          console.error("suggestWorkout function not found");
        }
      });
    }
    
    // Force direct rendering of exercise list
    setTimeout(function() {
      console.log("Forced rendering of exercise list");
      if (typeof renderExerciseCategories === 'function') {
        renderExerciseCategories();
      }
    }, 500);
  });
  
  function removeExerciseFromWorkout(exercise) {
    window.state.selectedExercises = window.state.selectedExercises.filter(e => e !== exercise);
    
    // Remove exercise data
    delete window.state.exerciseData[exercise];
    
    renderSelectedExercises();
  }
  
  function renderSelectedExercises() {
    const container = document.getElementById('selectedExercisesContainer');
    const list = document.getElementById('exercisesList');
    
    if (!container || !list) {
      console.error("Cannot find exercise containers");
      return;
    }
    
    // Show/hide container
    container.classList.toggle('hidden', window.state.selectedExercises.length === 0);
    
    if (window.state.selectedExercises.length === 0) {
      return;
    }
    
    list.innerHTML = '';
    
    // Get templates
    const cardTemplate = document.getElementById('exerciseCardTemplate');
    const setRowTemplate = document.getElementById('setRowTemplate');
    
    if (!cardTemplate || !setRowTemplate) {
      console.error("Cannot find templates");
      return;
    }
    
    // Render each exercise
    window.state.selectedExercises.forEach(exercise => {
      const card = document.importNode(cardTemplate.content, true);
      
      // Set title
      card.querySelector('.exercise-title').textContent = exercise;
      
      // Set remove button handler
      card.querySelector('.remove-exercise-btn').addEventListener('click', () => {
        removeExerciseFromWorkout(exercise);
      });
      
      // Find previous workout data for this exercise
      const previousWorkoutData = findPreviousWorkoutData(exercise);
      
      // Add sets
      const setsContainer = card.querySelector('.sets-container');
      
      window.state.exerciseData[exercise].sets.forEach((set, index) => {
        const row = document.importNode(setRowTemplate.content, true);
        
        // Set number
        row.querySelector('.set-number').textContent = `Set ${index + 1}`;
        
        // Weight input
        const weightInput = row.querySelector('.weight-input');
        weightInput.value = set.weight;
        
        // Add suggested weight if available from previous workout
        if (previousWorkoutData && previousWorkoutData.sets && previousWorkoutData.sets[index]) {
          const prevSet = previousWorkoutData.sets[index];
          const prevWeight = parseFloat(prevSet.weight) || 0;
          const prevReps = parseFloat(prevSet.reps) || 0;
          
          // Check if user completed 10+ reps on all sets in previous workout
          const completedAllSets = previousWorkoutData.sets.every(set => {
            const setReps = parseFloat(set.reps) || 0;
            const setWeight = parseFloat(set.weight) || 0;
            // Check if this set had at least 10 reps and had weight specified
            return setWeight > 0 && setReps >= 10;
          });
          
          // Suggest increment only if all sets had 10+ reps
          if (prevWeight > 0 && completedAllSets) {
            const suggestedWeight = getIncrementedWeight(prevWeight);
            
            // If no weight entered yet, suggest the incremented weight
            if (!set.weight) {
              weightInput.value = suggestedWeight;
              weightInput.style.backgroundColor = "#f0fdf4"; // Light green background
              weightInput.style.borderColor = "#10b981"; // Green border
              
              // Update state with suggested weight
              updateSetData(exercise, index, 'weight', suggestedWeight);
            }
            
            // Add weight suggestion as a placeholder
            weightInput.placeholder = `Suggested: ${suggestedWeight}`;
          } else if (prevWeight > 0) {
            // Just suggest the same weight as before
            weightInput.placeholder = `Last: ${prevWeight}`;
          }
          
          // Add plate calculation tooltip for barbell exercises
          if (exercise.includes("Barbell")) {
            // Add plate calculation
            const plateInfo = document.createElement('div');
            plateInfo.className = 'plate-info';
            plateInfo.style.fontSize = '0.75rem';
            plateInfo.style.color = '#6b7280';
            plateInfo.style.marginTop = '2px';
            
            const currentWeight = parseFloat(weightInput.value) || prevWeight;
            if (currentWeight > 0) {
              const plateBreakdown = calculatePlatesForBarbell(currentWeight);
              plateInfo.textContent = plateBreakdown;
            }
            
            // Insert after the weight input
            weightInput.parentNode.appendChild(plateInfo);
            
            // Update plate calculation when weight changes
            weightInput.addEventListener('input', () => {
              const weight = parseFloat(weightInput.value) || 0;
              if (weight > 0) {
                plateInfo.textContent = calculatePlatesForBarbell(weight);
              } else {
                plateInfo.textContent = '';
              }
            });
          } else if (exercise.includes("Cable")) {
            // Add plate calculation for cable exercises
            const plateInfo = document.createElement('div');
            plateInfo.className = 'plate-info';
            plateInfo.style.fontSize = '0.75rem';
            plateInfo.style.color = '#6b7280';
            plateInfo.style.marginTop = '2px';
            
            const currentWeight = parseFloat(weightInput.value) || prevWeight;
            if (currentWeight > 0) {
              const plateBreakdown = calculatePlatesForCable(currentWeight);
              plateInfo.textContent = plateBreakdown;
            }
            
            // Insert after the weight input
            weightInput.parentNode.appendChild(plateInfo);
            
            // Update plate calculation when weight changes
            weightInput.addEventListener('input', () => {
              const weight = parseFloat(weightInput.value) || 0;
              if (weight > 0) {
                plateInfo.textContent = calculatePlatesForCable(weight);
              } else {
                plateInfo.textContent = '';
              }
            });
          }
        }
        
        weightInput.addEventListener('change', () => {
          updateSetData(exercise, index, 'weight', weightInput.value);
        });
        
        // Reps input
        const repsInput = row.querySelector('.reps-input');
        repsInput.value = set.reps;
        
        // Add previous reps info if available
        if (previousWorkoutData && previousWorkoutData.sets && previousWorkoutData.sets[index]) {
          const prevReps = previousWorkoutData.sets[index].reps;
          if (prevReps) {
            repsInput.placeholder = `Last: ${prevReps}`;
          }
        }
        
        repsInput.addEventListener('change', () => {
          updateSetData(exercise, index, 'reps', repsInput.value);
          
          // Auto-start rest timer after entering reps
          if (repsInput.value && window.state.restTimerEnabled && window.RestTimer) {
            // Get the timer for this exercise
            const timerId = `timer-${exercise.replace(/\s+/g, '-').toLowerCase()}`;
            const timer = window.RestTimer.getTimer(timerId);
            if (timer && typeof timer.startTimer === 'function') {
              timer.startTimer();
            }
          }
        });
        
        setsContainer.appendChild(row);
      });
      
      // Add rest timer if enabled
      if (window.state.restTimerEnabled && window.RestTimer) {
        const restTimerContainer = card.querySelector('.rest-timer-container');
        
        if (restTimerContainer) {
          // Generate a unique ID for this timer
          const timerId = `timer-${exercise.replace(/\s+/g, '-').toLowerCase()}`;
          restTimerContainer.id = timerId;
          
          // Queue the timer initialization after DOM is updated
          setTimeout(() => {
            window.RestTimer.initialize(timerId);
          }, 0);
        }
      }
      
      // Add volume calculation
      addVolumeCalculation(card, exercise, previousWorkoutData);
      
      list.appendChild(card);
    });
    
    // Initialize icons
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }
  
  // Helper function to find previous workout data for an exercise
  function findPreviousWorkoutData(exercise) {
    // Get workout history for current user
    const userWorkouts = Object.keys(window.state.workoutHistory)
      .filter(key => key.startsWith(`${window.state.currentUser}_`))
      .sort((a, b) => {
        // Sort by date/timestamp (most recent first)
        const partsA = a.split('_');
        const partsB = b.split('_');
        
        let dateA, dateB;
        
        if (partsA.length > 2) {
          dateA = parseInt(partsA[2]);
        } else {
          dateA = new Date(partsA[1]).getTime();
        }
        
        if (partsB.length > 2) {
          dateB = parseInt(partsB[2]);
        } else {
          dateB = new Date(partsB[1]).getTime();
        }
        
        return dateB - dateA; // Latest first
      });
    
    // Find the most recent workout with this exercise
    for (const key of userWorkouts) {
      const workout = window.state.workoutHistory[key];
      if (workout && workout[exercise]) {
        return workout[exercise];
      }
    }
    
    return null;
  }
  
  // Function to get a suggested incremented weight
  function getIncrementedWeight(weight) {
    if (weight < 10) {
      return weight + 2.5;
    } else if (weight < 50) {
      return weight + 5;
    } else {
      return weight + 10;
    }
  }
  
  // Function to calculate barbell plate breakdown
  function calculatePlatesForBarbell(totalWeight) {
    // Lighter barbell weight (25 lbs)
    const barWeight = 25;
    
    // If weight is less than bar, just return
    if (totalWeight < barWeight) {
      return `Bar (${barWeight}) + assistance`;
    }
    
    // Calculate weight to add on each side
    let remainingWeight = totalWeight - barWeight;
    if (remainingWeight <= 0) return `Bar (${barWeight})`;
    
    // Weight needs to be divided by 2 for each side
    remainingWeight = remainingWeight / 2;
    
    // Available plate weights - removed 5 lb plates as requested
    const plateWeights = [45, 35, 25, 10, 2.5];
    
    // Calculate plates needed
    const plates = {};
    
    for (const weight of plateWeights) {
      while (remainingWeight >= weight) {
        plates[weight] = (plates[weight] || 0) + 1;
        remainingWeight -= weight;
      }
    }
    
    // Format the output in a more concise format
    let result = `Bar + `;
    const plateText = Object.entries(plates)
      .sort((a, b) => parseFloat(b[0]) - parseFloat(a[0])) // Sort by weight, heaviest first
      .map(([weight, count]) => {
        // If there's more than one plate of this weight, add the count
        if (count > 1) {
          return `${count} ${weight}s`;
        } else {
          // Just show the weight with 's' suffix
          return `${weight}s`;
        }
      })
      .join(' + ');
    
    return plateText ? result + plateText : `Bar (${barWeight}) only`;
  }
  
  // Function to calculate cable machine plate breakdown
  function calculatePlatesForCable(weight) {
    // Available plate weights for cable machine
    const plateWeights = [45, 35, 25, 10, 5, 2.5];
    
    // Calculate plates needed
    const plates = {};
    let remainingWeight = weight;
    
    for (const weight of plateWeights) {
      while (remainingWeight >= weight) {
        plates[weight] = (plates[weight] || 0) + 1;
        remainingWeight -= weight;
      }
    }
    
    // Format the output
    const plateText = Object.entries(plates)
      .map(([weight, count]) => `${count}×${weight}`)
      .join(' + ');
    
    return plateText || 'Use pin';
  }
  
  // Add centralized volume calculation function
  function calculateVolume(sets) {
    if (!sets || !Array.isArray(sets)) {
      console.warn('Invalid sets data passed to calculateVolume:', sets);
      return 0;
    }
    
    return sets.reduce((total, set) => {
      // Parse values safely, handling nulls, undefined, and invalid strings
      const weight = parseFloat(set.weight);
      const reps = parseFloat(set.reps);
      
      // Check if both weight and reps are valid numbers
      if (!isNaN(weight) && !isNaN(reps)) {
        return total + (weight * reps);
      }
      return total;
    }, 0);
  }
  
  // Make calculateVolume globally available for other modules
  window.calculateVolume = calculateVolume;
  
  // Function to add volume calculation to exercise card
  function addVolumeCalculation(card, exercise, previousWorkoutData) {
    // Create volume info section
    const volumeInfo = document.createElement('div');
    volumeInfo.className = 'volume-info';
    volumeInfo.style.marginTop = '15px';
    volumeInfo.style.padding = '10px';
    volumeInfo.style.backgroundColor = '#f1f5f9';
    volumeInfo.style.borderRadius = '8px';
    
    // Create volume title
    const volumeTitle = document.createElement('div');
    volumeTitle.textContent = 'Volume Calculation';
    volumeTitle.style.fontWeight = 'bold';
    volumeTitle.style.marginBottom = '5px';
    volumeInfo.appendChild(volumeTitle);
    
    // Add volume calculation that updates dynamically
    const volumeCalculation = document.createElement('div');
    volumeCalculation.className = 'volume-calculation';
    volumeInfo.appendChild(volumeCalculation);
    
    // Add comparison to previous workout if available
    if (previousWorkoutData) {
      const comparisonDiv = document.createElement('div');
      comparisonDiv.className = 'volume-comparison';
      comparisonDiv.style.marginTop = '5px';
      volumeInfo.appendChild(comparisonDiv);
    }
    
    // Add volume info after the rest timer
    const restTimerContainer = card.querySelector('.rest-timer-container');
    if (restTimerContainer) {
      restTimerContainer.parentNode.insertBefore(volumeInfo, restTimerContainer.nextSibling);
    } else {
      // If no rest timer, add it to the bottom of the card
      card.appendChild(volumeInfo);
    }
    
    // Function to update volume calculation - call it when inputs change
    function updateVolumeCalculation() {
      // Get the current exercise data
      const exerciseData = window.state.exerciseData[exercise];
      if (!exerciseData || !exerciseData.sets) return;
      
      // Calculate total volume
      const totalVolume = calculateVolume(exerciseData.sets);
      
      // Update volume calculation display
      volumeCalculation.textContent = `Current: ${totalVolume}`;
      
      // Calculate previous workout volume if available
      if (previousWorkoutData && previousWorkoutData.sets) {
        const prevVolume = calculateVolume(previousWorkoutData.sets);
        
        // Calculate percentage change
        if (prevVolume > 0) {
          const percentChange = ((totalVolume - prevVolume) / prevVolume) * 100;
          const comparisonDiv = volumeInfo.querySelector('.volume-comparison');
          
          if (comparisonDiv) {
            comparisonDiv.textContent = `Previous: ${prevVolume} (${percentChange > 0 ? '+' : ''}${Math.round(percentChange)}%)`;
            comparisonDiv.style.color = percentChange > 0 ? '#16a34a' : percentChange < 0 ? '#dc2626' : '#4b5563';
          }
        }
      }
    }
    
    // Add input event listeners to all weight and reps inputs to update volume calculation
    const weightInputs = card.querySelectorAll('.weight-input');
    const repsInputs = card.querySelectorAll('.reps-input');
    
    [...weightInputs, ...repsInputs].forEach(input => {
      input.addEventListener('input', updateVolumeCalculation);
    });
    
    // Initial volume calculation
    updateVolumeCalculation();
  }
  
  function updateSetData(exercise, index, field, value) {
    if (window.state.exerciseData[exercise] && 
        window.state.exerciseData[exercise].sets && 
        window.state.exerciseData[exercise].sets[index]) {
      window.state.exerciseData[exercise].sets[index][field] = value;
    }
  }
  
  // Save workout
  window.saveWorkout = async function() {
    if (window.state.selectedExercises.length === 0) {
      return;
    }
    
    // Fix date issue by creating a date object without timezone adjustment
    let selectedDate = window.state.selectedDate;
    // Create a date string in YYYY-MM-DD format for the current date
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    
    const timestamp = Date.now();
    const key = `${window.state.currentUser}_${date}_${timestamp}`;
    
    
    // Add stats
    const stats = {
      bodyWeight: document.getElementById('bodyWeightInput')?.value || null,
      protein: document.getElementById('proteinInput')?.value || null,
      creatine: document.getElementById('creatineInput')?.value || null,
      timestamp: timestamp,
      date: date
    };
    
    // Create workout data
    const workoutData = { ...window.state.exerciseData, _stats: stats };
    
    // Add to history
    window.state.workoutHistory[key] = workoutData;
    
    // Check for personal records if PR tracking is enabled
    let prData = null;
    if (window.state.prTracking && window.PRTracker) {
      prData = window.PRTracker.checkForPRs(workoutData, window.state.currentUser);
      
      if (prData) {
        console.log("New personal record detected:", prData);
      }
    }
    
    // Save to localStorage - primary storage method
    try {
      localStorage.setItem('workoutApp_history', JSON.stringify(window.state.workoutHistory));
      console.log('Workout saved to localStorage successfully');
      
      // Create a download link to save as JSON file - added functionality for backup
      if (window.navigator && window.navigator.msSaveOrOpenBlob) {
        // For IE
        const blob = new Blob([JSON.stringify({workoutHistory: window.state.workoutHistory}, null, 2)], 
          { type: 'application/json' });
        window.navigator.msSaveOrOpenBlob(blob, 'workouts.json');
      } else {
        // For other browsers
        const downloadAnchor = document.createElement('a');
        downloadAnchor.style.display = 'none';
        document.body.appendChild(downloadAnchor);
        
        const dataStr = "data:text/json;charset=utf-8," + 
          encodeURIComponent(JSON.stringify({workoutHistory: window.state.workoutHistory}, null, 2));
        
        // Check if download link exists already
        const existingDownload = document.getElementById('downloadBackup');
        if (existingDownload) {
          // Update existing link
          existingDownload.setAttribute('href', dataStr);
          existingDownload.setAttribute('download', 'workouts.json');
        } else {
          // Create new download link for backups
          const downloadLink = document.createElement('a');
          downloadLink.id = 'downloadBackup';
          downloadLink.href = dataStr;
          downloadLink.download = 'workouts.json';
          downloadLink.innerHTML = 'Download Backup';
          downloadLink.style.position = 'fixed';
          downloadLink.style.bottom = '10px';
          downloadLink.style.left = '10px';
          downloadLink.style.background = '#4CAF50';
          downloadLink.style.color = 'white';
          downloadLink.style.padding = '5px 10px';
          downloadLink.style.borderRadius = '4px';
          downloadLink.style.textDecoration = 'none';
          downloadLink.style.fontSize = '12px';
          downloadLink.style.zIndex = '9999';
          document.body.appendChild(downloadLink);
        }
      }
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
    
    try {
      // Save to server using StorageService
      console.log('Attempting to save workout data to server via StorageService...');
      
      // Check if StorageService is available
      if (typeof StorageService !== 'undefined' && StorageService.saveWorkoutHistory) {
        const saveSuccess = await StorageService.saveWorkoutHistory(window.state.workoutHistory);
        
        if (saveSuccess) {
          console.log('Workout data saved to server successfully via StorageService');
        } else {
          console.warn('Server save failed via StorageService, data is saved to localStorage');
        }
      } else {
        // Fallback to direct fetch if StorageService is not available
        console.warn('StorageService not available, trying direct API call');
        
        const response = await fetch('https://motorolascada.com/save_workouts.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          },
          body: JSON.stringify({
            action: 'saveWorkouts',
            data: { workoutHistory: window.state.workoutHistory }
          })
        });
        
        if (!response.ok) {
          console.warn('Server save failed, data is saved to localStorage');
        } else {
          console.log('Workout data saved to server successfully via direct API call');
        }
      }
    } catch (error) {
      console.error('Error saving workout to server:', error);
    }
    
    // Show PR notification if we have any PRs
    if (prData && window.PRTracker) {
      // Wait a short delay to show the PR notification after save confirmation
      setTimeout(() => {
        window.PRTracker.showPRNotification(prData);
      }, 500);
    }
    
    // Update calendar with the new workout date
    if (window.Calendar) {
      // Update the calendar to show the new workout
      setTimeout(() => {
        updateCalendarWithWorkoutDates();
      }, 100);
    }
    
    // Show message
    alert('Workout saved successfully! Use the "Download Backup" button to save your data.');
    
    // Clear selected exercises
    window.state.selectedExercises = [];
    window.state.exerciseData = {};
    renderSelectedExercises();
  };
  
  // History rendering
  window.renderWorkoutHistory = function() {
    console.log("Rendering workout history...");
    console.log("Current state:", window.state);
    console.log("Workout history keys:", Object.keys(window.state.workoutHistory));
    
    const container = document.getElementById('workoutHistoryContainer');
    const noHistoryMsg = document.getElementById('noHistoryMsg');
    
    if (!container) {
      console.error("Cannot find workoutHistoryContainer");
      return;
    }
    
    // Use a hierarchy of data sources to ensure we have workout data
    // 1. Check state first
    let workoutData = null;
    
    if (window.state.workoutHistory && Object.keys(window.state.workoutHistory).length > 0) {
      console.log("Using workout history from state:", Object.keys(window.state.workoutHistory).length + " entries");
      workoutData = window.state.workoutHistory;
    } 
    // 2. Try preloaded data
    else if (window.preloadedWorkoutData && Object.keys(window.preloadedWorkoutData).length > 0) {
      console.log("Using preloaded workout data:", Object.keys(window.preloadedWorkoutData).length + " entries");
      window.state.workoutHistory = window.preloadedWorkoutData;
      workoutData = window.preloadedWorkoutData;
    }
    // 3. Try direct workout data from debug
    else if (window.directWorkoutData && Object.keys(window.directWorkoutData).length > 0) {
      console.log("Using emergency workout data:", Object.keys(window.directWorkoutData).length + " entries");
      window.state.workoutHistory = window.directWorkoutData;
      workoutData = window.directWorkoutData;
    }
    // 4. Try localStorage
    else {
      try {
        const storedData = localStorage.getItem('workoutApp_history');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (Object.keys(parsedData).length > 0) {
            console.log("Using workout history from localStorage:", Object.keys(parsedData).length + " entries");
            window.state.workoutHistory = parsedData;
            workoutData = parsedData;
          }
        }
      } catch (e) {
        console.error("Error loading from localStorage:", e);
      }
    }
    
    // 5. Last resort: fetch from file
    if (!workoutData) {
      console.log("No workout history data, attempting to load from file...");
      // This will be handled asynchronously
      loadWorkoutHistoryFromFile().then(success => {
        if (success) {
          // Call this function again after data is loaded
          window.renderWorkoutHistory();
        } else {
          console.error("Failed to load workout history from file");
          // Show no history message
          if (noHistoryMsg) {
            noHistoryMsg.classList.remove('hidden');
          }
        }
      });
      return;
    }
    
    // Filter history for current user
    const userWorkouts = Object.keys(window.state.workoutHistory)
      .filter(key => key.startsWith(`${window.state.currentUser}_`))
      .sort((a, b) => {
        // Sort by date/timestamp
        const partsA = a.split('_');
        const partsB = b.split('_');
        
        let dateA, dateB;
        
        if (partsA.length > 2) {
          dateA = parseInt(partsA[2]);
        } else {
          dateA = new Date(partsA[1]).getTime();
        }
        
        if (partsB.length > 2) {
          dateB = parseInt(partsB[2]);
        } else {
          dateB = new Date(partsB[1]).getTime();
        }
        
        return dateB - dateA; // Latest first
      });
    
    console.log(`Found ${userWorkouts.length} workouts for ${window.state.currentUser}`);
    console.log("Workout keys:", userWorkouts);
    
    // Debug the first workout's data
    if (userWorkouts.length > 0) {
      const firstWorkoutKey = userWorkouts[0];
      const firstWorkoutData = window.state.workoutHistory[firstWorkoutKey];
      console.log("First workout data:", firstWorkoutData);
      console.log("First workout exercises:", Object.keys(firstWorkoutData).filter(k => !k.startsWith('_')));
      
      // Check if we have exercise data with sets 
      const exercises = Object.keys(firstWorkoutData).filter(k => !k.startsWith('_'));
      if (exercises.length > 0) {
        const firstExercise = exercises[0];
        console.log("First exercise data:", firstWorkoutData[firstExercise]);
        console.log("Sets data:", firstWorkoutData[firstExercise].sets);
      }
    }
    
    // Show/hide no history message
    if (noHistoryMsg) {
      noHistoryMsg.classList.toggle('hidden', userWorkouts.length > 0);
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Get template
    const historyItemTemplate = document.getElementById('historyItemTemplate');
    if (!historyItemTemplate) {
      console.error("Cannot find historyItemTemplate");
      return;
    }
    
    // Render history items
    userWorkouts.forEach(key => {
      const workout = window.state.workoutHistory[key];
      console.log(`Rendering workout: ${key}`, workout);
      
      // Debug this workout entry
      if (workout) {
        console.log("Workout has keys:", Object.keys(workout));
        
        // Check first exercise
        const firstExercise = Object.keys(workout).find(k => !k.startsWith('_'));
        if (firstExercise) {
          console.log("First exercise data:", workout[firstExercise]);
          if (workout[firstExercise].sets) {
            console.log("Sets data:", workout[firstExercise].sets);
          } else {
            console.error("No sets data found for exercise:", firstExercise);
          }
        }
      } else {
        console.error("No workout data found for key:", key);
      }
      
      const parts = key.split('_');
      const date = parts[1]; // The date part
      
      // Create item from template
      const item = document.importNode(historyItemTemplate.content, true);
      
      // Set date
      item.querySelector('.history-date').textContent = new Date(date).toDateString();
      
      // Get exercises (exclude metadata)
      const exercises = Object.keys(workout).filter(e => e !== '_stats' && !e.startsWith('_'));
      
      // Calculate total workout volume for display
      let totalVolume = 0;
      exercises.forEach(exercise => {
        if (workout[exercise] && workout[exercise].sets) {
          workout[exercise].sets.forEach(set => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseFloat(set.reps) || 0;
            totalVolume += (weight * reps);
          });
        }
      });
      
      // Add volume badge to date line if we have a valid volume
      if (totalVolume > 0) {
        const dateHeader = item.querySelector('.history-date');
        const volumeBadge = document.createElement('span');
        volumeBadge.className = 'volume-badge ml-2';
        volumeBadge.textContent = `Volume: ${totalVolume}`;
        dateHeader.appendChild(volumeBadge);
      }
      
      // Add exercise tags
      const tagsContainer = item.querySelector('.exercise-tags');
      exercises.forEach(exercise => {
        const tag = document.createElement('span');
        tag.className = 'exercise-tag';
        tag.textContent = exercise;
        
        // Check if this exercise has a PR on record (if PR tracking is enabled)
        if (window.state.prTracking && window.PRTracker) {
          const prStats = window.PRTracker.getPRStats(window.state.currentUser, exercise);
          
          // If this is the workout where the user set a PR, add an indicator
          if (prStats) {
            const exerciseData = workout[exercise];
            if (exerciseData && exerciseData.sets) {
              // Check if this workout has the max weight for this exercise
              const maxWeight = Math.max(...exerciseData.sets.map(set => parseFloat(set.weight) || 0));
              const maxReps = Math.max(...exerciseData.sets.map(set => parseFloat(set.reps) || 0));
              
              // Determine if this workout has a PR
              const hasWeightPR = maxWeight > 0 && maxWeight >= prStats.maxWeight;
              const hasRepsPR = maxReps > 0 && maxReps >= prStats.maxReps;
              
              if (hasWeightPR || hasRepsPR) {
                const prIndicator = document.createElement('span');
                prIndicator.className = 'pr-indicator';
                prIndicator.innerHTML = '<i data-lucide="award" style="width: 12px; height: 12px;"></i>';
                tag.appendChild(prIndicator);
              }
            }
          }
        }
        
        tagsContainer.appendChild(tag);
      });
      
      // Add toggle functionality
      const toggleBtn = item.querySelector('.toggle-btn');
      const chevronDown = toggleBtn.querySelector('.chevron-down-icon');
      const chevronUp = toggleBtn.querySelector('.chevron-up-icon');
      const details = item.querySelector('.history-details');
      
      toggleBtn.addEventListener('click', () => {
        const isExpanded = !details.classList.contains('hidden');
        
        details.classList.toggle('hidden', isExpanded);
        chevronDown.classList.toggle('hidden', !isExpanded);
        chevronUp.classList.toggle('hidden', isExpanded);
        
        // Load details if expanding
        if (!isExpanded) {
          console.log("Toggle clicked, rendering details for key:", key);
          console.log("Key data in state:", window.state.workoutHistory[key]);
          renderWorkoutDetails(key, details);
        }
      });
      
      container.appendChild(item);
    });
    
    // Initialize icons
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
    
    console.log("Workout history rendered");
  };
  
  // Render details for a workout
  function renderWorkoutDetails(workoutKey, container) {
    if (!container) return;
    
    container.innerHTML = '';
    
    console.log("Rendering workout details for key:", workoutKey);
    console.log("Workout history state:", window.state.workoutHistory);
    
    const workout = window.state.workoutHistory[workoutKey];
    console.log("Workout data for key:", workout);
    
    if (!workout) {
      console.error(`No workout data found for key: ${workoutKey}`);
      return;
    }
    
    // Get exercises (excluding metadata)
    const exercises = Object.keys(workout).filter(e => e !== '_stats' && !e.startsWith('_'));
    console.log("Exercises in workout:", exercises);
    
    // Get the date from the key
    const parts = workoutKey.split('_');
    const workoutDate = parts[1]; // The date part
    
    // Find previous workouts with these exercises (for comparison)
    const prevWorkoutsWithExercises = Object.keys(window.state.workoutHistory)
      .filter(key => {
        // Must be for the same user
        if (!key.startsWith(`${window.state.currentUser}_`)) return false;
        
        // Must be an earlier date than the current workout
        const keyParts = key.split('_');
        const keyDate = keyParts[1];
        
        // Compare dates - skip ones that are the same or later date
        if (new Date(keyDate) >= new Date(workoutDate)) return false;
        
        // Must have at least one of the same exercises
        const keyWorkout = window.state.workoutHistory[key];
        const keyExercises = Object.keys(keyWorkout).filter(e => e !== '_stats' && !e.startsWith('_'));
        
        // Check if there's any overlap in exercises
        return exercises.some(exercise => keyExercises.includes(exercise));
      })
      .sort((a, b) => {
        // Sort by date descending (most recent first)
        const dateA = new Date(a.split('_')[1]);
        const dateB = new Date(b.split('_')[1]);
        return dateB - dateA;
      });
    
    // Calculate total workout volume
    let totalWorkoutVolume = 0;
    
    // Render each exercise
    exercises.forEach(exercise => {
      const exerciseData = workout[exercise];
      if (!exerciseData || !exerciseData.sets) return;
      
      // Calculate current exercise volume
      const exerciseVolume = calculateVolume(exerciseData.sets);
      
      // Add to total workout volume
      totalWorkoutVolume += exerciseVolume;
      
      // Create detail container
      const detail = document.createElement('div');
      detail.className = 'exercise-detail';
      detail.style.marginBottom = '20px';
      detail.style.border = '1px solid #e5e7eb';
      detail.style.borderRadius = '8px';
      detail.style.overflow = 'hidden';
      
      // Create header
      const header = document.createElement('div');
      header.className = 'exercise-detail-header';
      header.style.padding = '12px 15px';
      header.style.backgroundColor = '#f3f4f6';
      header.style.borderBottom = '1px solid #e5e7eb';
      
      const title = document.createElement('h4');
      title.className = 'exercise-detail-title';
      title.textContent = exercise;
      title.style.margin = '0';
      title.style.fontSize = '1.1em';
      title.style.fontWeight = 'bold';
      title.style.color = '#1f2937';
      
      // Find previous workout with this exercise
      const previousWorkoutWithExercise = prevWorkoutsWithExercises.find(key => {
        const prevWorkout = window.state.workoutHistory[key];
        return prevWorkout && prevWorkout[exercise];
      });
      
      // If we found a previous workout with this exercise, show comparison
      if (previousWorkoutWithExercise) {
        const prevWorkout = window.state.workoutHistory[previousWorkoutWithExercise];
        const prevExerciseData = prevWorkout[exercise];
        
        if (prevExerciseData && prevExerciseData.sets) {
          // Calculate previous exercise volume
          const prevExerciseVolume = calculateVolume(prevExerciseData.sets);
          
          // Calculate percentage difference
          const volumeDiff = exerciseVolume - prevExerciseVolume;
          const percentDiff = prevExerciseVolume > 0 
            ? ((volumeDiff) / prevExerciseVolume) * 100 
            : 0;
          
          // Create volume comparison element
          const volumeComp = document.createElement('div');
          volumeComp.className = 'volume-comparison';
          volumeComp.style.fontSize = '0.85em';
          volumeComp.style.display = 'flex';
          volumeComp.style.alignItems = 'center';
          volumeComp.style.marginTop = '5px';
          
          // Volume badge
          const volumeBadge = document.createElement('span');
          volumeBadge.className = 'volume-badge';
          volumeBadge.textContent = `Volume: ${exerciseVolume}`;
          volumeBadge.style.marginRight = '10px';
          
          // Comparison badge
          const compBadge = document.createElement('span');
          compBadge.className = percentDiff > 0 ? 'comp-badge positive' : percentDiff < 0 ? 'comp-badge negative' : 'comp-badge';
          compBadge.textContent = `${percentDiff > 0 ? '+' : ''}${Math.round(percentDiff * 10) / 10}%`;
          compBadge.style.padding = '2px 6px';
          compBadge.style.borderRadius = '4px';
          compBadge.style.fontWeight = 'bold';
          
          // Set color based on percentage
          if (percentDiff > 0) {
            compBadge.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
            compBadge.style.color = '#15803d';
          } else if (percentDiff < 0) {
            compBadge.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            compBadge.style.color = '#b91c1c';
          } else {
            compBadge.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
            compBadge.style.color = '#4b5563';
          }
          
          // Previous workout date
          const prevDate = document.createElement('span');
          const prevWorkoutDate = previousWorkoutWithExercise.split('_')[1];
          prevDate.textContent = `vs. ${new Date(prevWorkoutDate).toLocaleDateString()}`;
          prevDate.style.marginLeft = '6px';
          prevDate.style.color = '#6b7280';
          prevDate.style.fontSize = '0.85em';
          
          volumeComp.appendChild(volumeBadge);
          volumeComp.appendChild(compBadge);
          volumeComp.appendChild(prevDate);
          
          header.appendChild(title);
          header.appendChild(volumeComp);
        } else {
          header.appendChild(title);
        }
      } else {
        // No previous workout found for this exercise
        const volumeBadge = document.createElement('span');
        volumeBadge.className = 'volume-badge';
        volumeBadge.textContent = `Volume: ${exerciseVolume}`;
        volumeBadge.style.fontSize = '0.85em';
        volumeBadge.style.marginTop = '5px';
        volumeBadge.style.display = 'block';
        
        header.appendChild(title);
        header.appendChild(volumeBadge);
      }
      
      detail.appendChild(header);
      
      // Create a container for the sets table
      const tableContainer = document.createElement('div');
      tableContainer.style.padding = '15px';
      
      // Create sets table
      const table = document.createElement('div');
      table.className = 'sets-table';
      table.style.width = '100%';
      table.style.backgroundColor = 'white';
      table.style.borderRadius = '4px';
      
      tableContainer.appendChild(table);
      detail.appendChild(tableContainer);
      
      // Table header
      const tableHeader = document.createElement('div');
      tableHeader.className = 'sets-table-header';
      tableHeader.style.display = 'grid';
      tableHeader.style.gridTemplateColumns = '80px 1fr 1fr';
      tableHeader.style.padding = '5px 0';
      tableHeader.style.borderBottom = '1px solid #eaeaea';
      tableHeader.style.fontWeight = 'bold';
      tableHeader.style.fontSize = '0.9em';
      
      const setHeader = document.createElement('div');
      setHeader.className = 'set-header';
      setHeader.textContent = 'Set';
      
      const weightHeader = document.createElement('div');
      weightHeader.className = 'weight-header';
      weightHeader.textContent = 'Weight';
      weightHeader.style.textAlign = 'center';
      
      const repsHeader = document.createElement('div');
      repsHeader.className = 'reps-header';
      repsHeader.textContent = 'Reps';
      repsHeader.style.textAlign = 'center';
      
      tableHeader.appendChild(setHeader);
      tableHeader.appendChild(weightHeader);
      tableHeader.appendChild(repsHeader);
      table.appendChild(tableHeader);
      
      // Set rows
      console.log("Rendering sets for exercise:", exercise);
      console.log("Sets data:", exerciseData.sets);
      
      exerciseData.sets.forEach((set, index) => {
        console.log(`Set ${index}:`, set);
        
        if (!set.weight && !set.reps) return;
        
        const row = document.createElement('div');
        row.className = 'set-detail-row';
        row.style.display = 'grid';
        row.style.gridTemplateColumns = '80px 1fr 1fr';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #f0f0f0';
        
        const setNum = document.createElement('div');
        setNum.className = 'set-num';
        setNum.textContent = index + 1;
        setNum.style.fontWeight = 'bold';
        
        const weight = document.createElement('div');
        weight.className = 'weight-value';
        weight.textContent = set.weight || '-';
        weight.style.textAlign = 'center';
        console.log(`Set ${index} weight:`, set.weight);
        
        const reps = document.createElement('div');
        reps.className = 'reps-value';
        reps.textContent = set.reps || '-';
        reps.style.textAlign = 'center';
        console.log(`Set ${index} reps:`, set.reps);
        
        // Check if this is a PR set - highlight if it's the heaviest weight or most reps
        if (window.state.prTracking && window.PRTracker) {
          const prStats = window.PRTracker.getPRStats(window.state.currentUser, exercise);
          
          if (prStats) {
            const setWeight = parseFloat(set.weight) || 0;
            const setReps = parseFloat(set.reps) || 0;
            
            // If this set has the max weight or max reps for this exercise
            if (setWeight > 0 && setWeight === prStats.maxWeight) {
              weight.style.color = '#059669';
              weight.style.fontWeight = 'bold';
              
              // Add award icon
              const weightIcon = document.createElement('span');
              weightIcon.innerHTML = '<i data-lucide="award" style="width: 12px; height: 12px; margin-left: 4px;"></i>';
              weight.appendChild(weightIcon);
            }
            
            if (setReps > 0 && setReps === prStats.maxReps) {
              reps.style.color = '#059669';
              reps.style.fontWeight = 'bold';
              
              // Add award icon
              const repsIcon = document.createElement('span');
              repsIcon.innerHTML = '<i data-lucide="award" style="width: 12px; height: 12px; margin-left: 4px;"></i>';
              reps.appendChild(repsIcon);
            }
          }
        }
        
        row.appendChild(setNum);
        row.appendChild(weight);
        row.appendChild(reps);
        table.appendChild(row);
      });
      
      // Note: table is already appended to tableContainer which is in detail
      
      // Compare with previous workout for this exercise
      if (previousWorkoutWithExercise) {
        const prevWorkout = window.state.workoutHistory[previousWorkoutWithExercise];
        const prevExerciseData = prevWorkout[exercise];
        
        if (prevExerciseData && prevExerciseData.sets && prevExerciseData.sets.length > 0) {
          const comparisonSection = document.createElement('div');
          comparisonSection.className = 'comparison-section';
          comparisonSection.style.marginTop = '15px';
          comparisonSection.style.padding = '10px';
          comparisonSection.style.backgroundColor = 'rgba(243, 244, 246, 0.7)';
          comparisonSection.style.borderRadius = '6px';
          comparisonSection.style.border = '1px dashed #d1d5db';
          
          const compTitle = document.createElement('div');
          compTitle.className = 'comparison-title';
          compTitle.textContent = 'Previous Workout';
          compTitle.style.fontSize = '0.85em';
          compTitle.style.fontWeight = 'bold';
          compTitle.style.marginBottom = '5px';
          compTitle.style.color = '#6b7280';
          
          comparisonSection.appendChild(compTitle);
          
          // Previous sets mini-table
          const prevSetsTable = document.createElement('div');
          prevSetsTable.className = 'prev-sets-table';
          prevSetsTable.style.fontSize = '0.85em';
          
          // Only show up to 3 sets to keep it compact
          const setsToShow = prevExerciseData.sets.slice(0, 3).filter(set => set.weight || set.reps);
          
          setsToShow.forEach((set, idx) => {
            const prevSetRow = document.createElement('div');
            prevSetRow.className = 'prev-set-row';
            prevSetRow.style.display = 'flex';
            prevSetRow.style.marginBottom = '3px';
            
            const prevSetNum = document.createElement('div');
            prevSetNum.textContent = `Set ${idx + 1}:`;
            prevSetNum.style.width = '50px';
            prevSetNum.style.color = '#6b7280';
            
            const prevSetData = document.createElement('div');
            prevSetData.textContent = `${set.weight || '-'} lbs × ${set.reps || '-'} reps`;
            
            prevSetRow.appendChild(prevSetNum);
            prevSetRow.appendChild(prevSetData);
            prevSetsTable.appendChild(prevSetRow);
          });
          
          // If there are more sets than we showed, add a note
          if (prevExerciseData.sets.length > 3) {
            const moreSetsPrev = document.createElement('div');
            moreSetsPrev.textContent = `+ ${prevExerciseData.sets.length - 3} more sets`;
            moreSetsPrev.style.fontSize = '0.85em';
            moreSetsPrev.style.color = '#6b7280';
            moreSetsPrev.style.marginTop = '3px';
            prevSetsTable.appendChild(moreSetsPrev);
          }
          
          comparisonSection.appendChild(prevSetsTable);
          tableContainer.appendChild(comparisonSection);
        }
      }
      
      container.appendChild(detail);
    });
    
    // Add total workout volume summary
    if (totalWorkoutVolume > 0) {
      const volumeSummary = document.createElement('div');
      volumeSummary.className = 'volume-summary';
      volumeSummary.style.marginTop = '20px';
      volumeSummary.style.marginBottom = '20px';
      volumeSummary.style.padding = '15px';
      volumeSummary.style.backgroundColor = 'rgba(219, 234, 254, 0.7)';
      volumeSummary.style.borderRadius = '8px';
      volumeSummary.style.border = '1px solid rgba(59, 130, 246, 0.3)';
      volumeSummary.style.textAlign = 'center';
      volumeSummary.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
      
      const volumeTitle = document.createElement('div');
      volumeTitle.textContent = 'Total Workout Volume';
      volumeTitle.style.fontSize = '0.9em';
      volumeTitle.style.color = '#1e3a8a';
      
      const volumeValue = document.createElement('div');
      volumeValue.textContent = totalWorkoutVolume;
      volumeValue.style.fontSize = '1.5em';
      volumeValue.style.fontWeight = 'bold';
      volumeValue.style.color = '#2563eb';
      
      // If we have a previous workout to compare to, calculate total volume change
      if (prevWorkoutsWithExercises.length > 0) {
        const mostRecentPrevWorkout = prevWorkoutsWithExercises[0];
        const prevWorkout = window.state.workoutHistory[mostRecentPrevWorkout];
        
        // Calculate previous workout total volume
        const prevTotalVolume = Object.keys(prevWorkout)
          .filter(ex => !ex.startsWith('_') && exercises.includes(ex))
          .reduce((total, ex) => {
            const exerciseData = prevWorkout[ex];
            if (exerciseData && exerciseData.sets) {
              return total + calculateVolume(exerciseData.sets);
            }
            return total;
          }, 0);
        
        // Calculate percentage difference
        const volumeDiff = totalWorkoutVolume - prevTotalVolume;
        const percentDiff = prevTotalVolume > 0 
          ? ((volumeDiff) / prevTotalVolume) * 100 
          : 0;
        
        // Create comparison badge
        if (prevTotalVolume > 0) {
          const volumeChange = document.createElement('div');
          volumeChange.className = 'volume-change';
          volumeChange.style.marginTop = '5px';
          
          const changeValue = document.createElement('span');
          changeValue.className = percentDiff > 0 ? 'change-badge positive' : percentDiff < 0 ? 'change-badge negative' : 'change-badge';
          changeValue.textContent = `${percentDiff > 0 ? '▲' : percentDiff < 0 ? '▼' : ''} ${Math.abs(Math.round(percentDiff * 10) / 10)}%`;
          changeValue.style.padding = '2px 8px';
          changeValue.style.borderRadius = '4px';
          changeValue.style.fontWeight = 'bold';
          changeValue.style.fontSize = '0.9em';
          
          if (percentDiff > 0) {
            changeValue.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
            changeValue.style.color = '#15803d';
          } else if (percentDiff < 0) {
            changeValue.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
            changeValue.style.color = '#b91c1c';
          } else {
            changeValue.style.backgroundColor = 'rgba(107, 114, 128, 0.2)';
            changeValue.style.color = '#4b5563';
          }
          
          const compDate = document.createElement('span');
          const prevWorkoutDate = mostRecentPrevWorkout.split('_')[1];
          compDate.textContent = ` vs. ${new Date(prevWorkoutDate).toLocaleDateString()}`;
          compDate.style.fontSize = '0.85em';
          compDate.style.color = '#6b7280';
          
          volumeChange.appendChild(changeValue);
          volumeChange.appendChild(compDate);
          volumeSummary.appendChild(volumeTitle);
          volumeSummary.appendChild(volumeValue);
          volumeSummary.appendChild(volumeChange);
        } else {
          volumeSummary.appendChild(volumeTitle);
          volumeSummary.appendChild(volumeValue);
        }
      } else {
        volumeSummary.appendChild(volumeTitle);
        volumeSummary.appendChild(volumeValue);
      }
      
      container.appendChild(volumeSummary);
    }
    
    // Add stats if available
    if (workout._stats) {
      const statsDetail = document.createElement('div');
      statsDetail.className = 'exercise-detail';
      statsDetail.style.marginBottom = '20px';
      statsDetail.style.border = '1px solid #e5e7eb';
      statsDetail.style.borderRadius = '8px';
      statsDetail.style.overflow = 'hidden';
      
      const statsHeader = document.createElement('div');
      statsHeader.className = 'exercise-detail-header';
      statsHeader.style.padding = '12px 15px';
      statsHeader.style.backgroundColor = '#f3f4f6';
      statsHeader.style.borderBottom = '1px solid #e5e7eb';
      
      const statsTitle = document.createElement('h4');
      statsTitle.className = 'exercise-detail-title';
      statsTitle.textContent = 'Stats';
      statsTitle.style.margin = '0';
      statsTitle.style.fontSize = '1.1em';
      statsTitle.style.fontWeight = 'bold';
      statsTitle.style.color = '#1f2937';
      
      statsHeader.appendChild(statsTitle);
      statsDetail.appendChild(statsHeader);
      
      const statsContent = document.createElement('div');
      statsContent.style.padding = '15px';
      statsContent.style.backgroundColor = 'white';
      
      const stats = workout._stats;
      
      if (stats.bodyWeight) {
        const weight = document.createElement('p');
        weight.textContent = `Body Weight: ${stats.bodyWeight} `;
        weight.style.margin = '10px 0';
        weight.style.fontSize = '0.95em';
        weight.style.color = '#4b5563';
        weight.style.padding = '4px 0';
        weight.style.borderBottom = '1px solid #f3f4f6';
        
        // Create label and value span elements
        const label = document.createElement('span');
        label.textContent = 'Body Weight: ';
        label.style.fontWeight = 'bold';
        label.style.color = '#374151';
        
        const value = document.createElement('span');
        value.textContent = `${stats.bodyWeight} `;
        
        weight.textContent = '';
        weight.appendChild(label);
        weight.appendChild(value);
        
        statsContent.appendChild(weight);
      }
      
      if (stats.protein) {
        const protein = document.createElement('p');
        protein.style.margin = '10px 0';
        protein.style.fontSize = '0.95em';
        protein.style.color = '#4b5563';
        protein.style.padding = '4px 0';
        protein.style.borderBottom = '1px solid #f3f4f6';
        
        // Create label and value span elements
        const label = document.createElement('span');
        label.textContent = 'Protein: ';
        label.style.fontWeight = 'bold';
        label.style.color = '#374151';
        
        const value = document.createElement('span');
        value.textContent = `${stats.protein} g`;
        
        protein.appendChild(label);
        protein.appendChild(value);
        
        statsContent.appendChild(protein);
      }
      
      if (stats.creatine) {
        const creatine = document.createElement('p');
        creatine.style.margin = '10px 0';
        creatine.style.fontSize = '0.95em';
        creatine.style.color = '#4b5563';
        creatine.style.padding = '4px 0';
        creatine.style.borderBottom = '1px solid #f3f4f6';
        
        // Create label and value span elements
        const label = document.createElement('span');
        label.textContent = 'Creatine: ';
        label.style.fontWeight = 'bold';
        label.style.color = '#374151';
        
        const value = document.createElement('span');
        value.textContent = `${stats.creatine} g`;
        
        creatine.appendChild(label);
        creatine.appendChild(value);
        
        statsContent.appendChild(creatine);
      }
      
      if (stats.date) {
        const date = document.createElement('p');
        date.style.margin = '10px 0';
        date.style.fontSize = '0.95em';
        date.style.color = '#4b5563';
        date.style.padding = '4px 0';
        
        // Create label and value span elements
        const label = document.createElement('span');
        label.textContent = 'Date: ';
        label.style.fontWeight = 'bold';
        label.style.color = '#374151';
        
        const value = document.createElement('span');
        value.textContent = stats.date;
        
        date.appendChild(label);
        date.appendChild(value);
        
        statsContent.appendChild(date);
      }
      
      statsDetail.appendChild(statsContent);
      container.appendChild(statsDetail);
    }
    
    // Initialize any Lucide icons that were added dynamically
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }
  
  // Load user data
  window.loadUserData = function() {
    const bodyWeightInput = document.getElementById('bodyWeightInput');
    const proteinInput = document.getElementById('proteinInput');
    const creatineInput = document.getElementById('creatineInput');
    
    if (!bodyWeightInput || !proteinInput || !creatineInput) return;
    
    // Try to find latest stats for user
    const userWorkouts = Object.keys(window.state.workoutHistory)
      .filter(key => key.startsWith(`${window.state.currentUser}_`))
      .sort((a, b) => {
        const partsA = a.split('_');
        const partsB = b.split('_');
        
        let dateA, dateB;
        
        if (partsA.length > 2) {
          dateA = parseInt(partsA[2]);
        } else {
          dateA = new Date(partsA[1]).getTime();
        }
        
        if (partsB.length > 2) {
          dateB = parseInt(partsB[2]);
        } else {
          dateB = new Date(partsB[1]).getTime();
        }
        
        return dateB - dateA; // Latest first
      });
    
    let stats = {
      bodyWeight: '',
      protein: '',
      creatine: ''
    };
    
    // Get stats from most recent workout
    if (userWorkouts.length > 0) {
      const latestWorkout = window.state.workoutHistory[userWorkouts[0]];
      if (latestWorkout && latestWorkout._stats) {
        stats = latestWorkout._stats;
      }
    }
    
    // Update inputs
    bodyWeightInput.value = stats.bodyWeight || '';
    proteinInput.value = stats.protein || '';
    creatineInput.value = stats.creatine || '';
  };
  
  // Save user stats
  window.saveUserStats = function() {
    // Just trigger workout save which will include stats
  };
  
  // Initialize the application
  console.log("Running UI initialization...");
  
  // Try to load users from localStorage
  try {
    const storedUsers = localStorage.getItem('workoutApp_users'); // Moved inside try
    if (storedUsers) { 
        const users = JSON.parse(storedUsers);
        if (Array.isArray(users) && users.length > 0) {
          window.state.users = users;
        }
    }
  } catch (e) {
    console.error("Error accessing or parsing users from localStorage:", e);
    // Optionally set a default user if loading fails
    // window.state.users = ["Default"]; 
  }
  
  // Initialize user display
  const currentUserDisplay = document.getElementById('currentUserDisplay');
  const historyUserDisplay = document.getElementById('historyUserDisplay');
  
  if (currentUserDisplay) currentUserDisplay.textContent = window.state.currentUser;
  if (historyUserDisplay) historyUserDisplay.textContent = window.state.currentUser;
  
  // Set up date selector - initialize the calendar component if available
  if (window.Calendar) {
    const calendarContainer = document.getElementById('calendarContainer');
    if (calendarContainer) {
      // Initialize calendar with date selection callback
      window.Calendar.initialize('calendarContainer', (dateString) => {
        // Update selected date when calendar date is clicked
        window.state.selectedDate = new Date(dateString);
        
        // Update workout type based on day of week
        const day = getDayOfWeek(window.state.selectedDate);
        const workoutType = getWorkoutTypeForDay(day);
        window.state.workoutType = workoutType;
        
        // Update workout type displays
        const workoutTypeDisplay = document.getElementById('workoutTypeDisplay');
        if (workoutTypeDisplay) {
          workoutTypeDisplay.textContent = workoutType;
        }
        
        // Update workout focus display and category buttons
        window.renderExerciseCategoryButtons();
        
        // Refresh UI with new date
        if (window.loadUserData) {
          window.loadUserData();
        }
      });
      
      // Set workout dates based on history data
      updateCalendarWithWorkoutDates();
      
      console.log("Calendar initialized");
    } else {
      // Fall back to legacy date selector
      console.log("Calendar container not found, using legacy date selector");
      setupDateSelector();
    }
  } else {
    // Fall back to legacy date selector
    console.log("Calendar component not available, using legacy date selector");
    setupDateSelector();
  }
  
  // Load user data
  window.loadUserData();
  
  // Set up event listeners
  window.setupEventListeners();
  
  // Render exercise category buttons on the main page
  window.renderExerciseCategoryButtons();
  
  // Render the main exercise category dropdowns
  renderExerciseCategories(); // Ensure main categories render on init
  console.log("[INIT] Content of #mainExerciseListContainer after render:", document.getElementById('mainExerciseListContainer')?.innerHTML); // LOG ADDED
  
  console.log("Application initialization complete");
  
  // Add event listener for category toggles, with safeguard
  const mainListContainer = document.getElementById('mainExerciseListContainer');
  if (mainListContainer) {
    // Remove any existing handler to prevent duplicates
    mainListContainer.removeEventListener('click', handleCategoryClick);
    // Add our handler
    mainListContainer.addEventListener('click', handleCategoryClick);
    console.log("Delegated click handler added to mainExerciseListContainer");
  } else {
    console.error("Could not find mainExerciseListContainer to attach delegated listener");
  }
  
  // Function to open the manage workouts modal
  window.openManageWorkoutsModal = function() {
    const modal = document.getElementById('manageWorkoutsModal');
    if (modal) {
      modal.classList.remove('hidden');
      // Render the workouts list when opening the modal
      window.renderManageWorkoutsList();
    }
  };
  
  // Function to close the manage workouts modal
  window.closeManageWorkoutsModal = function() {
    const modal = document.getElementById('manageWorkoutsModal');
    if (modal) {
      modal.classList.add('hidden');
    }
  };
  
  // Function to render the list of workouts in the manage workouts modal
  window.renderManageWorkoutsList = function() {
    const listContainer = document.getElementById('manageWorkoutsList');
    if (!listContainer) {
      console.error("Cannot find manageWorkoutsList container");
      return;
    }
    
    console.log("Rendering manage workouts list");
    
    // Clear previous content
    listContainer.innerHTML = '';
    
    // Filter workouts for current user and sort by date (newest first)
    const userWorkouts = Object.keys(window.state.workoutHistory)
      .filter(key => key.startsWith(`${window.state.currentUser}_`))
      .sort((a, b) => {
        // Sort by date (latest first)
        const dateA = new Date(a.split('_')[1]);
        const dateB = new Date(b.split('_')[1]);
        return dateB - dateA;
      });
    
    if (userWorkouts.length === 0) {
      listContainer.innerHTML = '<p class="empty-message">No workouts found for this user.</p>';
      return;
    }
    
    console.log(`Found ${userWorkouts.length} workouts for ${window.state.currentUser}`);
    
    // Create a list of workouts with delete buttons
    userWorkouts.forEach(key => {
      const parts = key.split('_');
      const date = parts[1]; // The date part
      
      const workout = window.state.workoutHistory[key];
      if (!workout) {
        console.warn(`No workout data found for key: ${key}`);
        return;
      }
      
      const exercises = Object.keys(workout).filter(e => e !== '_stats' && !e.startsWith('_'));
      console.log(`Workout ${key}: ${exercises.length} exercises`);
      
      // Create workout item
      const item = document.createElement('div');
      item.className = 'manage-workout-item';
      
      // Date and exercise count
      const info = document.createElement('div');
      info.className = 'workout-info';
      info.innerHTML = `<strong>${new Date(date).toDateString()}</strong> - ${exercises.length} exercises`;
      
      // Delete button
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-btn';
      deleteBtn.innerHTML = '<i data-lucide="trash-2"></i> Delete';
      deleteBtn.onclick = function() {
        // Call our global deleteWorkout function
        window.deleteWorkout(key);
      };
      
      // Add elements to item
      item.appendChild(info);
      item.appendChild(deleteBtn);
      
      // Add item to container
      listContainer.appendChild(item);
    });
    
    // Initialize Lucide icons
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
    
    console.log("Manage workouts list rendering complete");
  };
  
  // Direct implementation of deleteWorkout function
  window.deleteWorkout = function(workoutKey) {
    console.log("Deleting workout with key:", workoutKey);
    
    if (!workoutKey) {
      console.error("No workout key provided for deletion");
      return;
    }
    
    if (confirm('Are you sure you want to delete this workout?')) {
      // Delete from state
      if (window.state.workoutHistory[workoutKey]) {
        delete window.state.workoutHistory[workoutKey];
        console.log("Deleted workout from state");
        
        // Save to localStorage
        try {
          localStorage.setItem('workoutApp_history', JSON.stringify(window.state.workoutHistory));
          console.log("Updated localStorage after deletion");
        } catch (e) {
          console.error("Error saving to localStorage:", e);
        }
        
        // Save to server if StorageService is available
        if (typeof StorageService !== 'undefined' && typeof StorageService.saveWorkoutHistory === 'function') {
          StorageService.saveWorkoutHistory(window.state.workoutHistory)
            .then(success => {
              console.log("Updated server after deletion:", success);
            })
            .catch(error => {
              console.error("Error saving deletion to server:", error);
            });
        }
        
        // Re-render workout history
        if (typeof window.renderWorkoutHistory === 'function') {
          window.renderWorkoutHistory();
          console.log("Re-rendered workout history");
        }
        
        // Re-render manage workouts list if modal is open
        if (typeof window.renderManageWorkoutsList === 'function') {
          const modal = document.getElementById('manageWorkoutsModal');
          if (modal && !modal.classList.contains('hidden')) {
            window.renderManageWorkoutsList();
            console.log("Re-rendered manage workouts list");
          }
        }
        
        // Update calendar with workout dates
        if (typeof updateCalendarWithWorkoutDates === 'function') {
          updateCalendarWithWorkoutDates();
          console.log("Updated calendar workout dates");
        }
        
        console.log("Workout deletion completed successfully");
      } else {
        console.error("Workout not found in state:", workoutKey);
      }
    }
  };
});

// Date selector setup
function setupDateSelector() {
  const dateSelector = document.querySelector('.date-scroller');
  if (!dateSelector) {
    console.error("Cannot find date-scroller element");
    return;
  }
  
  dateSelector.innerHTML = '';
  
  const weekDates = getWeekDates();
  
  weekDates.forEach(date => {
    const dateBtn = document.createElement('button');
    dateBtn.className = 'date-btn';
    dateBtn.setAttribute('data-date', date.toISOString());
    
    if (date.toDateString() === window.state.selectedDate.toDateString()) {
      dateBtn.classList.add('selected');
    }
    
    const dayName = document.createElement('span');
    dayName.className = 'day-name';
    dayName.textContent = date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    
    dateBtn.appendChild(dayName);
    dateBtn.appendChild(dayNumber);
    
    dateBtn.addEventListener('click', () => {
      selectDate(date);
    });
    
    dateSelector.appendChild(dateBtn);
  });
}

// Select a date
function selectDate(date) {
  window.state.selectedDate = date;
  
  const day = getDayOfWeek(date);
  window.state.workoutType = defaultSplitDays[day] || "Upper Body";
  window.state.exercises = defaultWorkouts[window.state.workoutType] || [];
  
  // Update date selector UI
  const dateBtns = document.querySelectorAll('.date-btn');
  dateBtns.forEach(btn => {
    btn.classList.remove('selected');
  });
  
  const selectedDateBtn = Array.from(dateBtns).find(btn => {
    const btnDateStr = btn.getAttribute('data-date');
    if (btnDateStr) {
      const btnDate = new Date(btnDateStr);
      return btnDate.toDateString() === date.toDateString();
    }
    return false;
  });
  
  if (selectedDateBtn) {
    selectedDateBtn.classList.add('selected');
  }
  
  // Update workout focus display and category buttons
  renderExerciseCategoryButtons();
}

// Module-level handleCategoryClick function for dropdown menus
function handleCategoryClick(event) {
  // Find if we clicked on or within a category header
  const header = event.target.closest('.category-header');
  if (!header) return; // Not a category header - exit
  
  // Find the exercises container (next sibling of the header)
  const exercisesContainer = header.nextElementSibling;
  // Find the toggle icon
  const toggleIcon = header.querySelector('.toggle-icon');
  
  if (!exercisesContainer || !toggleIcon) {
    console.error('Could not find exercisesContainer or toggleIcon for header:', header);
    return;
  }
  
  // Simple class toggle for visibility
  const isCurrentlyVisible = exercisesContainer.classList.contains('visible');
  console.log(`Category clicked: ${header.querySelector('.section-subtitle')?.textContent}. Currently visible: ${isCurrentlyVisible}`);
  
  // Toggle visibility
  exercisesContainer.classList.toggle('visible');
  // Toggle icon rotation
  toggleIcon.classList.toggle('rotated');
  // Also update the icon content for extra clarity
  toggleIcon.innerHTML = isCurrentlyVisible ? '▶' : '▼';
}

// Function to update calendar with workout dates
function updateCalendarWithWorkoutDates() {
  // Make sure Calendar component is available
  if (!window.Calendar || typeof window.Calendar.markDates !== 'function') {
    console.warn('Calendar component or markDates method not available');
    return;
  }

  // Make sure we have workout history data
  if (!window.state.workoutHistory || Object.keys(window.state.workoutHistory).length === 0) {
    console.log('No workout history to update calendar');
    return;
  }

  console.log('Updating calendar with workout dates');
  
  // Get workout dates for the current user
  const workoutDates = Object.keys(window.state.workoutHistory)
    .filter(key => key.startsWith(`${window.state.currentUser}_`))
    .map(key => {
      // Extract date from the key format: username_date_timestamp
      const parts = key.split('_');
      return parts.length > 1 ? parts[1] : null;
    })
    .filter(date => date !== null); // Remove any null values
  
  // Convert to array of Date objects
  const dateObjects = workoutDates.map(dateStr => new Date(dateStr));
  
  console.log(`Found ${dateObjects.length} workout dates for ${window.state.currentUser}`);
  
  // Mark dates on calendar
  window.Calendar.markDates(dateObjects);
}
