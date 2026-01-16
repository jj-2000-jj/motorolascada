// data.js - Contains default workout data and utility functions

// Default workout data structure
const defaultWorkouts = {
  "Upper Body": [
    "Barbell Bench Press",
    "Bent-Over Barbell Row",
    "Seated Dumbbell Shoulder Press",
    "Cable Lat Pulldown",
    "Barbell Bicep Curls",
    "Cable Triceps Pulldown",
    "Incline Dumbbell Press",
    "Incline Barbell Press",
    "Cable Row",
    "Lateral Raises",
    "Flys",
    "Cable Face Pulls",
    "Arnold Presses",
    "Front Raises",
    "Dumbbell Curls",
    "Pull Ups",
    "Rear Deltoid Cable Fly",
    "T-Bar Row",
    "Barbell Shrugs",
    "Kettlebell Shoulder Press"
  ],
  "Lower Body": [
    "Barbell Back Squat",
    "Barbell Deadlift",
    "Bulgarian Split Squats",
    "Cable Pull Through",
    "Barbell Calf Raises",
    "One Leg Calf Raises",
    "Cable Ab Twist",
    "Ab Roll Out",
    "Cable Hip Abduction",
    "Cable Hip Adduction",
    "Glute Bridges",
    "Crunch"
  ],
  "Cardio": [
    "Run Mile"
  ]
};

// Split days
const defaultSplitDays = {
  "Monday": "Upper Body",
  "Tuesday": "Lower Body",
  "Wednesday": "Upper Body",
  "Thursday": "Lower Body",
  "Friday": "Upper Body"
};

// Utility functions
function getDayOfWeek(date) {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

// Parse a YYYY-MM-DD string as a local date. If a Date object is supplied, it
// is cloned. This avoids timezone issues when interpreting ISO dates which are
// treated as UTC by the Date constructor.
function parseDateLocal(date) {
  if (date instanceof Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  if (typeof date === 'string') {
    const parts = date.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // month is zero-based
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }

  // Fallback to native parsing
  return new Date(date);
}

function formatDate(date) {
  const d = parseDateLocal(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWorkoutTypeForDay(day) {
  return defaultSplitDays[day] || "Upper Body";
}

function getWeekDates() {
  const today = parseDateLocal(new Date());
  const day = today.getDay(); // 0 is Sunday
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - day + i);
    dates.push(date);
  }
  
  return dates;
}
