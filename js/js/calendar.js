// calendar.js - Calendar interface for workout date selection

const calendarToday = new Date();

// Calendar state
const calendarState = {
  currentMonth: new Date(calendarToday.getFullYear(), calendarToday.getMonth(), 1),
  selectedDate: parseDateLocal(calendarToday),
  workoutDates: [], // Dates that have workouts
};

// Calendar DOM elements
let calendarElements = {
  container: null,
  monthYearDisplay: null,
  daysGrid: null,
  prevMonthBtn: null,
  nextMonthBtn: null
};

// Initialize calendar
function initializeCalendar(containerId, onDateSelect) {
  console.log("Initializing calendar...");
  
  // Set up calendar container
  const container = document.getElementById(containerId);
  if (!container) {
    console.error("Calendar container not found:", containerId);
    return;
  }
  
  // Create calendar UI
  createCalendarUI(container);
  
  // Set calendar to current month
  updateCalendarMonth();
  
  // Set up event handlers
  setupCalendarEvents(onDateSelect);
  
  // Store references
  calendarElements.container = container;
  
  console.log("Calendar initialized");
}

// Create calendar UI
function createCalendarUI(container) {
  container.innerHTML = `
    <div class="calendar-container">
      <div class="calendar-header">
        <div class="calendar-title" id="calendarMonthYear"></div>
        <div class="calendar-navigation">
          <button id="calendarPrevMonth" class="p-1 text-gray-600" title="Previous Week">
            <i data-lucide="chevron-left"></i>
          </button>
          <button id="calendarNextMonth" class="p-1 text-gray-600" title="Next Week">
            <i data-lucide="chevron-right"></i>
          </button>
        </div>
      </div>
      <div class="calendar-grid" id="calendarDaysGrid">
        <!-- Day names will be inserted here -->
        <!-- Calendar days will be inserted here -->
      </div>
    </div>
  `;
  
  // Store references to important elements
  calendarElements.monthYearDisplay = document.getElementById('calendarMonthYear');
  calendarElements.daysGrid = document.getElementById('calendarDaysGrid');
  calendarElements.prevMonthBtn = document.getElementById('calendarPrevMonth');
  calendarElements.nextMonthBtn = document.getElementById('calendarNextMonth');
  
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
    lucide.createIcons();
  }
}

// Set up calendar event handlers
function setupCalendarEvents(onDateSelect) {
  // Previous week button
  calendarElements.prevMonthBtn.addEventListener('click', () => {
    // Get the first day of the current week
    const today = parseDateLocal(new Date());
    const currentDay = today.getDay();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - currentDay - 7); // Go to previous week
    
    // Update the current month if the week spans different months
    calendarState.currentMonth = new Date(firstDayOfWeek);
    updateCalendarMonth();
  });
  
  // Next week button
  calendarElements.nextMonthBtn.addEventListener('click', () => {
    // Get the first day of the current week
    const today = parseDateLocal(new Date());
    const currentDay = today.getDay();
    const firstDayOfWeek = new Date(today);
    firstDayOfWeek.setDate(today.getDate() - currentDay + 7); // Go to next week
    
    // Update the current month if the week spans different months
    calendarState.currentMonth = new Date(firstDayOfWeek);
    updateCalendarMonth();
  });
  
  // Date selection handler (will be attached to day elements when rendered)
  calendarElements.onDateSelect = onDateSelect;
}

