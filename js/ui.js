// ui.js - Contains UI related functionality with server-based storage

// UI State - ensure we reference the shared app state
if (!window.state) {
  window.state = {};
}

const state = window.state;

if (!state.currentUser) state.currentUser = "Jared";
if (!Array.isArray(state.users) || state.users.length === 0) state.users = ["Jared"];
state.selectedDate = parseDateLocal(state.selectedDate || new Date());
if (!state.workoutType) state.workoutType = "Upper Body";
if (!Array.isArray(state.exercises)) state.exercises = [];
if (!Array.isArray(state.selectedExercises)) state.selectedExercises = [];
if (!state.exerciseData || typeof state.exerciseData !== 'object') state.exerciseData = {};
if (!state.workoutHistory || typeof state.workoutHistory !== 'object') state.workoutHistory = {};
if (!state.activeTab) state.activeTab = "workout";
if (typeof state.userSelectedWorkoutType === 'undefined') state.userSelectedWorkoutType = false;

// DOM Elements
const elements = {
  // Tabs
  workoutTab: document.getElementById('workoutTab'),
  historyTab: document.getElementById('historyTab'),
  workoutTabBtn: document.getElementById('workoutTabBtn'),
  historyTabBtn: document.getElementById('historyTabBtn'),
  workoutNavBtn: document.getElementById('workoutNavBtn'),
  historyNavBtn: document.getElementById('historyNavBtn'),
  
  // User
  currentUserDisplay: document.getElementById('currentUserDisplay'),
  historyUserDisplay: document.getElementById('historyUserDisplay'),
  userButton: document.getElementById('userButton'),
  userModal: document.getElementById('userModal'),
  usersList: document.getElementById('usersList'),
  newUserInput: document.getElementById('newUserInput'),
  addUserBtn: document.getElementById('addUserBtn'),
  cancelUserModalBtn: document.getElementById('cancelUserModalBtn'),
  
  // Exercise selection (legacy - now using dropdown buttons)
  selectExercisesBtn: document.getElementById('selectExercisesBtn') || null, // Legacy - may not exist
  exerciseModal: document.getElementById('exerciseModal'),
  exerciseCategoriesContainer: document.getElementById('exerciseCategoriesContainer'),
  exerciseDropdownContainer: document.getElementById('exerciseDropdownContainer'),
  closeExerciseModalBtn: document.getElementById('closeExerciseModalBtn'),
  doneSelectingBtn: document.getElementById('doneSelectingBtn'),
  
  // Workouts
  selectedExercisesContainer: document.getElementById('selectedExercisesContainer'),
  exercisesList: document.getElementById('exercisesList'),
  saveWorkoutBtn: document.getElementById('saveWorkoutBtn'),
  
  // History
  workoutHistoryContainer: document.getElementById('workoutHistoryContainer'),
  noHistoryMsg: document.getElementById('noHistoryMsg'),
  
  // Vitals
  bodyWeightInput: document.getElementById('bodyWeightInput'),
  proteinInput: document.getElementById('proteinInput'),
  creatineInput: document.getElementById('creatineInput'),
  
  // Templates
  exerciseCardTemplate: document.getElementById('exerciseCardTemplate'),
  setRowTemplate: document.getElementById('setRowTemplate'),
  historyItemTemplate: document.getElementById('historyItemTemplate'),
  
  // Status indicators
  statusMessage: document.getElementById('statusMessage')
};

// UI Functions
function switchTab(tabName) {
  // Update active tab
  state.activeTab = tabName;
  
  // Update tab visibility
  elements.workoutTab.classList.toggle('active', tabName === 'workout');
  elements.historyTab.classList.toggle('active', tabName === 'history');
  
  // Update tab buttons
  elements.workoutTabBtn.classList.toggle('active', tabName === 'workout');
  elements.historyTabBtn.classList.toggle('active', tabName === 'history');
  elements.workoutNavBtn.classList.toggle('active', tabName === 'workout');
  elements.historyNavBtn.classList.toggle('active', tabName === 'history');
  
  // If switching to workout tab, ensure workout focus display is up-to-date
  if (tabName === 'workout') {
    updateWorkoutFocusDisplay();
  }
  
  // If switching to history tab, update history display
  if (tabName === 'history') {
    renderWorkoutHistory();
  }
}

