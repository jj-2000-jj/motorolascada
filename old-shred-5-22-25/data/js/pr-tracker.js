// pr-tracker.js - Handles Personal Record tracking and notifications

// PR tracker state
const prTrackerState = {
  active: true, // Whether PR tracking is enabled
  prHistory: {}, // History of PRs by exercise
  currentPRs: {} // Current PR values by exercise
};

// Initialize PR tracker
function initializePRTracker() {
  console.log("Initializing PR tracker...");
  
  // Load PR history from localStorage
  loadPRHistory();
  
  console.log("PR tracker initialized");
}

// Load PR history from localStorage
function loadPRHistory() {
  try {
    // Try to load PR history from localStorage
    const storedPRs = localStorage.getItem('workoutApp_prs');
    if (storedPRs) {
      const parsedPRs = JSON.parse(storedPRs);
      prTrackerState.prHistory = parsedPRs;
      console.log("Loaded PR history:", Object.keys(parsedPRs).length, "exercises");
    }
  } catch (error) {
    console.error("Error loading PR history:", error);
  }
}

// Save PR history to localStorage
function savePRHistory() {
  try {
    localStorage.setItem('workoutApp_prs', JSON.stringify(prTrackerState.prHistory));
  } catch (error) {
    console.error("Error saving PR history:", error);
  }
}

// Check workout for PRs
function checkForPRs(workout, username) {
  if (!prTrackerState.active) return null;
  
  console.log("Checking for PRs in workout...");
  
  const prs = [];
  const prDetails = {};
  const exercises = Object.keys(workout).filter(key => !key.startsWith('_'));
  
  // Load existing PRs for this user if we haven't already
  if (!prTrackerState.prHistory[username]) {
    prTrackerState.prHistory[username] = {};
  }
  
  const userPRs = prTrackerState.prHistory[username];
  
  // Check each exercise for PRs
  exercises.forEach(exercise => {
    const exerciseData = workout[exercise];
    
    // Skip exercises with no valid sets
    if (!exerciseData.sets || exerciseData.sets.length === 0) return;
    
    // Initialize PR record for this exercise if it doesn't exist
    if (!userPRs[exercise]) {
      userPRs[exercise] = {
        maxWeight: 0,
        maxReps: 0,
        maxVolume: 0
      };
    }
    
    // Get the current PRs for this exercise
    const currentPRs = userPRs[exercise];
    
    // Calculate current workout stats
    const sets = exerciseData.sets;
    
    // Find heaviest weight for current workout
    const currentMaxWeight = Math.max(...sets.map(set => parseFloat(set.weight) || 0));
    
    // Find highest reps for current workout
    const currentMaxReps = Math.max(...sets.map(set => parseFloat(set.reps) || 0));
    
    // Calculate volume for current workout
    const currentVolume = window.calculateVolume ? 
      window.calculateVolume(sets) : 
      sets.reduce((total, set) => {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseFloat(set.reps) || 0;
        return total + (weight * reps);
      }, 0);
    
    // Check for weight PR
    if (currentMaxWeight > currentPRs.maxWeight && currentMaxWeight > 0) {
      const improvement = currentPRs.maxWeight > 0 
        ? ((currentMaxWeight - currentPRs.maxWeight) / currentPRs.maxWeight) * 100 
        : null;
      
      prs.push({
        exercise,
        type: 'weight',
        value: currentMaxWeight,
        improvement
      });
      
      if (!prDetails[exercise]) prDetails[exercise] = [];
      prDetails[exercise].push({
        type: 'weight',
        value: currentMaxWeight,
        improvement
      });
      
      // Update the PR
      currentPRs.maxWeight = currentMaxWeight;
    }
    
    // Check for reps PR
    if (currentMaxReps > currentPRs.maxReps && currentMaxReps > 0) {
      const improvement = currentPRs.maxReps > 0 
        ? ((currentMaxReps - currentPRs.maxReps) / currentPRs.maxReps) * 100 
        : null;
      
      prs.push({
        exercise,
        type: 'reps',
        value: currentMaxReps,
        improvement
      });
      
      if (!prDetails[exercise]) prDetails[exercise] = [];
      prDetails[exercise].push({
        type: 'reps',
        value: currentMaxReps,
        improvement
      });
      
      // Update the PR
      currentPRs.maxReps = currentMaxReps;
    }
    
    // Check for volume PR
    if (currentVolume > currentPRs.maxVolume && currentVolume > 0) {
      const improvement = currentPRs.maxVolume > 0 
        ? ((currentVolume - currentPRs.maxVolume) / currentPRs.maxVolume) * 100 
        : null;
      
      prs.push({
        exercise,
        type: 'volume',
        value: currentVolume,
        improvement
      });
      
      if (!prDetails[exercise]) prDetails[exercise] = [];
      prDetails[exercise].push({
        type: 'volume',
        value: currentVolume,
        improvement
      });
      
      // Update the PR
      currentPRs.maxVolume = currentVolume;
    }
  });
  
  // If we found PRs, save the updated PR history
  if (prs.length > 0) {
    savePRHistory();
    
    // If we have only one PR, return it directly
    if (prs.length === 1) {
      return prs[0];
    }
    
    // Otherwise return a summary
    const uniqueExercises = [...new Set(prs.map(pr => pr.exercise))];
    
    // Find the best improvement
    let bestImprovement = null;
    prs.forEach(pr => {
      if (pr.improvement && (!bestImprovement || pr.improvement > bestImprovement.improvement)) {
        bestImprovement = {
          exercise: pr.exercise,
          improvement: pr.improvement
        };
      }
    });
    
    return {
      isSummary: true,
      prCount: prs.length,
      exercises: uniqueExercises,
      details: prDetails,
      bestImprovement
    };
  }
  
  return null;
}

