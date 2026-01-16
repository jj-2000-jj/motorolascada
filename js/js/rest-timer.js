// rest-timer.js - Rest timer functionality for workouts

// Collection of timers by container ID
let timers = {};

// Timer class for managing individual timers
class Timer {
  constructor(containerId) {
    this.containerId = containerId;
    this.state = {
      seconds: 90, // Default 90 seconds rest
      isActive: false,
      inputTime: 90
    };
    this.interval = null;
    this.elements = {
      container: null,
      display: null,
      inputField: null,
      playButton: null,
      pauseButton: null,
      resetButton: null,
      notificationButton: null
    };

    this.initialize();
  }

  // Initialize timer
  initialize() {
    console.log("Initializing timer for", this.containerId);

    // Get container element
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error("Rest timer container not found:", this.containerId);
      return;
    }

    // Create UI
    this.createUI(container);

    // Set up event handlers
    this.setupEventHandlers();

    // Request notification permission
    this.requestNotificationPermission();
  }

  // Create the timer UI
  createUI(container) {
    // Timer HTML structure
    container.innerHTML = `
      <div class="rest-timer">
        <div class="flex justify-between items-center mb-2">
          <div class="flex items-center text-gray-700">
            <i data-lucide="clock" class="mr-1"></i>
            <span class="text-sm font-medium">Rest Timer</span>
            <button 
              class="timer-notification-btn ml-2 text-blue-600"
              title="Enable notifications"
            >
              <i data-lucide="bell"></i>
            </button>
          </div>
          <div class="timer-display text-lg font-bold text-blue-600">
            ${this.formatTime(this.state.seconds)}
          </div>
        </div>
        
        <div class="flex justify-between">
          <div class="flex items-center">
            <input
              class="timer-input w-16 p-1 border rounded-md text-center text-sm"
              type="number"
              value="${this.state.inputTime}"
              min="5"
              max="600"
            />
            <span class="ml-1 text-xs text-gray-600">sec</span>
          </div>
          
          <div class="flex space-x-2">
            <button 
              class="timer-play-btn p-1 bg-green-100 text-green-700 rounded-md"
            >
              <i data-lucide="play"></i>
            </button>
            <button 
              class="timer-pause-btn p-1 bg-yellow-100 text-yellow-700 rounded-md hidden"
            >
              <i data-lucide="pause"></i>
            </button>
            <button 
              class="timer-reset-btn p-1 bg-gray-100 text-gray-700 rounded-md"
            >
              <i data-lucide="refresh-cw"></i>
            </button>
          </div>
        </div>
      </div>
    `;

    // Initialize Lucide icons
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }

    // Store references to DOM elements
    this.elements.container = container;
    this.elements.display = container.querySelector('.timer-display');
    this.elements.inputField = container.querySelector('.timer-input');
    this.elements.playButton = container.querySelector('.timer-play-btn');
    this.elements.pauseButton = container.querySelector('.timer-pause-btn');
    this.elements.resetButton = container.querySelector('.timer-reset-btn');
    this.elements.notificationButton = container.querySelector('.timer-notification-btn');
  }

  // Format time as MM:SS
  formatTime(timeInSeconds) {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  // Set up timer event handlers
  setupEventHandlers() {
    // Start timer button
    this.elements.playButton.addEventListener('click', () => this.startTimer());

    // Pause timer button
    this.elements.pauseButton.addEventListener('click', () => this.pauseTimer());

    // Reset timer button
    this.elements.resetButton.addEventListener('click', () => this.resetTimer());

    // Input field changes
    this.elements.inputField.addEventListener('change', () => {
      // Get value from input as number
      const newValue = parseInt(this.elements.inputField.value);

      // Validate input (must be between 5-600 seconds)
      if (isNaN(newValue) || newValue < 5) {
        this.elements.inputField.value = 5;
        this.state.inputTime = 5;
      } else if (newValue > 600) {
        this.elements.inputField.value = 600;
        this.state.inputTime = 600;
      } else {
        this.state.inputTime = newValue;
      }

      // Update display if timer is not active
      if (!this.state.isActive) {
        this.state.seconds = this.state.inputTime;
        this.updateDisplay();
      }
    });

    // Notification permission button
    this.elements.notificationButton.addEventListener('click', () => this.requestNotificationPermission());
  }

  // Start the timer
  startTimer() {
    if (this.state.isActive) return;

    // If timer is at 0, reset to input time
    if (this.state.seconds === 0) {
      this.state.seconds = this.state.inputTime;
    }

    this.state.isActive = true;

    // Show pause button, hide play button
    this.elements.playButton.classList.add('hidden');
    this.elements.pauseButton.classList.remove('hidden');

    // Disable input field while timer is active
    this.elements.inputField.disabled = true;

    // Set target end time
    this.targetEndTime = Date.now() + (this.state.seconds * 1000);

    // Start the countdown
    this.interval = setInterval(() => {
      const now = Date.now();
      const remainingSeconds = Math.ceil((this.targetEndTime - now) / 1000);

      // Ensure we don't go below 0 for display
      this.state.seconds = remainingSeconds < 0 ? 0 : remainingSeconds;
      this.updateDisplay();

      // If timer reaches 0, stop and notify
      if (remainingSeconds <= 0) {
        this.pauseTimer();
        this.notifyTimerComplete();
      }
    }, 100); // Check more frequently for better precision
  }

  // Pause the timer
  pauseTimer() {
    if (!this.state.isActive) return;

    this.state.isActive = false;

    // Clear the interval
    clearInterval(this.interval);

    // Show play button, hide pause button
    this.elements.playButton.classList.remove('hidden');
    this.elements.pauseButton.classList.add('hidden');

    // Enable input field
    this.elements.inputField.disabled = false;
  }

  // Reset the timer
  resetTimer() {
    // Stop the timer if it's running
    if (this.state.isActive) {
      this.pauseTimer();
    }

    // Reset seconds to input time
    this.state.seconds = this.state.inputTime;

    // Update display
    this.updateDisplay();
  }

  // Update the timer display
  updateDisplay() {
    if (!this.elements.display) return;
    this.elements.display.textContent = this.formatTime(this.state.seconds);
  }

  // Notify when timer completes
  notifyTimerComplete() {
    console.log("Timer complete!");

    // Browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Rest Complete!', {
        body: 'Time to start your next set'
      });
    } else {
      // Fallback to alert only if we can't use notifications
      alert('Rest time complete!');
    }

    // Play a sound
    try {
      const audio = new Audio('data:audio/mp3;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV');
      audio.play();
    } catch (e) {
      console.error("Could not play notification sound:", e);
    }
  }

  // Request permission for browser notifications
  requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        console.log("Notification permission:", permission);

        // Update button appearance based on permission
        if (permission === 'granted') {
          this.elements.notificationButton.classList.add('text-green-600');
          this.elements.notificationButton.classList.remove('text-blue-600');
        }
      });
    }
  }
}

// Initialize timer functionality
function initializeTimer(containerId) {
  console.log("Creating new timer for", containerId);

  // Create a new timer and store in collection
  const timer = new Timer(containerId);
  timers[containerId] = timer;

  return timer;
}

// Get a timer instance by ID
function getTimer(containerId) {
  return timers[containerId] || null;
}

// Export functions for external use
window.RestTimer = {
  initialize: initializeTimer,
  getTimer: getTimer
};