function setupDateSelector() {
  console.log("Setting up date selector");
  const dateSelector = document.querySelector('.date-scroller');
  
  if (!dateSelector) {
    console.error("Cannot find date-scroller element");
    return;
  }
  
  dateSelector.innerHTML = ''; // Clear existing buttons
  
  const weekDates = getWeekDates();
  console.log("Week dates:", weekDates.map(d => d.toDateString()));
  
  weekDates.forEach(date => {
    const localDate = parseDateLocal(date);
    const dateKey = formatDate(localDate);
    
    const dateBtn = document.createElement('button');
    dateBtn.className = 'date-btn';
    dateBtn.setAttribute('data-date', dateKey);
    
    if (localDate.toDateString() === state.selectedDate.toDateString()) {
      dateBtn.classList.add('selected');
    }
    
    const dayName = document.createElement('span');
    dayName.className = 'day-name';
    dayName.textContent = localDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
    
    const dayNumber = document.createElement('span');
    dayNumber.className = 'day-number';
    dayNumber.textContent = localDate.getDate();
    
    dateBtn.appendChild(dayName);
    dateBtn.appendChild(dayNumber);
    
    dateBtn.addEventListener('click', () => {
      selectDate(dateKey);
    });
    
    dateSelector.appendChild(dateBtn);
  });
  
  console.log("Date selector setup complete with " + weekDates.length + " dates");
}

function selectDate(date) {
  const normalizedDate = parseDateLocal(date);
  state.selectedDate = normalizedDate;
  const day = getDayOfWeek(normalizedDate);
  
  // Get suggested workout type based on day, but don't override user's choice
  // if they've manually selected a type
  const suggestedType = getWorkoutTypeForDay(day);
  
  // Only update the workout type if it hasn't been manually set by the user
  if (!state.userSelectedWorkoutType) {
    state.workoutType = suggestedType;
    // Update the workout focus display
    updateWorkoutFocusDisplay();
  }
  
  // Update the exercises list based on current workout type
  state.exercises = defaultWorkouts[state.workoutType] || [];
  
  // Update date selector UI
  const dateBtns = document.querySelectorAll('.date-btn');
  dateBtns.forEach(btn => {
    btn.classList.remove('selected');
  });
  
  const selectedKey = formatDate(normalizedDate);
  const selectedDateBtn = Array.from(dateBtns).find(btn => btn.getAttribute('data-date') === selectedKey);
  
  if (selectedDateBtn) {
    selectedDateBtn.classList.add('selected');
  }
  
  setupDateSelector(); // Refresh date selector
}

function openUserModal() {
  console.log("Opening user modal");
  renderUsersList();
  
  const userModal = document.getElementById('userModal');
  if (userModal) {
    userModal.classList.remove('hidden');
    console.log("User modal opened");
  } else {
    console.error("Cannot find userModal element");
  }
}

function closeUserModal() {
  console.log("Closing user modal");
  
  const userModal = document.getElementById('userModal');
  if (userModal) {
    userModal.classList.add('hidden');
    console.log("User modal closed");
  } else {
    console.error("Cannot find userModal element");
  }
}

function renderUsersList() {
  console.log("Rendering users list:", state.users);
  
  const usersList = document.getElementById('usersList');
  if (!usersList) {
    console.error("Cannot find usersList element");
    return;
  }
  
  usersList.innerHTML = '';
  
  state.users.forEach(user => {
    const userBtn = document.createElement('button');
    userBtn.className = 'user-item';
    userBtn.textContent = user;
    
    userBtn.addEventListener('click', () => {
      switchUser(user);
      closeUserModal();
    });
    
    usersList.appendChild(userBtn);
  });
  
  console.log("Users list rendering complete with", state.users.length, "users");
}

