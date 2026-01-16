// debug.js - Contains standalone debugging code to directly load data

// Add debug logging functionality
window.debugLog = function(message, data) {
  const timestamp = new Date().toLocaleTimeString();
  const logPrefix = `[DEBUG ${timestamp}]`;
  console.log(logPrefix, message);
  
  if (data !== undefined) {
    console.log(data);
  }
  
  // Add to DOM debug panel if it exists
  const debugPanel = document.getElementById('debugPanel');
  if (debugPanel) {
    const logItem = document.createElement('div');
    logItem.className = 'debug-log-item';
    logItem.innerHTML = `<span class="debug-timestamp">${timestamp}</span> ${message}`;
    debugPanel.appendChild(logItem);
    
    // Auto-scroll to bottom
    debugPanel.scrollTop = debugPanel.scrollHeight;
  }
};

// Create debug UI
function createDebugInterface() {
  // Create debug panel
  const debugPanel = document.createElement('div');
  debugPanel.id = 'debugPanel';
  debugPanel.style.cssText = 'position: fixed; bottom: 80px; right: 10px; width: 300px; max-height: 200px; background: rgba(0,0,0,0.8); color: lime; font-family: monospace; font-size: 12px; padding: 10px; z-index: 9999; overflow-y: auto; display: none;';
  document.body.appendChild(debugPanel);
  
  // Add debug controls
  const debugControls = document.createElement('div');
  debugControls.id = 'debugControls';
  debugControls.style.cssText = 'position: fixed; bottom: 10px; right: 10px; display: none; z-index: 9999;';
  
  // Add some useful debug buttons
  const reloadDataBtn = document.createElement('button');
  reloadDataBtn.textContent = 'Reload Data';
  reloadDataBtn.style.cssText = 'margin-right: 5px; padding: 5px; background: #007bff; color: white; border: none; border-radius: 3px;';
  reloadDataBtn.onclick = function() {
    window.debugLog('Manual data reload triggered');
    loadWorkoutHistoryFromFile().then(() => {
      window.debugLog('Data reloaded', Object.keys(window.state.workoutHistory).length + ' entries');
      window.renderWorkoutHistory();
    });
  };
  
  const toggleLogBtn = document.createElement('button');
  toggleLogBtn.textContent = 'Toggle Log';
  toggleLogBtn.style.cssText = 'margin-right: 5px; padding: 5px; background: #28a745; color: white; border: none; border-radius: 3px;';
  toggleLogBtn.onclick = function() {
    debugPanel.style.display = debugPanel.style.display === 'none' ? 'block' : 'none';
    window.debugLog('Debug panel toggled');
  };
  
  debugControls.appendChild(reloadDataBtn);
  debugControls.appendChild(toggleLogBtn);
  
  document.body.appendChild(debugControls);
  
  // Add triple-tap listener to header to show debug controls
  let tapCount = 0;
  const header = document.querySelector('.app-header');
  if (header) {
    header.addEventListener('click', function() {
      tapCount++;
      
      if (tapCount >= 3) {
        debugControls.style.display = debugControls.style.display === 'none' ? 'flex' : 'none';
        tapCount = 0;
      }
      
      // Reset tap count after delay
      setTimeout(() => { tapCount = 0; }, 1000);
    });
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  console.log('Debug script loaded and running');
  
  // Create debug interface
  createDebugInterface();
  
  // Force hide offline message immediately
  setTimeout(() => {
    const connectionStatus = document.getElementById('connectionStatus');
    if (connectionStatus) {
      connectionStatus.classList.add('hidden');
      window.debugLog('Offline message hidden');
    }
  }, 100);
  
  // Try to use the preloaded workout data
  if (window.preloadedWorkoutData && Object.keys(window.preloadedWorkoutData).length > 0) {
    window.debugLog('Using preloaded workout data:', 
      Object.keys(window.preloadedWorkoutData).length + ' entries');
    
    // Store in global window object for emergency access
    window.directWorkoutData = window.preloadedWorkoutData;
    
    // Wait 1 second, then click the history tab
    setTimeout(() => {
      debugShowHistory();
    }, 1000);
  } 
  // Fall back to loading from file if preloaded data is not available
  else {
    try {
      window.debugLog('Preloaded data not found, loading from JSON file...');
      
      // Try multiple sources
      const sources = [
        { name: 'Direct JSON', url: 'https://motorolascada.com/workouts.json' },
        { name: 'API Endpoint', url: 'https://motorolascada.com/get_workouts.php' }
      ];
      
      // Try each source until successful
      for (const source of sources) {
        try {
          window.debugLog(`Trying to load from ${source.name}`);
          const response = await fetch(source.url);
          
          if (response.ok) {
            const jsonData = await response.json();
            
            if (jsonData && jsonData.workoutHistory) {
              window.debugLog(`Loaded workout history data from ${source.name}:`, 
                Object.keys(jsonData.workoutHistory).length + ' entries');
              
              // Store in global window object for emergency access
              window.directWorkoutData = jsonData.workoutHistory;
              
              // Save to localStorage
              localStorage.setItem('workoutApp_history', 
                JSON.stringify(jsonData.workoutHistory));
              
              // Try to directly update the UI state if it exists
              if (window.state) {
                window.state.workoutHistory = jsonData.workoutHistory;
                window.debugLog('Updated state with workout history data');
              }
                
              // Wait 1 second, then click the history tab
              setTimeout(() => {
                debugShowHistory();
              }, 1000);
              
              // Found data, so exit the loop
              break;
            }
          }
        } catch (sourceError) {
          window.debugLog(`Error loading from ${source.name}:`, sourceError);
        }
      }
    } catch (err) {
      window.debugLog('Error loading workout data in debug script:', err);
    }
  }
  
  // Check workout history state every 5 seconds
  let emptyHistoryWarned = false;
  setInterval(() => {
    if (window.state && window.state.workoutHistory) {
      const count = Object.keys(window.state.workoutHistory).length;
      if (count === 0 && !emptyHistoryWarned) {
        window.debugLog('WARNING: workoutHistory is empty - attempting recovery');
        emptyHistoryWarned = true;
        
        // Recovery attempt - try emergency data loading
        if (window.directWorkoutData && Object.keys(window.directWorkoutData).length > 0) {
          window.state.workoutHistory = window.directWorkoutData;
          window.debugLog('Recovered workout history from emergency backup');
          
          if (window.state.activeTab === 'history') {
            setTimeout(() => {
              if (typeof window.renderWorkoutHistory === 'function') {
                window.renderWorkoutHistory();
              } else {
                emergencyHistoryRender();
              }
            }, 100);
          }
        }
      }
    }
  }, 5000);
});

