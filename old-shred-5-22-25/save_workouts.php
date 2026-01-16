<?php
// save_workouts.php - Simple script to save workout data to the root workouts.json file
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// For OPTIONS requests (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only POST requests are allowed']);
    exit;
}

// Get the raw POST data
$input_data = json_decode(file_get_contents('php://input'), true);

// Check if data is valid
if (!$input_data) {
    http_response_code(400); // Bad Request
    echo json_encode(['error' => 'Invalid JSON data']);
    exit;
}

// Get the workouts data, supporting both formats
$new_workout_data = null;
if (isset($input_data['action']) && $input_data['action'] === 'saveWorkouts' && isset($input_data['data'])) {
    // Format from our modified script
    $new_workout_data = $input_data['data'];
} elseif (isset($input_data['workoutHistory'])) {
    // Direct format
    $new_workout_data = ['workoutHistory' => $input_data['workoutHistory']];
} else {
    // Assume the entire data is the workout data
    $new_workout_data = $input_data;
}

// Path to the workouts.json file
$workouts_file = './workouts.json';

// Ensure file exists - create it if it doesn't
if (!file_exists($workouts_file)) {
    // Create an empty workouts file with proper structure
    $empty_data = json_encode(['workoutHistory' => []], JSON_PRETTY_PRINT);
    $created = file_put_contents($workouts_file, $empty_data);
    
    if ($created === false) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Failed to create workouts.json file',
            'dir_writable' => is_writable('./'),
            'php_error' => error_get_last()
        ]);
        exit;
    }
    
    // Set permissions to ensure it's writable
    chmod($workouts_file, 0666);
}

// Make sure we can write to the file
if (!is_writable($workouts_file)) {
    // Try to fix permissions
    chmod($workouts_file, 0666);
    
    // Check again
    if (!is_writable($workouts_file)) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'workouts.json exists but is not writable',
            'file_path' => realpath($workouts_file),
            'permissions' => substr(sprintf('%o', fileperms($workouts_file)), -4)
        ]);
        exit;
    }
}

// Read existing data first - important for merging!
$existing_data = [];
if (file_exists($workouts_file) && filesize($workouts_file) > 0) {
    $json_content = file_get_contents($workouts_file);
    if ($json_content !== false) {
        $decoded = json_decode($json_content, true);
        if ($decoded !== null) {
            $existing_data = $decoded;
        } else {
            // Log JSON error but continue with empty data
            error_log("JSON parse error in workouts.json: " . json_last_error_msg());
        }
    }
}

// Initialize with empty structure if needed
if (!isset($existing_data['workoutHistory'])) {
    $existing_data['workoutHistory'] = [];
}

// MERGE the new workout history with existing data instead of replacing
if (isset($new_workout_data['workoutHistory'])) {
    foreach ($new_workout_data['workoutHistory'] as $key => $workout) {
        $existing_data['workoutHistory'][$key] = $workout;
    }
}

// Write the merged data back to the file
$result = file_put_contents($workouts_file, json_encode($existing_data, JSON_PRETTY_PRINT));

if ($result === false) {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'success' => false,
        'error' => 'Failed to write to workouts.json',
        'file_path' => realpath($workouts_file),
        'file_exists' => file_exists($workouts_file),
        'is_writable' => is_writable($workouts_file),
        'permissions' => fileperms($workouts_file),
        'dir_path' => realpath('./'),
        'php_error' => error_get_last()
    ]);
} else {
    http_response_code(200); // Success
    echo json_encode([
        'success' => true,
        'message' => 'Workout data saved successfully',
        'bytes_written' => $result,
        'file_path' => realpath($workouts_file),
        'workout_count' => count($existing_data['workoutHistory'])
    ]);
}
?>