async function switchUser(username) {
  console.log("Switching to user:", username);
  
  state.currentUser = username;
  
  // Update display elements
  const currentUserDisplay = document.getElementById('currentUserDisplay');
  const historyUserDisplay = document.getElementById('historyUserDisplay');
  
  if (currentUserDisplay) {
    currentUserDisplay.textContent = username;
  }
  
  if (historyUserDisplay) {
    historyUserDisplay.textContent = username;
  }
  
  // Clear selected exercises
  state.selectedExercises = [];
  state.exerciseData = {};
  
  // Reset the user-selected workout type flag when switching users
  state.userSelectedWorkoutType = false;
  
  // Get the workout type based on the day
  const day = getDayOfWeek(state.selectedDate);
  state.workoutType = getWorkoutTypeForDay(day);
  
  // Update the workout focus display
  updateWorkoutFocusDisplay();
  
  // Update exercises list based on workout type
  state.exercises = defaultWorkouts[state.workoutType] || [];
  
  // Reload user data
  await loadUserData();
  
  // Update UI
  renderExercises();
  if (state.activeTab === 'history') {
    renderWorkoutHistory();
  }
  
  console.log("User switched to:", username);
}

async function addUser() {
  const username = elements.newUserInput.value.trim();
  
  if (username && !state.users.includes(username)) {
    state.users.push(username);
    elements.newUserInput.value = '';
    
    // Save to server
    await StorageService.saveUsers(state.users);
    
    // Update UI
    renderUsersList();
    showStatusMessage('User added successfully');
  }
}

function openExerciseModal(event) {
  if (event) {
    event.preventDefault();
  }
  toggleExerciseDropdowns();
}

function closeExerciseModal() {
  const container = elements.exerciseDropdownContainer;
  if (container) {
    container.classList.add('hidden');
  }
}

function renderExerciseCategories() {
  elements.exerciseCategoriesContainer.innerHTML = '';
  
  const category = document.createElement('div');
  category.className = 'exercise-category';
  
  const title = document.createElement('h4');
  title.className = 'section-subtitle';
  title.textContent = state.workoutType;
  
  category.appendChild(title);
  
  state.exercises.forEach(exercise => {
    const exerciseLabel = document.createElement('label');
    exerciseLabel.className = 'exercise-item';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = state.selectedExercises.includes(exercise);
    checkbox.className = 'exercise-checkbox';
    
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
    
    exerciseLabel.appendChild(checkbox);
    exerciseLabel.appendChild(span);
    
    category.appendChild(exerciseLabel);
  });
  
  elements.exerciseCategoriesContainer.appendChild(category);
}

function renderExerciseDropdowns() {
  const container = elements.exerciseDropdownContainer;
  if (!container) {
    console.error('Cannot find exerciseDropdownContainer');
    return;
  }

  container.innerHTML = '';

  Object.keys(defaultWorkouts).forEach(categoryName => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = categoryName;
    details.appendChild(summary);

    defaultWorkouts[categoryName].forEach(exercise => {
      const label = document.createElement('label');
      label.className = 'exercise-item';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.selectedExercises.includes(exercise);
      checkbox.className = 'exercise-checkbox';

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

      label.appendChild(checkbox);
      label.appendChild(span);

      details.appendChild(label);
    });

    container.appendChild(details);
  });
}

function toggleExerciseDropdowns() {
  const container = elements.exerciseDropdownContainer;
  if (!container) return;
  if (container.classList.contains('hidden')) {
    renderExerciseDropdowns();
    container.classList.remove('hidden');
  } else {
    container.classList.add('hidden');
  }
}

function addExerciseToWorkout(exercise) {
  if (!state.selectedExercises.includes(exercise)) {
    state.selectedExercises.push(exercise);
    
    // Initialize exercise data
    state.exerciseData[exercise] = {
      sets: [
        { weight: '', reps: '' },
        { weight: '', reps: '' },
        { weight: '', reps: '' },
        { weight: '', reps: '' }
      ]
    };
    
    renderExercises();
  }
}

function removeExerciseFromWorkout(exercise) {
  state.selectedExercises = state.selectedExercises.filter(e => e !== exercise);
  
  // Remove exercise data
  delete state.exerciseData[exercise];
  
  renderExercises();
}