// Function to force display of history
function debugShowHistory() {
  console.log('Force showing history tab and rendering...');
  
  // Try to call renderWorkoutHistory directly if it exists
  if (typeof renderWorkoutHistory === 'function') {
    try {
      // First try to switch to history tab
      const historyTab = document.getElementById('historyTabBtn');
      if (historyTab) {
        historyTab.click();
        console.log('Clicked history tab');
      }
      
      // Then try to render history directly
      renderWorkoutHistory();
      console.log('Called renderWorkoutHistory');
      
      // Set up watch to monitor the content
      setTimeout(checkHistoryContent, 1000);
    } catch (err) {
      console.error('Error calling renderWorkoutHistory:', err);
      emergencyHistoryRender();
    }
  } else {
    console.error('renderWorkoutHistory function not found, using emergency renderer');
    emergencyHistoryRender();
  }
}

// Function to check if history content is rendered
function checkHistoryContent() {
  const container = document.getElementById('workoutHistoryContainer');
  if (container && container.children.length === 0) {
    console.log('History container is empty, using emergency renderer');
    emergencyHistoryRender();
  } else if (container) {
    console.log('History container has content:', container.children.length, 'items');
  }
}

// Emergency function to render history directly from JSON data
function emergencyHistoryRender() {
  if (!window.directWorkoutData) {
    console.error('No direct workout data available');
    return;
  }
  
  const container = document.getElementById('workoutHistoryContainer');
  const noHistoryMsg = document.getElementById('noHistoryMsg');
  
  if (!container) {
    console.error('Cannot find workoutHistoryContainer');
    return;
  }
  
  // Hide no history message
  if (noHistoryMsg) {
    noHistoryMsg.classList.add('hidden');
  }
  
  // Clear container
  container.innerHTML = '';
  
  // Get current user
  const currentUser = document.getElementById('currentUserDisplay')?.textContent || 'Jared';
  
  // Filter and sort workouts
  const workouts = Object.keys(window.directWorkoutData)
    .filter(key => key.startsWith(currentUser + '_'))
    .sort((a, b) => {
      const dateA = new Date(a.split('_')[1]);
      const dateB = new Date(b.split('_')[1]);
      return dateB - dateA;
    });
  
  console.log('Emergency rendering', workouts.length, 'workouts for', currentUser);
  
  // Render each workout
  workouts.forEach(key => {
    const workout = window.directWorkoutData[key];
    const date = key.split('_')[1];
    
    // Create history item
    const item = document.createElement('div');
    item.className = 'history-item';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'history-header';
    
    const dateHeading = document.createElement('h3');
    dateHeading.className = 'history-date';
    dateHeading.textContent = new Date(date).toDateString();
    header.appendChild(dateHeading);
    
    // Create toggle button
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'toggle-btn';
    
    const downIcon = document.createElement('i');
    downIcon.setAttribute('data-lucide', 'chevron-down');
    downIcon.className = 'chevron-down-icon';
    
    const upIcon = document.createElement('i');
    upIcon.setAttribute('data-lucide', 'chevron-up');
    upIcon.className = 'chevron-up-icon hidden';
    
    toggleBtn.appendChild(downIcon);
    toggleBtn.appendChild(upIcon);
    header.appendChild(toggleBtn);
    item.appendChild(header);
    
    // Create exercises section
    const exercises = document.createElement('div');
    exercises.className = 'history-exercises';
    
    const exercisesLabel = document.createElement('div');
    exercisesLabel.className = 'exercises-label';
    exercisesLabel.textContent = 'Exercises:';
    exercises.appendChild(exercisesLabel);
    
    const tags = document.createElement('div');
    tags.className = 'exercise-tags';
    
    // Add exercise tags
    const exerciseNames = Object.keys(workout).filter(e => e !== '_stats');
    exerciseNames.forEach(exercise => {
      const tag = document.createElement('span');
      tag.className = 'exercise-tag';
      tag.textContent = exercise;
      tags.appendChild(tag);
    });
    
    exercises.appendChild(tags);
    item.appendChild(exercises);
    
    // Create details section (initially hidden)
    const details = document.createElement('div');
    details.className = 'history-details hidden';
    item.appendChild(details);
    
    // Add toggle functionality
    toggleBtn.addEventListener('click', () => {
      const isExpanded = !details.classList.contains('hidden');
      
      details.classList.toggle('hidden', isExpanded);
      downIcon.classList.toggle('hidden', !isExpanded);
      upIcon.classList.toggle('hidden', isExpanded);
      
      // Render details if expanding
      if (!isExpanded) {
        renderWorkoutDetails(workout, details);
      }
    });
    
    // Add to container
    container.appendChild(item);
  });
  
  // Initialize icons
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
  
  console.log('Emergency history render complete');
}