// Create a PR notification element
function createPRNotification(prData) {
  if (!prData) return null;
  
  // Create the outer container
  const container = document.createElement('div');
  container.className = 'pr-notification';
  container.style.cssText = `
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: auto;
    backdrop-filter: blur(4px);
    background-color: rgba(0,0,0,0.3);
    z-index: 9999;
  `;
  
  // Create the notification card
  const card = document.createElement('div');
  card.style.cssText = `
    background: linear-gradient(135deg, #FF427A, #FF9D42);
    border-radius: 1rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 60px rgba(255, 66, 122, 0.4);
    padding: 1.5rem;
    color: white;
    border: 3px solid rgba(255,255,255,0.8);
    max-width: 90%;
    width: 340px;
    transform: rotate(-1deg);
    animation: pulse 1.5s infinite alternate;
    max-height: 80vh;
    overflow-y: auto;
  `;
  
  // Create header with title and close button
  const header = document.createElement('div');
  header.className = 'flex justify-between items-start';
  
  const titleContainer = document.createElement('div');
  titleContainer.className = 'flex items-center';
  
  const icon = document.createElement('i');
  icon.setAttribute('data-lucide', 'award');
  icon.style.cssText = 'color: #FFDD33; margin-right: 0.5rem;';
  
  const title = document.createElement('h3');
  title.style.cssText = 'font-weight: bold; font-size: 1.25rem;';
  title.textContent = prData.isSummary 
    ? `${prData.prCount} New Personal Records!` 
    : 'New Personal Record!';
  
  titleContainer.appendChild(icon);
  titleContainer.appendChild(title);
  
  const closeButton = document.createElement('button');
  closeButton.style.cssText = 'color: white; background: transparent; border: none; cursor: pointer; padding: 4px;';
  closeButton.innerHTML = '<i data-lucide="x-circle"></i>';
  closeButton.onclick = () => {
    document.body.removeChild(container);
  };
  
  header.appendChild(titleContainer);
  header.appendChild(closeButton);
  card.appendChild(header);
  
  // Add content based on whether it's a single PR or summary
  if (!prData.isSummary) {
    // Single PR display
    const content = document.createElement('div');
    content.style.marginTop = '0.5rem';
    
    const exerciseName = document.createElement('p');
    exerciseName.style.cssText = 'font-weight: 500; color: white;';
    exerciseName.textContent = prData.exercise;
    content.appendChild(exerciseName);
    
    const prValue = document.createElement('p');
    prValue.style.cssText = 'font-size: 0.875rem; margin-top: 0.25rem; color: white;';
    
    if (prData.type === 'weight') {
      prValue.textContent = `Heaviest weight: ${prData.value} lbs`;
    } else if (prData.type === 'reps') {
      prValue.textContent = `Most reps: ${prData.value}`;
    } else if (prData.type === 'volume') {
      prValue.textContent = `Highest volume: ${prData.value}`;
    }
    
    content.appendChild(prValue);
    
    if (prData.improvement) {
      const improvement = document.createElement('p');
      improvement.style.cssText = 'font-size: 0.875rem; margin-top: 0.25rem; font-weight: bold; color: #FFDD33;';
      improvement.textContent = `${prData.improvement > 0 ? '+' : ''}${Math.round(prData.improvement * 10) / 10}% improvement!`;
      content.appendChild(improvement);
    }
    
    card.appendChild(content);
  } else {
    // Summary PR display
    const summaryContent = document.createElement('div');
    summaryContent.style.marginTop = '0.5rem';
    
    if (prData.bestImprovement) {
      const bestImprovement = document.createElement('p');
      bestImprovement.style.cssText = 'font-size: 0.875rem; margin-top: 0.25rem; font-weight: bold; color: #FFDD33;';
      bestImprovement.textContent = `Best improvement: ${prData.bestImprovement.improvement > 0 ? '+' : ''}${Math.round(prData.bestImprovement.improvement * 10) / 10}% on ${prData.bestImprovement.exercise}!`;
      summaryContent.appendChild(bestImprovement);
    }
    
    const exercisesLabel = document.createElement('p');
    exercisesLabel.style.cssText = 'font-size: 0.875rem; margin-top: 0.75rem; color: white; font-weight: 500;';
    exercisesLabel.textContent = 'New records set for:';
    summaryContent.appendChild(exercisesLabel);
    
    const exercisesList = document.createElement('div');
    exercisesList.style.cssText = 'margin-top: 0.5rem; max-height: 50vh; overflow-y: auto;';
    
    prData.exercises.forEach(exercise => {
      const exerciseItem = document.createElement('div');
      exerciseItem.style.cssText = 'margin-bottom: 0.5rem; padding: 0.5rem; border-radius: 0.5rem; background-color: rgba(255,255,255,0.1);';
      
      const exerciseName = document.createElement('p');
      exerciseName.style.cssText = 'font-weight: 500; color: white;';
      exerciseName.textContent = exercise;
      exerciseItem.appendChild(exerciseName);
      
      // Add details for this exercise
      if (prData.details[exercise]) {
        prData.details[exercise].forEach(pr => {
          const prDetail = document.createElement('p');
          prDetail.style.cssText = 'font-size: 0.75rem; color: white;';
          
          if (pr.type === 'weight') {
            prDetail.textContent = `• Weight: ${pr.value} lbs`;
          } else if (pr.type === 'reps') {
            prDetail.textContent = `• Reps: ${pr.value}`;
          } else if (pr.type === 'volume') {
            prDetail.textContent = `• Volume: ${pr.value}`;
          }
          
          if (pr.improvement) {
            prDetail.textContent += ` (+${Math.round(pr.improvement * 10) / 10}%)`;
          }
          
          exerciseItem.appendChild(prDetail);
        });
      }
      
      exercisesList.appendChild(exerciseItem);
    });
    
    summaryContent.appendChild(exercisesList);
    card.appendChild(summaryContent);
  }
  
  container.appendChild(card);
  
  // Initialize Lucide icons
  setTimeout(() => {
    if (typeof lucide !== 'undefined' && typeof lucide.createIcons === 'function') {
      lucide.createIcons();
    }
  }, 0);
  
  return container;
}

// Show a PR notification
function showPRNotification(prData) {
  if (!prData) return;
  
  const notification = createPRNotification(prData);
  if (notification) {
    document.body.appendChild(notification);
    
    // Add keypress listener to close on Escape key
    const escapeListener = (e) => {
      if (e.key === 'Escape') {
        document.body.removeChild(notification);
        document.removeEventListener('keydown', escapeListener);
      }
    };
    
    document.addEventListener('keydown', escapeListener);
  }
}

// Get PR stats for an exercise
function getPRStats(username, exercise) {
  if (!prTrackerState.prHistory[username] || !prTrackerState.prHistory[username][exercise]) {
    return null;
  }
  
  return prTrackerState.prHistory[username][exercise];
}

// Export functions
window.PRTracker = {
  initialize: initializePRTracker,
  checkForPRs: checkForPRs,
  showPRNotification: showPRNotification,
  getPRStats: getPRStats
};