function renderExercises() {
  // Show/hide container
  elements.selectedExercisesContainer.classList.toggle('hidden', state.selectedExercises.length === 0);
  
  if (state.selectedExercises.length === 0) {
    return;
  }
  
  elements.exercisesList.innerHTML = '';
  
  state.selectedExercises.forEach(exercise => {
    // Clone template
    const exerciseCard = document.importNode(elements.exerciseCardTemplate.content, true);
    
    // Set exercise title
    exerciseCard.querySelector('.exercise-title').textContent = exercise;
    
    // Set remove button handler
    exerciseCard.querySelector('.remove-exercise-btn').addEventListener('click', () => {
      removeExerciseFromWorkout(exercise);
    });
    
    // Add sets
    const setsContainer = exerciseCard.querySelector('.sets-container');
    state.exerciseData[exercise].sets.forEach((set, index) => {
      const setRow = document.importNode(elements.setRowTemplate.content, true);
      
      // Set number
      setRow.querySelector('.set-number').textContent = `Set ${index + 1}`;
      
      // Weight input
      const weightInput = setRow.querySelector('.weight-input');
      weightInput.value = set.weight;
      weightInput.addEventListener('change', () => {
        updateSetData(exercise, index, 'weight', weightInput.value);
      });
      
      // Reps input
      const repsInput = setRow.querySelector('.reps-input');
      repsInput.value = set.reps;
      repsInput.addEventListener('change', () => {
        updateSetData(exercise, index, 'reps', repsInput.value);
      });
      
      setsContainer.appendChild(setRow);
    });
    
    elements.exercisesList.appendChild(exerciseCard);
  });
}

function updateSetData(exercise, setIndex, field, value) {
  state.exerciseData[exercise].sets[setIndex][field] = value;
}

async function saveWorkout() {
  if (state.selectedExercises.length === 0) {
    return;
  }
  
  const formattedDate = formatDate(state.selectedDate);
  const workoutKey = `${state.currentUser}_${formattedDate}`;
  
  // Save workout data
  state.workoutHistory[workoutKey] = { ...state.exerciseData };
  
  // Save to server
  const success = await StorageService.saveWorkoutHistory(state.workoutHistory);
  
  // Show success message
  if (success) {
    showStatusMessage('Workout saved successfully!');
  } else {
    showStatusMessage('Workout saved to local storage. Will sync when server is available.', 'warning');
  }
}

// Function to delete a workout
async function deleteWorkout(workoutKey) {
  console.log("Deleting workout:", workoutKey);
  
  // Remove from local state
  delete state.workoutHistory[workoutKey];
  
  // Save to server to persist the deletion
  const success = await StorageService.saveWorkoutHistory(state.workoutHistory);
  
  // Re-render workout history
  renderWorkoutHistory();
  
  // Show success message
  if (success) {
    showStatusMessage('Workout deleted successfully!');
  } else {
    showStatusMessage('Workout deleted locally. Will sync when server is available.', 'warning');
  }
  
  // Initialize icons for newly rendered elements
  setTimeout(() => {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }, 0);
  
  console.log("Workout deleted successfully");
}

