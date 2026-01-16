// Test script for volume calculation function
console.log('Running volume calculation tests...');

// Test data with various scenarios
const testCases = [
  {
    name: 'Normal values',
    sets: [
      { weight: '100', reps: '10' },
      { weight: '110', reps: '8' },
      { weight: '120', reps: '6' }
    ],
    expected: 2600 // (100*10 + 110*8 + 120*6)
  },
  {
    name: 'Empty values',
    sets: [
      { weight: '', reps: '10' },
      { weight: '100', reps: '' },
      { weight: '', reps: '' }
    ],
    expected: 0 // Empty values should be treated as 0
  },
  {
    name: 'Text/invalid values',
    sets: [
      { weight: 'abc', reps: '10' },
      { weight: '100', reps: 'xyz' },
      { weight: 'N/A', reps: 'N/A' }
    ],
    expected: 0 // Invalid values should be treated as 0
  },
  {
    name: 'Zero values',
    sets: [
      { weight: '0', reps: '10' },
      { weight: '100', reps: '0' },
      { weight: '0', reps: '0' }
    ],
    expected: 0 // Anything multiplied by 0 is 0
  },
  {
    name: 'Mixed valid and invalid',
    sets: [
      { weight: 'abc', reps: '10' }, // Invalid: 0
      { weight: '100', reps: '8' },  // Valid: 800
      { weight: '120', reps: '' }    // Invalid: 0
    ],
    expected: 800 // Only the second set should contribute
  },
  {
    name: 'Decimal values',
    sets: [
      { weight: '95.5', reps: '10' },
      { weight: '100.25', reps: '8' }
    ],
    expected: 1757 // (95.5*10 + 100.25*8)
  },
  {
    name: 'Invalid input: null',
    sets: null,
    expected: 0
  },
  {
    name: 'Invalid input: not an array',
    sets: { weight: '100', reps: '10' },
    expected: 0
  },
  {
    name: 'Empty array',
    sets: [],
    expected: 0
  }
];

// Run tests if calculateVolume function exists
if (typeof window.calculateVolume === 'function') {
  let passCount = 0;
  let failCount = 0;
  
  testCases.forEach(test => {
    const result = window.calculateVolume(test.sets);
    const rounded = Math.round(result); // Round to handle possible floating point issues
    const passed = rounded === test.expected;
    
    console.log(`Test "${test.name}": ${passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  Expected: ${test.expected}, Got: ${result}`);
    
    if (passed) {
      passCount++;
    } else {
      failCount++;
    }
  });
  
  console.log('------------------------');
  console.log(`Test Summary: ${passCount} passed, ${failCount} failed`);
  console.log('------------------------');
} else {
  console.error('window.calculateVolume function not found! Make sure it is defined globally.');
}

// Instructions:
// 1. Open browser developer console
// 2. Go to a page that has the app.js loaded
// 3. Copy and paste this script into the console to run tests
// Or include this script after app.js loads to run tests automatically 