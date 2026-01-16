<?php
// verify_save.php - Debug script to log save attempts and verify the save process
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Create a log file to track save attempts
$log_file = './save_log.txt';

// Add a log entry
function add_log_entry($message, $data = null) {
    global $log_file;
    $time = date('Y-m-d H:i:s');
    $entry = "[{$time}] {$message}";
    
    if ($data !== null) {
        $entry .= "\nData: " . json_encode($data, JSON_PRETTY_PRINT);
    }
    
    $entry .= "\n----------------------------\n";
    file_put_contents($log_file, $entry, FILE_APPEND);
}

// Log the request
add_log_entry("Received request", [
    'method' => $_SERVER['REQUEST_METHOD'],
    'content_type' => $_SERVER['CONTENT_TYPE'] ?? 'not set',
    'content_length' => $_SERVER['CONTENT_LENGTH'] ?? 'not set'
]);

// For OPTIONS requests (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    add_log_entry("CORS preflight request");
    exit;
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    add_log_entry("Method not allowed: " . $_SERVER['REQUEST_METHOD']);
    echo json_encode(['error' => 'Only POST requests are allowed']);
    exit;
}

// Get the raw POST data
$raw_data = file_get_contents('php://input');
add_log_entry("Received raw data", ['length' => strlen($raw_data), 'snippet' => substr($raw_data, 0, 100) . '...']);

$input_data = json_decode($raw_data, true);

// Check if data is valid
if (!$input_data) {
    http_response_code(400); // Bad Request
    add_log_entry("Invalid JSON data", ['error' => json_last_error_msg()]);
    echo json_encode(['error' => 'Invalid JSON data: ' . json_last_error_msg()]);
    exit;
}

// Log the parsed data structure (keys only to avoid massive logs)
add_log_entry("Parsed JSON data structure", [
    'top_level_keys' => array_keys($input_data),
    'has_action' => isset($input_data['action']),
    'has_data' => isset($input_data['data']),
    'data_keys' => isset($input_data['data']) ? array_keys($input_data['data']) : [],
    'workout_history_count' => isset($input_data['data']['workoutHistory']) ? count($input_data['data']['workoutHistory']) : 0
]);

// Forward the request to save_workouts.php
$curl = curl_init('https://motorolascada.com/save_workouts.php');
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, $raw_data);
curl_setopt($curl, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($raw_data)
]);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($curl);
$status = curl_getinfo($curl, CURLINFO_HTTP_CODE);
$error = curl_error($curl);
curl_close($curl);

add_log_entry("Forwarded to save_workouts.php", [
    'status' => $status,
    'error' => $error ?: 'none',
    'response_length' => strlen($response),
    'response' => $response
]);

// Send the response back to the client
http_response_code($status);
echo $response;
?> 