async function renderWorkoutHistory() {
  console.log("Rendering workout history...");
  
  // Load latest history data from server
  await loadWorkoutHistory();
  
  // Get container and message elements
  const workoutHistoryContainer = document.getElementById('workoutHistoryContainer');
  const noHistoryMsg = document.getElementById('noHistoryMsg');
  
  if (!workoutHistoryContainer) {
    console.error("Cannot find workoutHistoryContainer element");
    return;
  }
  
  if (!noHistoryMsg) {
    console.error("Cannot find noHistoryMsg element");
  }
  
  console.log("Current user:", state.currentUser);
  console.log("Workout history keys:", Object.keys(state.workoutHistory));
  
  // Filter history for current user
  const userWorkouts = Object.keys(state.workoutHistory)
    .filter(key => key.startsWith(`${state.currentUser}_`));
  
  console.log("Filtered workouts for current user:", userWorkouts.length);
  
  // Sort by date descending
  userWorkouts.sort((a, b) => {
    let dateA, dateB;
    
    // Handle different key formats (some have timestamp, some don't)
    if (a.split('_').length > 2) {
      dateA = new Date(parseInt(a.split('_')[2]));
    } else {
      dateA = parseDateLocal(a.split('_')[1]);
    }

    if (b.split('_').length > 2) {
      dateB = new Date(parseInt(b.split('_')[2]));
    } else {
      dateB = parseDateLocal(b.split('_')[1]);
    }
    
    return dateB - dateA;
  });
  
  // Show/hide empty message
  if (noHistoryMsg) {
    noHistoryMsg.classList.toggle('hidden', userWorkouts.length > 0);
  }
  
  // Clear container
  workoutHistoryContainer.innerHTML = '';
  
  // Get template
  const historyItemTemplate = document.getElementById('historyItemTemplate');
  if (!historyItemTemplate) {
    console.error("Cannot find historyItemTemplate element");
    return;
  }
  
  console.log("Rendering", userWorkouts.length, "history items");
  
  // Render history items
  userWorkouts.forEach(key => {
    const parts = key.split('_');
    let date;
    
    // Handle different key formats
    if (parts.length > 2) {
      date = parts[1]; // Use the actual date part
    } else {
      date = parts[1];
    }
    
    // Get exercises and filter out metadata properties
    const exercises = Object.keys(state.workoutHistory[key])
      .filter(k => k !== '_stats' && !k.startsWith('_'));
    
    console.log(`Workout ${key}: ${exercises.length} exercises`);
    
    const historyItem = document.importNode(historyItemTemplate.content, true);
    
    // Set date
    const dateDisplay = historyItem.querySelector('.history-date');
    if (dateDisplay) {
      dateDisplay.textContent = parseDateLocal(date).toDateString();
    }
    
    // Add exercise tags
    const tagsContainer = historyItem.querySelector('.exercise-tags');
    if (tagsContainer) {
      exercises.forEach(exercise => {
        const tag = document.createElement('span');
        tag.className = 'exercise-tag';
        tag.textContent = exercise;
        tagsContainer.appendChild(tag);
      });
    }
    
    // Add delete button
    const historyHeader = historyItem.querySelector('.history-header');
    if (historyHeader) {
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-workout-btn';
      deleteBtn.setAttribute('title', 'Delete workout');
      deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>';
      deleteBtn.style.color = '#ef4444'; // Red color
      deleteBtn.style.marginRight = '8px';
      deleteBtn.style.background = 'none';
      deleteBtn.style.border = 'none';
      deleteBtn.style.cursor = 'pointer';
      deleteBtn.style.padding = '4px';
      
      // Add delete functionality
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent toggle from firing
        
        if (confirm(`Are you sure you want to delete this workout from ${parseDateLocal(date).toDateString()}?`)) {
          await deleteWorkout(key);
        }
      });
      
      // Insert delete button before the toggle button
      const toggleBtn = historyHeader.querySelector('.toggle-btn');
      if (toggleBtn) {
        historyHeader.insertBefore(deleteBtn, toggleBtn);
      } else {
        historyHeader.appendChild(deleteBtn);
      }
    }
    
    // Add toggle functionality
    const toggleBtn = historyItem.querySelector('.toggle-btn');
    if (toggleBtn) {
      const chevronDown = toggleBtn.querySelector('.chevron-down-icon');
      const chevronUp = toggleBtn.querySelector('.chevron-up-icon');
      const details = historyItem.querySelector('.history-details');
      
      toggleBtn.addEventListener('click', () => {
        if (!details) return;
        
        const isExpanded = !details.classList.contains('hidden');
        
        details.classList.toggle('hidden', isExpanded);
        if (chevronDown) chevronDown.classList.toggle('hidden', !isExpanded);
        if (chevronUp) chevronUp.classList.toggle('hidden', isExpanded);
        
        // Load details if expanding
        if (!isExpanded) {
          renderWorkoutDetails(key, details);
        }
      });
    }
    
    workoutHistoryContainer.appendChild(historyItem);
  });
  
  console.log("Workout history rendering complete");
}

