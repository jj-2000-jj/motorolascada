// file: history-fix.js
// Consolidated history tab fix for Shred-O-Tron 2000

// Create a more reliable history loader that overrides existing functions
(function() {
  console.log("Installing improved workout history loader...");
  
  // Define a function to safely create DOM elements with attributes and properties
  function createElement(tag, attributes = {}, properties = {}, children = []) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    
    // Set properties
    Object.entries(properties).forEach(([key, value]) => {
      element[key] = value;
    });
    
    // Add children
    children.forEach(child => {
      if (typeof child === 'string') {
        element.textContent = child;
      } else if (child instanceof Node) {
        element.appendChild(child);
      }
    });
    
    return element;
  }
  
  // Reliable function to load workout history data
  async function loadWorkoutData() {
    console.log("Loading workout history data...");
    
    // Try multiple data sources in order of reliability
    let workoutData = null;
    
    // 1. First try to use preloaded data (from the embedded script in shred.html)
    if (window.preloadedWorkoutData && Object.keys(window.preloadedWorkoutData).length > 0) {
      console.log("Using preloaded workout data");
      workoutData = window.preloadedWorkoutData;
    }
    // 2. Try emergency data if available
    else if (window.directWorkoutData && Object.keys(window.directWorkoutData).length > 0) {
      console.log("Using emergency workout data");
      workoutData = window.directWorkoutData;
    }
    // 3. Try localStorage
    else {
      try {
        const storedData = localStorage.getItem('workoutApp_history');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          if (Object.keys(parsedData).length > 0) {
            console.log("Using data from localStorage");
            workoutData = parsedData;
          }
        }
      } catch (e) {
        console.error("Error loading from localStorage:", e);
      }
    }
    
    // 4. If all else fails, try to fetch from file - try multiple paths
    if (!workoutData) {
      try {
        // Only use the hardcoded URL
        const possiblePaths = [
          'https://motorolascada.com/workouts.json',  // Direct JSON file
          'https://motorolascada.com/get_workouts.php' // API endpoint
        ];
        
        console.log("Fetching workout data from files, trying multiple paths...");
        
        // Try each path in sequence
        for (const path of possiblePaths) {
          try {
            console.log(`Trying to load from: ${path}`);
            const response = await fetch(path);
            
            if (response.ok) {
              const data = await response.json();
              console.log(`Successfully loaded data from ${path}`);
              
              if (data.workoutHistory) {
                console.log(`Found ${Object.keys(data.workoutHistory).length} workout entries`);
                workoutData = data.workoutHistory;
                break; // Exit the loop as we found data
              } else {
                console.warn(`No workoutHistory property in ${path}`);
              }
            } else {
              console.warn(`Failed to load from ${path}: ${response.status}`);
            }
          } catch (pathError) {
            console.warn(`Error trying path ${path}:`, pathError);
          }
        }
        
        // If we still don't have data, try a direct XMLHttpRequest as a last resort
        if (!workoutData) {
          console.log("Trying XMLHttpRequest as a last resort");
          
          const loadWithXHR = (path) => {
            return new Promise((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              xhr.overrideMimeType("application/json");
              xhr.open('GET', path, true);
              xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                  if (xhr.status === 200) {
                    try {
                      const data = JSON.parse(xhr.responseText);
                      resolve(data);
                    } catch (e) {
                      reject(e);
                    }
                  } else {
                    reject(new Error(`XHR failed: ${xhr.status}`));
                  }
                }
              };
              xhr.send(null);
            });
          };
          
          for (const path of possiblePaths) {
            try {
              const data = await loadWithXHR(path);
              if (data && data.workoutHistory) {
                console.log(`XHR: Successfully loaded from ${path}`);
                workoutData = data.workoutHistory;
                break;
              }
            } catch (xhrError) {
              console.warn(`XHR error for ${path}:`, xhrError);
            }
          }
        }
      } catch (e) {
        console.error("Error in file loading process:", e);
      }
    }
    
    // 5. If all loading methods have failed, log the error but don't use hardcoded data
    if (!workoutData) {
      console.error("All data loading methods failed. Check workouts.json file in ./data/ directory.");
      // Explicitly setting to empty object rather than hardcoded data
      workoutData = {};
    }
    
    // Update all sources of truth with the data
    if (workoutData) {
      console.log(`Found ${Object.keys(workoutData).length} workout entries`);
      
      // Update all state objects
      if (window.state) {
        window.state.workoutHistory = workoutData;
      }
      window.preloadedWorkoutData = workoutData;
      window.directWorkoutData = workoutData;
      
      // Save to localStorage for future use
      try {
        localStorage.setItem('workoutApp_history', JSON.stringify(workoutData));
      } catch(e) {
        console.error("Could not save to localStorage:", e);
      }
      
      return workoutData;
    }
    
    return null;
  }
  
  // Improved version of renderWorkoutHistory
  async function improvedRenderWorkoutHistory() {
    console.log("Rendering workout history...");
    
    // Get container and message elements
    const container = document.getElementById('workoutHistoryContainer');
    const noHistoryMsg = document.getElementById('noHistoryMsg');
    
    if (!container) {
      console.error("Cannot find workoutHistoryContainer");
      return;
    }
    
    // First make sure we have workout data
    const workoutData = await loadWorkoutData();
    if (!workoutData) {
      console.error("Failed to load workout data");
      if (noHistoryMsg) {
        noHistoryMsg.classList.remove('hidden');
      }
      return;
    }
    
    // Get current user
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    let currentUser = "Jared"; // Default
    
    if (currentUserDisplay) {
      currentUser = currentUserDisplay.textContent.trim();
      console.log(`Current user from display: "${currentUser}"`);
    } else {
      console.warn("currentUserDisplay element not found, using default user");
    }
    
    // Filter workouts for current user - no case sensitivity
    const userWorkouts = Object.keys(workoutData)
      .filter(key => {
        // First component of the key should be the username
        const keyParts = key.split('_');
        const keyUser = keyParts[0];
        
        // Case-insensitive comparison
        const isMatch = keyUser.toLowerCase() === currentUser.toLowerCase();
        
        if (isMatch) {
          console.log(`Matched workout: ${key}`);
        }
        
        return isMatch;
      })
      .sort((a, b) => {
        // Sort by date/timestamp - newest first
        const partsA = a.split('_');
        const partsB = b.split('_');
        
        let dateA, dateB;
        
        // Improved date parsing logic
        try {
          if (partsA.length > 2 && !isNaN(parseInt(partsA[2]))) {
            // If there's a timestamp part and it's a valid number, use it
            dateA = parseInt(partsA[2]);
          } else {
            // Otherwise try to parse the date part
            const datePart = partsA[1];
            if (datePart) {
              // Check if it's a YYYY-MM-DD format date
              if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                dateA = new Date(datePart).getTime();
              } else {
                // Try to parse it as a date anyway
                dateA = new Date(datePart).getTime();
              }
            } else {
              // Fallback - just use the key string for comparison
              dateA = a;
            }
          }
        } catch (e) {
          console.error(`Error parsing date from key ${a}:`, e);
          dateA = 0; // Default to very old
        }
        
        try {
          if (partsB.length > 2 && !isNaN(parseInt(partsB[2]))) {
            // If there's a timestamp part and it's a valid number, use it
            dateB = parseInt(partsB[2]);
          } else {
            // Otherwise try to parse the date part
            const datePart = partsB[1];
            if (datePart) {
              // Check if it's a YYYY-MM-DD format date
              if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                dateB = new Date(datePart).getTime();
              } else {
                // Try to parse it as a date anyway
                dateB = new Date(datePart).getTime();
              }
            } else {
              // Fallback - just use the key string for comparison
              dateB = b;
            }
          }
        } catch (e) {
          console.error(`Error parsing date from key ${b}:`, e);
          dateB = 0; // Default to very old
        }
        
        return dateB - dateA; // Latest first
      });
    
    console.log(`Found ${userWorkouts.length} workouts for ${currentUser}`);
    
    // Show/hide no history message
    if (noHistoryMsg) {
      noHistoryMsg.classList.toggle('hidden', userWorkouts.length > 0);
      
      // Update the username in the no history message
      const historyUserDisplay = document.getElementById('historyUserDisplay');
      if (historyUserDisplay) {
        historyUserDisplay.textContent = currentUser;
      }
    }
    
    // Clear container
    container.innerHTML = '';
    
    // Get template
    const historyItemTemplate = document.getElementById('historyItemTemplate');
    if (!historyItemTemplate) {
      console.error("Cannot find historyItemTemplate");
      
      // Fallback if template is missing - create history items manually
      userWorkouts.forEach(key => {
        const workout = workoutData[key];
        const parts = key.split('_');
        const date = parts[1]; // Date part
        
        // Create elements manually since template is missing
        const item = createElement('div', { class: 'history-item' });
        const header = createElement('div', { class: 'history-header' });
        const dateHeading = createElement('h3', { class: 'history-date' }, {}, [
          new Date(date).toDateString()
        ]);
        
        header.appendChild(dateHeading);
        item.appendChild(header);
        container.appendChild(item);
      });
      
      return;
    }
    
    // Render each history item (show up to 100 items)
    const MAX_WORKOUTS = 100;
    userWorkouts.slice(0, MAX_WORKOUTS).forEach(key => {
      const workout = workoutData[key];
      const parts = key.split('_');
      const date = parts[1]; // Date part
      
      // Create item from template
      const item = document.importNode(historyItemTemplate.content, true);
      
      // Set date with improved formatting
      let formattedDate;
      try {
        // Check if the date part is in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
          formattedDate = new Date(date).toDateString();
        } else {
          // Try to parse the date in various formats
          const parsedDate = new Date(date);
          formattedDate = isNaN(parsedDate.getTime()) 
            ? date // If parsing failed, just use the date string
            : parsedDate.toDateString();
        }
      } catch (e) {
        console.error(`Error formatting date ${date}:`, e);
        formattedDate = date; // Fallback to the raw date string
      }
      
      item.querySelector('.history-date').textContent = formattedDate;
      
      // Get exercises (exclude metadata)
      const exercises = Object.keys(workout).filter(e => e !== '_stats' && !e.startsWith('_'));
      
      // Add exercise tags
      const tagsContainer = item.querySelector('.exercise-tags');
      exercises.forEach(exercise => {
        const tag = createElement('span', { class: 'exercise-tag' }, {}, [exercise]);
        tagsContainer.appendChild(tag);
      });
      
      // Add toggle functionality
      const toggleBtn = item.querySelector('.toggle-btn');
      const chevronDown = toggleBtn.querySelector('.chevron-down-icon');
      const chevronUp = toggleBtn.querySelector('.chevron-up-icon');
      const details = item.querySelector('.history-details');
      
      if (toggleBtn && details) {
        toggleBtn.addEventListener('click', () => {
          const isExpanded = !details.classList.contains('hidden');
          
          details.classList.toggle('hidden', isExpanded);
          
          // Toggle chevron icons if they exist
          if (chevronDown) chevronDown.classList.toggle('hidden', !isExpanded);
          if (chevronUp) chevronUp.classList.toggle('hidden', isExpanded);
          
          // Load details if expanding
          if (!isExpanded) {
            console.log(`Rendering details for workout: ${key}`, workout);
            renderWorkoutDetails(key, details, workout);
            
            // Force sets to be visible by adding inline style
            setTimeout(() => {
              const setRows = details.querySelectorAll('.set-detail-row');
              console.log(`Found ${setRows.length} set rows to display`);
              setRows.forEach(row => {
                row.style.display = 'flex';
                row.style.opacity = '1';
              });
              
              // Make sure the details element is definitely visible
              details.style.display = 'block';
            }, 100);
          }
        });
      }
      
      container.appendChild(item);
    });
    
    // Initialize icons
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
    
    console.log("Workout history rendered successfully");
  }
  
  // Helper function to render workout details
  function renderWorkoutDetails(workoutKey, container, workout) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!workout) {
      console.error(`No workout data found for key: ${workoutKey}`);
      return;
    }
    
    console.log(`Rendering details for ${workoutKey}:`, workout);
    
    // Get exercises (excluding metadata)
    const exercises = Object.keys(workout).filter(e => e !== '_stats' && !e.startsWith('_'));
    console.log(`Found ${exercises.length} exercises to display`);
    
    // Render each exercise
    exercises.forEach(exercise => {
      const exerciseData = workout[exercise];
      console.log(`Rendering exercise: ${exercise}`, exerciseData);
      
      if (!exerciseData || !exerciseData.sets) {
        console.warn(`No sets data found for ${exercise}`);
        return;
      }
      
      // Create detail container
      const detail = createElement('div', { class: 'exercise-detail' });
      detail.style.marginBottom = '15px';
      detail.style.backgroundColor = '#f9fafb';
      detail.style.borderRadius = '8px';
      detail.style.padding = '10px';
      
      // Create header
      const header = createElement('div', { class: 'exercise-detail-header' });
      const title = createElement('h4', { class: 'exercise-detail-title' }, {}, [exercise]);
      title.style.color = '#00d2ff'; // Make title stand out
      
      header.appendChild(title);
      detail.appendChild(header);
      
      // Create sets table
      const table = createElement('div', { class: 'sets-table' });
      table.style.width = '100%';
      
      // Table header
      const tableHeader = createElement('div', { class: 'sets-table-header' });
      tableHeader.style.display = 'flex';
      tableHeader.style.justifyContent = 'space-between';
      tableHeader.style.padding = '8px 0';
      tableHeader.style.fontWeight = 'bold';
      tableHeader.style.borderBottom = '2px solid #e5e7eb';
      
      const setHeaderEl = createElement('div', { class: 'set-header' }, {}, ['Set']);
      setHeaderEl.style.width = '20%';
      setHeaderEl.style.textAlign = 'center';
      
      const weightHeaderEl = createElement('div', { class: 'weight-header' }, {}, ['Weight']);
      weightHeaderEl.style.width = '40%';
      weightHeaderEl.style.textAlign = 'center';
      
      const repsHeaderEl = createElement('div', { class: 'reps-header' }, {}, ['Reps']);
      repsHeaderEl.style.width = '40%';
      repsHeaderEl.style.textAlign = 'center';
      
      tableHeader.appendChild(setHeaderEl);
      tableHeader.appendChild(weightHeaderEl);
      tableHeader.appendChild(repsHeaderEl);
      
      table.appendChild(tableHeader);
      
      // Set rows
      exerciseData.sets.forEach((set, index) => {
        if (!set.weight && !set.reps) return;
        
        console.log(`Rendering set ${index + 1}:`, set);
        
        const row = createElement('div', { class: 'set-detail-row' });
        row.style.display = 'flex';
        row.style.justifyContent = 'space-between';
        row.style.padding = '8px 0';
        row.style.borderBottom = '1px solid #e5e7eb';
        
        const setNumEl = createElement('div', { class: 'set-num' }, {}, [String(index + 1)]);
        setNumEl.style.width = '20%';
        setNumEl.style.textAlign = 'center';
        setNumEl.style.fontWeight = 'bold';
        
        const weightValueEl = createElement('div', { class: 'weight-value' }, {}, [set.weight || '-']);
        weightValueEl.style.width = '40%';
        weightValueEl.style.textAlign = 'center';
        
        const repsValueEl = createElement('div', { class: 'reps-value' }, {}, [set.reps || '-']);
        repsValueEl.style.width = '40%';
        repsValueEl.style.textAlign = 'center';
        
        row.appendChild(setNumEl);
        row.appendChild(weightValueEl);
        row.appendChild(repsValueEl);
        
        table.appendChild(row);
      });
      
      detail.appendChild(table);
      container.appendChild(detail);
    });
    
    // Add stats if available
    if (workout._stats) {
      const statsDetail = createElement('div', { class: 'exercise-detail' });
      
      const statsHeader = createElement('div', { class: 'exercise-detail-header' });
      const statsTitle = createElement('h4', { class: 'exercise-detail-title' }, {}, ['Stats']);
      
      statsHeader.appendChild(statsTitle);
      statsDetail.appendChild(statsHeader);
      
      const statsContent = createElement('div', {}, { style: 'padding: 10px 0' });
      
      const stats = workout._stats;
      
      if (stats.bodyWeight) {
        const weight = createElement('p', {}, { style: 'margin: 5px 0' }, [`Body Weight: ${stats.bodyWeight} lbs`]);
        statsContent.appendChild(weight);
      }
      
      if (stats.protein) {
        const protein = createElement('p', {}, { style: 'margin: 5px 0' }, [`Protein: ${stats.protein} g`]);
        statsContent.appendChild(protein);
      }
      
      if (stats.creatine) {
        const creatine = createElement('p', {}, { style: 'margin: 5px 0' }, [`Creatine: ${stats.creatine} g`]);
        statsContent.appendChild(creatine);
      }
      
      if (stats.date) {
        const date = createElement('p', {}, { style: 'margin: 5px 0' }, [`Date: ${stats.date}`]);
        statsContent.appendChild(date);
      }
      
      statsDetail.appendChild(statsContent);
      container.appendChild(statsDetail);
    }
  }
  
  // Handler for clicking on history tab
  function handleHistoryTabClick() {
    // Show history tab
    const workoutTab = document.getElementById('workoutTab');
    const historyTab = document.getElementById('historyTab');
    
    if (workoutTab) workoutTab.classList.remove('active');
    if (historyTab) historyTab.classList.add('active');
    
    // Update tab buttons
    const workoutTabBtn = document.getElementById('workoutTabBtn');
    const historyTabBtn = document.getElementById('historyTabBtn');
    const workoutNavBtn = document.getElementById('workoutNavBtn');
    const historyNavBtn = document.getElementById('historyNavBtn');
    
    if (workoutTabBtn) workoutTabBtn.classList.remove('active');
    if (historyTabBtn) historyTabBtn.classList.add('active');
    if (workoutNavBtn) workoutNavBtn.classList.remove('active');
    if (historyNavBtn) historyNavBtn.classList.add('active');
    
    // Update state if available
    if (window.state) {
      window.state.activeTab = 'history';
    }
    
    // Render history
    improvedRenderWorkoutHistory();
  }
  
  // Function to create emergency history access button (only shown if needed)
  function createEmergencyAccessButton() {
    // Check if the history tab is working correctly
    const historyTab = document.getElementById('historyTab');
    const workoutHistoryContainer = document.getElementById('workoutHistoryContainer');
    
    if (!historyTab || !workoutHistoryContainer) return;
    
    // Only add button if the history tab exists but is empty
    if (workoutHistoryContainer.children.length === 0) {
      // Create a small helper button
      const debugBtn = createElement('button', {}, {
        style: 'position: fixed; bottom: 55px; right: 10px; background: #4CAF50; color: white; padding: 8px; border: none; border-radius: 4px; z-index: 9999; font-size: 12px; box-shadow: 0 2px 5px rgba(0,0,0,0.2);',
        textContent: 'Load History Data',
        onclick: handleHistoryTabClick
      });
      
      document.body.appendChild(debugBtn);
      console.log("Emergency history access button added");
    }
  }
  
  // Install the fix
  function installFix() {
    console.log("Installing history tab fix...");
    
    // Override the global renderWorkoutHistory function
    window.renderWorkoutHistory = improvedRenderWorkoutHistory;
    
    // Export emergency history renderer for use in other scripts
    window.emergencyHistoryRender = improvedRenderWorkoutHistory;
    
    // Add dedicated click handler for history tab
    const historyTabBtn = document.getElementById('historyTabBtn');
    const historyNavBtn = document.getElementById('historyNavBtn');
    
    // Use setTimeout to make sure we register after other handlers
    setTimeout(() => {
      if (historyTabBtn) {
        console.log("Adding improved history tab click handler");
        historyTabBtn.addEventListener('click', handleHistoryTabClick);
      }
      
      if (historyNavBtn) {
        console.log("Adding improved history nav click handler");
        historyNavBtn.addEventListener('click', handleHistoryTabClick);
      }
      
      // Create emergency access button (only if needed)
      setTimeout(createEmergencyAccessButton, 2000);
      
      console.log("History tab fix installed successfully");
    }, 1000);
  }
  
  // Install immediately if document is already loaded
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    installFix();
  } else {
    // Otherwise wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', installFix);
  }
})();