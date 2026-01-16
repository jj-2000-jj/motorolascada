<?php
// api.php - Simple PHP API handler for JSON file storage

// Allow cross-origin requests if needed
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// For OPTIONS requests (CORS preflight)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Data directory - make sure this exists and has write permissions
$data_dir = './data/';

// Ensure data directory exists
if (!file_exists($data_dir)) {
    mkdir($data_dir, 0755, true);
}

// Define file paths
$users_file = $data_dir . 'users.json';
$workouts_file = $data_dir . 'workouts.json';
$stats_file = $data_dir . 'stats.json';

// Initialize files if they don't exist
function initialize_file($file_path, $default_data) {
    if (!file_exists($file_path)) {
        file_put_contents($file_path, json_encode($default_data, JSON_PRETTY_PRINT));
        chmod($file_path, 0644);
    }
}

initialize_file($users_file, ["users" => ["Jared", "Cohen", "Graham"]]);
initialize_file($workouts_file, ["workoutHistory" => []]);
initialize_file($stats_file, []);

// Parse the request URI
$request_uri = $_SERVER['REQUEST_URI'];
$uri_parts = explode('?', $request_uri, 2);
$path = $uri_parts[0];

// Extract the endpoint from the path
$endpoint = '';
if (preg_match('/\/api\/([^\/]+)(\/([^\/]+))?/', $path, $matches)) {
    $endpoint = $matches[1];
    $param = isset($matches[3]) ? $matches[3] : null;
}

// Get the request body for POST requests
$input_data = null;
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input_data = json_decode(file_get_contents('php://input'), true);
}

// Simple success/error response functions
function success_response($data = null) {
    echo json_encode(['success' => true, 'data' => $data]);
    exit;
}

function error_response($message, $status_code = 500) {
    http_response_code($status_code);
    echo json_encode(['success' => false, 'error' => $message]);
    exit;
}

// Helper function to read a JSON file
function read_json_file($file_path) {
    if (!file_exists($file_path)) {
        return null;
    }
    
    $content = file_get_contents($file_path);
    if ($content === false) {
        return null;
    }
    
    return json_decode($content, true);
}

// Helper function to write to a JSON file
function write_json_file($file_path, $data) {
    $success = file_put_contents($file_path, json_encode($data, JSON_PRETTY_PRINT));
    return $success !== false;
}

// Handle the request based on the endpoint and method
switch ($endpoint) {
    case 'ping':
        // Simple ping endpoint to check if the server is online
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            success_response(['status' => 'online']);
        }
        break;
        
    case 'users':
        // Handle users endpoint
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $data = read_json_file($users_file);
            if ($data !== null) {
                echo json_encode($data);
            } else {
                error_response('Failed to read users data');
            }
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (isset($input_data['users'])) {
                $success = write_json_file($users_file, $input_data);
                if ($success) {
                    success_response();
                } else {
                    error_response('Failed to update users data');
                }
            } else {
                error_response('Invalid data format', 400);
            }
        }
        break;
        
    case 'workouts':
        // Handle workouts endpoint
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $data = read_json_file($workouts_file);
            if ($data !== null) {
                echo json_encode($data);
            } else {
                error_response('Failed to read workout data');
            }
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            if (isset($input_data['action']) && $input_data['action'] === 'saveWorkouts' && isset($input_data['data'])) {
                // For the specific saveWorkouts action from the app
                $success = write_json_file($workouts_file, $input_data['data']);
                if ($success) {
                    success_response(['message' => 'Workout data saved successfully']);
                } else {
                    error_response('Failed to update workout data');
                }
            } else {
                // Original behavior for direct data
                $success = write_json_file($workouts_file, $input_data);
                if ($success) {
                    success_response();
                } else {
                    error_response('Failed to update workout data');
                }
            }
        }
        break;
        
    case 'stats':
        // Handle stats endpoint
        if (!$param) {
            error_response('Username is required', 400);
            break;
        }
        
        $username = $param;
        
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $data = read_json_file($stats_file);
            if ($data !== null) {
                $user_stats = isset($data[$username]) ? $data[$username] : [];
                echo json_encode(['stats' => $user_stats]);
            } else {
                error_response('Failed to read stats data');
            }
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $data = read_json_file($stats_file) ?: [];
            $data[$username] = $input_data;
            
            $success = write_json_file($stats_file, $data);
            if ($success) {
                success_response();
            } else {
                error_response('Failed to update stats data');
            }
        }
        break;
        
    default:
        // Handle unknown endpoints
        error_response('Endpoint not found', 404);
}