// Render workout details
function renderWorkoutDetails(workout, container) {
  container.innerHTML = '';
  
  // Get exercise names (excluding stats)
  const exercises = Object.keys(workout).filter(e => e !== '_stats');
  
  // For each exercise
  exercises.forEach(exercise => {
    const exerciseData = workout[exercise];
    
    // Only render if it has sets
    if (!exerciseData || !exerciseData.sets) return;
    
    // Create exercise detail
    const detail = document.createElement('div');
    detail.className = 'exercise-detail';
    
    // Create header
    const header = document.createElement('div');
    header.className = 'exercise-detail-header';
    
    const title = document.createElement('h4');
    title.className = 'exercise-detail-title';
    title.textContent = exercise;
    
    header.appendChild(title);
    detail.appendChild(header);
    
    // Create sets table
    const table = document.createElement('div');
    table.className = 'sets-table';
    
    // Create table header
    const tableHeader = document.createElement('div');
    tableHeader.className = 'sets-table-header';
    
    const setHeader = document.createElement('div');
    setHeader.className = 'set-header';
    setHeader.textContent = 'Set';
    
    const weightHeader = document.createElement('div');
    weightHeader.className = 'weight-header';
    weightHeader.textContent = 'Weight';
    
    const repsHeader = document.createElement('div');
    repsHeader.className = 'reps-header';
    repsHeader.textContent = 'Reps';
    
    tableHeader.appendChild(setHeader);
    tableHeader.appendChild(weightHeader);
    tableHeader.appendChild(repsHeader);
    table.appendChild(tableHeader);
    
    // Add set rows
    exerciseData.sets.forEach((set, index) => {
      if (!set.weight && !set.reps) return;
      
      const row = document.createElement('div');
      row.className = 'set-detail-row';
      
      const setNum = document.createElement('div');
      setNum.className = 'set-num';
      setNum.textContent = index + 1;
      
      const weight = document.createElement('div');
      weight.className = 'weight-value';
      weight.textContent = set.weight || '-';
      
      const reps = document.createElement('div');
      reps.className = 'reps-value';
      reps.textContent = set.reps || '-';
      
      row.appendChild(setNum);
      row.appendChild(weight);
      row.appendChild(reps);
      table.appendChild(row);
    });
    
    detail.appendChild(table);
    container.appendChild(detail);
  });
  
  // Add stats if available
  if (workout._stats) {
    const statsDetail = document.createElement('div');
    statsDetail.className = 'exercise-detail';
    
    const statsHeader = document.createElement('div');
    statsHeader.className = 'exercise-detail-header';
    
    const statsTitle = document.createElement('h4');
    statsTitle.className = 'exercise-detail-title';
    statsTitle.textContent = 'Stats';
    
    statsHeader.appendChild(statsTitle);
    statsDetail.appendChild(statsHeader);
    
    const statsContent = document.createElement('div');
    statsContent.style.padding = '10px 0';
    
    const stats = workout._stats;
    
    if (stats.bodyWeight) {
      const weight = document.createElement('p');
      weight.textContent = `Body Weight: ${stats.bodyWeight} lbs`;
      weight.style.margin = '5px 0';
      statsContent.appendChild(weight);
    }
    
    if (stats.protein) {
      const protein = document.createElement('p');
      protein.textContent = `Protein: ${stats.protein} g`;
      protein.style.margin = '5px 0';
      statsContent.appendChild(protein);
    }
    
    if (stats.creatine) {
      const creatine = document.createElement('p');
      creatine.textContent = `Creatine: ${stats.creatine} g`;
      creatine.style.margin = '5px 0';
      statsContent.appendChild(creatine);
    }
    
    if (stats.date) {
      const date = document.createElement('p');
      date.textContent = `Date: ${stats.date}`;
      date.style.margin = '5px 0';
      statsContent.appendChild(date);
    }
    
    statsDetail.appendChild(statsContent);
    container.appendChild(statsDetail);
  }
}