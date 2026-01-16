<?php
// get_workouts.php - API endpoint to securely serve workouts.json content
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// For OPTIONS requests (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Only GET requests are allowed']);
    exit;
}

// Path to the workouts.json file
$workouts_file = './workouts.json';

// Check if file exists
if (!file_exists($workouts_file)) {
    http_response_code(404); // Not Found
    echo json_encode(['error' => 'workouts.json not found']);
    exit;
}

// Check if file is readable
if (!is_readable($workouts_file)) {
    http_response_code(500); // Internal Server Error
    echo json_encode(['error' => 'Cannot read workouts.json']);
    exit;
}

// Read the file
$content = file_get_contents($workouts_file);

// Validate JSON
$decoded = json_decode($content);
if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(500); // Internal Server Error
    echo json_encode([
        'error' => 'Invalid JSON in workouts.json',
        'json_error' => json_last_error_msg()
    ]);
    exit;
}

// Output the content as-is
echo $content;
?> 