function renderWorkoutDetails(workoutKey, detailsContainer) {
  console.log("Rendering workout details for:", workoutKey);
  detailsContainer.innerHTML = '';
  
  const workoutData = state.workoutHistory[workoutKey];
  if (!workoutData) {
    console.error("No workout data found for key:", workoutKey);
    return;
  }
  
  // Get exercises and filter out metadata properties
  const exercises = Object.keys(workoutData)
    .filter(k => k !== '_stats' && !k.startsWith('_'));
  
  console.log("Exercises to render:", exercises);
  
  exercises.forEach(exercise => {
    const exerciseData = workoutData[exercise];
    if (!exerciseData || !exerciseData.sets) {
      console.error(`Missing or invalid data for exercise ${exercise}:`, exerciseData);
      return;
    }
    
    const exerciseDetail = document.createElement('div');
    exerciseDetail.className = 'exercise-detail';
    
    // Exercise header
    const header = document.createElement('div');
    header.className = 'exercise-detail-header';
    
    const title = document.createElement('h4');
    title.className = 'exercise-detail-title';
    title.textContent = exercise;
    
    header.appendChild(title);
    exerciseDetail.appendChild(header);
    
    // Sets table
    const setsTable = document.createElement('div');
    setsTable.className = 'sets-table';
    
    // Table header
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
    setsTable.appendChild(tableHeader);
    
    // Set rows
    exerciseData.sets.forEach((set, index) => {
      if (set.weight || set.reps) {
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
        setsTable.appendChild(row);
      }
    });
    
    exerciseDetail.appendChild(setsTable);
    detailsContainer.appendChild(exerciseDetail);
  });
  
  // Add stats if available
  if (workoutData._stats) {
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
    statsContent.className = 'stats-content';
    
    // Format stats
    const stats = workoutData._stats;
    const statsList = document.createElement('ul');
    statsList.style.listStyle = 'none';
    statsList.style.paddingLeft = '0';
    
    if (stats.bodyWeight) {
      const item = document.createElement('li');
      item.textContent = `Body Weight: ${stats.bodyWeight} lbs`;
      statsList.appendChild(item);
    }
    
    if (stats.protein) {
      const item = document.createElement('li');
      item.textContent = `Protein: ${stats.protein} g`;
      statsList.appendChild(item);
    }
    
    if (stats.creatine) {
      const item = document.createElement('li');
      item.textContent = `Creatine: ${stats.creatine} g`;
      statsList.appendChild(item);
    }
    
    if (stats.date) {
      const item = document.createElement('li');
      item.textContent = `Date: ${stats.date}`;
      statsList.appendChild(item);
    }
    
    statsContent.appendChild(statsList);
    statsDetail.appendChild(statsContent);
    
    detailsContainer.appendChild(statsDetail);
  }
  
  console.log("Workout details rendering complete");
}

async function loadUserData() {
  // Load user stats from server
  const userStats = await StorageService.getUserStats(state.currentUser);
  
  elements.bodyWeightInput.value = userStats.bodyWeight || '';
  elements.proteinInput.value = userStats.protein || '';
  elements.creatineInput.value = userStats.creatine || '';
}

async function saveUserStats() {
  const stats = {
    bodyWeight: elements.bodyWeightInput.value,
    protein: elements.proteinInput.value,
    creatine: elements.creatineInput.value
  };
  
  const success = await StorageService.saveUserStats(state.currentUser, stats);
  
  if (success) {
    showStatusMessage('Stats updated successfully');
  } else {
    showStatusMessage('Stats saved locally. Will sync when server is available.', 'warning');
  }
}

async function loadWorkoutHistory() {
  // Load workout history from server
  state.workoutHistory = await StorageService.getWorkoutHistory();
}

function showStatusMessage(message, type = 'success') {
  if (!elements.statusMessage) return;
  
  // Set icon based on message type
  const iconName = type === 'success' ? 'check-circle' : 
                   type === 'error' ? 'alert-circle' : 
                   type === 'warning' ? 'alert-triangle' : 'info';
  
  // Find or create status icon element
  let statusIcon = elements.statusMessage.querySelector('.status-icon');
  let statusText = elements.statusMessage.querySelector('.status-text');
  
  if (!statusIcon) {
    statusIcon = document.createElement('div');
    statusIcon.className = 'status-icon';
    elements.statusMessage.appendChild(statusIcon);
  }
  
  if (!statusText) {
    statusText = document.createElement('div');
    statusText.className = 'status-text';
    elements.statusMessage.appendChild(statusText);
  }
  
  // Set icon HTML
  statusIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
  statusText.textContent = message;
  
  // Update class
  elements.statusMessage.className = `status-message ${type}`;
  elements.statusMessage.classList.remove('hidden');
  
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
    elements.statusMessage.classList.add('hidden');
  }, 3000);
}