// Update the calendar display for the current week
function updateCalendarMonth() {
  // Get the current week's dates
  const today = parseDateLocal(new Date());
  const currentDay = today.getDay(); // 0 for Sunday, 1 for Monday, etc.
  
  // Calculate the first day of the week (Sunday)
  const firstDayOfWeek = new Date(today);
  firstDayOfWeek.setDate(today.getDate() - currentDay);
  
  // Calculate the year and month for display (using current date)
  const year = today.getFullYear();
  const month = today.getMonth();
  
  // Update display to show week range
  const lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
  
  const dateOptions = { month: 'short', day: 'numeric' };
  const weekRangeDisplay = `${firstDayOfWeek.toLocaleDateString('en-US', dateOptions)} - ${lastDayOfWeek.toLocaleDateString('en-US', dateOptions)}, ${year}`;
  calendarElements.monthYearDisplay.textContent = weekRangeDisplay;
  
  // Clear the existing grid
  calendarElements.daysGrid.innerHTML = '';
  
  // Add day names (Sun-Sat)
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  dayNames.forEach(day => {
    const dayNameEl = document.createElement('div');
    dayNameEl.className = 'calendar-day-name';
    dayNameEl.textContent = day;
    calendarElements.daysGrid.appendChild(dayNameEl);
  });
  
  // Generate only the current week days (7 days)
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(firstDayOfWeek);
    currentDate.setDate(firstDayOfWeek.getDate() + i);
    
    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.textContent = currentDate.getDate();
    
    // Check if this is today
    if (currentDate.getDate() === today.getDate() && 
        currentDate.getMonth() === today.getMonth() && 
        currentDate.getFullYear() === today.getFullYear()) {
      dayEl.classList.add('today');
    }
    
    // Check if this is the selected date
    if (currentDate.getDate() === calendarState.selectedDate.getDate() && 
        currentDate.getMonth() === calendarState.selectedDate.getMonth() && 
        currentDate.getFullYear() === calendarState.selectedDate.getFullYear()) {
      dayEl.classList.add('selected');
    }
    
    // If date is from different month, add dimmed appearance
    if (currentDate.getMonth() !== month) {
      dayEl.classList.add('text-gray-400');
    }
    
    // Check if this date has a workout
    const dateString = formatDateYYYYMMDD(currentDate);
    if (calendarState.workoutDates.includes(dateString)) {
      dayEl.classList.add('has-workout');
    }
    
    // Store the full date as a data attribute
    const fullDate = formatDateYYYYMMDD(currentDate);
    dayEl.dataset.date = fullDate;
    
    // Add click event to select this date
    dayEl.addEventListener('click', () => {
      // Update selected date using local parsing to avoid timezone issues
      calendarState.selectedDate = parseDateLocal(fullDate);
      
      // Call the date selection handler if provided
      if (calendarElements.onDateSelect) {
        calendarElements.onDateSelect(fullDate);
      }
      
      // Update calendar display to show selection
      updateCalendarMonth();
    });
    
    calendarElements.daysGrid.appendChild(dayEl);
  }
}

// Set workout dates for highlighting
function setWorkoutDates(dates) {
  calendarState.workoutDates = dates;
  updateCalendarMonth(); // Refresh calendar display with new workout markers
}

// Set the selected date
function setSelectedDate(date) {
  // Accept either Date object or YYYY-MM-DD string
  if (typeof date === 'string') {
    calendarState.selectedDate = parseDateLocal(date);
  } else if (date instanceof Date) {
    calendarState.selectedDate = parseDateLocal(date); // Clone the date
  }
  
  // If the selected date is in a different month, update the current month
  if (calendarState.selectedDate.getMonth() !== calendarState.currentMonth.getMonth() ||
      calendarState.selectedDate.getFullYear() !== calendarState.currentMonth.getFullYear()) {
    calendarState.currentMonth = new Date(
      calendarState.selectedDate.getFullYear(),
      calendarState.selectedDate.getMonth(),
      1
    );
  }
  
  // Update the calendar display
  updateCalendarMonth();
}

// Format a date as YYYY-MM-DD using local time to avoid timezone offsets
function formatDateYYYYMMDD(date) {
  let d;
  if (date instanceof Date) {
    d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  } else {
    d = parseDateLocal(date);
  }
  
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

// Export functions
window.Calendar = {
  initialize: initializeCalendar,
  setWorkoutDates: setWorkoutDates,
  setSelectedDate: setSelectedDate
};
