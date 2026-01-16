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
    "Hammer Curls",
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
    "Plank",
    "Cable Hip Abduction",
    "Cable Hip Adduction",
    "Glute Bridges",
    "Crunch"
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

function formatDate(date) {
  const d = new Date(date);
  // Use UTC methods to avoid timezone issues
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWorkoutTypeForDay(day) {
  return defaultSplitDays[day] || "Upper Body";
}

function getWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0 is Sunday
  const dates = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - day + i);
    dates.push(date);
  }
  
  return dates;
}