// Function to update the workout focus display
function updateWorkoutFocusDisplay() {
  const focusDisplay = document.getElementById('workoutFocusDisplay');
  if (focusDisplay) {
    focusDisplay.textContent = state.workoutType;
  }
  
  // Update category buttons if they exist
  const upperButton = document.getElementById('upperBodyButton');
  const lowerButton = document.getElementById('lowerBodyButton');
  
  if (upperButton && lowerButton) {
    upperButton.classList.toggle('active', state.workoutType === 'Upper Body');
    lowerButton.classList.toggle('active', state.workoutType === 'Lower Body');
  }
}

// Function to set up workout focus selector buttons
function setupWorkoutFocusButtons() {
  console.log("Setting up workout focus buttons");
  const categoryButtonsContainer = document.getElementById('exerciseCategoryButtons');
  
  if (!categoryButtonsContainer) {
    console.error("Cannot find exerciseCategoryButtons element");
    return;
  }
  
  // Clear existing buttons
  categoryButtonsContainer.innerHTML = '';
  
  // Create Upper Body button
  const upperButton = document.createElement('button');
  upperButton.id = 'upperBodyButton';
  upperButton.className = 'category-btn';
  upperButton.textContent = 'Upper Body';
  upperButton.classList.toggle('active', state.workoutType === 'Upper Body');
  
  upperButton.addEventListener('click', () => {
    state.workoutType = 'Upper Body';
    state.userSelectedWorkoutType = true; // Flag that user manually selected this
    state.exercises = defaultWorkouts[state.workoutType] || [];
    updateWorkoutFocusDisplay();
    renderExercises();
  });
  
  // Create Lower Body button
  const lowerButton = document.createElement('button');
  lowerButton.id = 'lowerBodyButton';
  lowerButton.className = 'category-btn';
  lowerButton.textContent = 'Lower Body';
  lowerButton.classList.toggle('active', state.workoutType === 'Lower Body');
  
  lowerButton.addEventListener('click', () => {
    state.workoutType = 'Lower Body';
    state.userSelectedWorkoutType = true; // Flag that user manually selected this
    state.exercises = defaultWorkouts[state.workoutType] || [];
    updateWorkoutFocusDisplay();
    renderExercises();
  });
  
  // Add buttons to the container
  categoryButtonsContainer.appendChild(upperButton);
  categoryButtonsContainer.appendChild(lowerButton);
  
  // Add some CSS for the buttons
  const style = document.createElement('style');
  style.textContent = `
    .category-btn {
      padding: 8px 12px;
      margin-right: 10px;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      background-color: white;
      color: #374151;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .category-btn.active {
      background-color: #2563eb;
      color: white;
      border-color: #2563eb;
    }
  `;
  document.head.appendChild(style);
}

// Initialize UI
async function initializeUI() {
  try {
    console.log("Initializing UI...");
    
    // Add userSelectedWorkoutType flag to state
    state.userSelectedWorkoutType = false;
    
    // Load data from server
    state.users = await StorageService.getUsers();
    console.log("Loaded users:", state.users);
    
    state.workoutHistory = await StorageService.getWorkoutHistory();
    console.log("Loaded workout history:", Object.keys(state.workoutHistory).length + " entries");
    
    // Set initial state based on day of week
    state.workoutType = getWorkoutTypeForDay(getDayOfWeek(state.selectedDate));
    state.exercises = defaultWorkouts[state.workoutType] || [];
    console.log("Initial workout type:", state.workoutType);
    
    // Initialize user display
    const currentUserDisplay = document.getElementById('currentUserDisplay');
    const historyUserDisplay = document.getElementById('historyUserDisplay');
    
    if (currentUserDisplay) {
      currentUserDisplay.textContent = state.currentUser;
    } else {
      console.error("Missing currentUserDisplay element");
    }
    
    if (historyUserDisplay) {
      historyUserDisplay.textContent = state.currentUser;
    } else {
      console.error("Missing historyUserDisplay element");
    }
    
    // Update workout focus display
    updateWorkoutFocusDisplay();
    
    // Set up workout focus buttons
    setupWorkoutFocusButtons();
    
    // Set up date selector
    setupDateSelector();
    
    // Load user data
    await loadUserData();
    
    // Render exercises if any are selected
    renderExercises();
    
    console.log("UI initialization complete");
  } catch (error) {
    console.error("Error initializing UI:", error);
    showStatusMessage("Error initializing app. Check console for details.", "error");
  }
}
