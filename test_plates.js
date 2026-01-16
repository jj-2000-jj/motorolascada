
// Mock of the function to be implemented
function calculatePlatesForBarbell(totalWeight) {
    // Lighter barbell weight (25 lbs) - from app.js
    const barWeight = 25;
    
    // If weight is less than bar, just return
    if (totalWeight < barWeight) {
      return `Bar (${barWeight}) + assistance`;
    }
    
    // Calculate weight to add on each side
    let remainingWeight = totalWeight - barWeight;
    if (remainingWeight <= 0) return `Bar (${barWeight})`;
    
    // Weight needs to be divided by 2 for each side
    let sideWeight = remainingWeight / 2;
    
    // Available plates per side (based on user inventory divided by 2)
    // User inventory: 2x45, 2x35, 2x25, 2x10, 6x2.5
    // Per side: 1x45, 1x35, 1x25, 1x10, 3x2.5
    const inventory = {
        45: 1,
        35: 1,
        25: 1,
        10: 1,
        2.5: 3
    };

    // Available plate weights sorted heavy to light
    // Note: 5s are NOT in the list based on user request (and app.js also had a comment removing 5s)
    const plateWeights = [45, 35, 25, 10, 2.5];
    
    // Calculate plates needed
    const plates = {};
    
    for (const weight of plateWeights) {
        // While we need more weight, and we have this plate in inventory
        while (sideWeight >= weight && inventory[weight] > 0) {
            plates[weight] = (plates[weight] || 0) + 1;
            sideWeight -= weight;
            inventory[weight]--; // Use the plate
        }
    }
    
    // Format the output
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
    
    if (sideWeight > 0) {
        return (plateText ? result + plateText : `Bar (${barWeight})`) + ` (+${sideWeight * 2}lbs missing)`;
    }

    return plateText ? result + plateText : `Bar (${barWeight}) only`;
}

// Test cases
const testCases = [
    25, // Bar only
    30, // 2.5 per side
    45, // 10 per side
    75, // 25 per side
    95, // 35 per side
    115, // 45 per side
    120, // 45 + 2.5 per side
    135, // 45 + 10  -- FAIL? Inventory only has 1x10 per side... wait. 
         // 45 + 10 = 55 added per side. 
         // Logic check: 135 total - 25 bar = 110. 110 / 2 = 55 per side.
         // 55 = 45 (rem 10). Then 10 (rem 0).
         // Inventory: 1x45, 1x35, 1x25, 1x10, 3x2.5
         // So 45+10 works.
    
    185, // 185 - 25 = 160. / 2 = 80 per side.
         // 45 (rem 35). 35 (rem 0).
         // Works: 45 + 35. 
    
    225, // 225 - 25 = 200. / 2 = 100 per side.
         // 45 (rem 55). 35 (rem 20). 
         // 25? No, 20 < 25.
         // 10 (rem 10). Inventory 1x10 used? Wait inventory has 1x10 per side.
         // So we use 45, 35. We need 20 more.
         // We have 1x25 (too big), 1x10.
         // Use 10. Rem 10.
         // No more 10s.
         // Use 2.5. 2.5 x 3 = 7.5 max.
         // So we fail to hit 225.
         
    240, // Max possible?
         // Side max = 45+35+25+10 + (3*2.5) = 115 + 7.5 = 122.5.
         // Total max = 122.5*2 + 25 = 245 + 25 = 270.
         // Wait arithmetic:
         // 45+35+25+10 = 115.
         // 3 * 2.5 = 7.5.
         // Total side = 122.5.
         // Total = 245 + 25 = 270.
];

console.log("Testing Plate Calculation:");
testCases.forEach(weight => {
    console.log(`${weight}lbs: ${calculatePlatesForBarbell(weight)}`);
});

// Specific max test
console.log(`270lbs (Max): ${calculatePlatesForBarbell(270)}`);
console.log(`275lbs (Over Max): ${calculatePlatesForBarbell(275)}`);
