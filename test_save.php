<?php
// test_save.php - Specifically test saving to workouts.json
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

// Get server info
$server_info = [
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'os' => PHP_OS,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
    'script_path' => __FILE__,
    'current_dir' => getcwd(),
];

// Target file
$workouts_file = './workouts.json';
$workouts_file_absolute = realpath($workouts_file);

// Check file info
$file_info = [
    'file_exists' => file_exists($workouts_file),
    'file_path' => $workouts_file_absolute,
    'is_readable' => is_readable($workouts_file),
    'is_writable' => is_writable($workouts_file),
];

if ($file_info['file_exists']) {
    $file_info['file_size'] = filesize($workouts_file);
    $file_info['file_permissions'] = substr(sprintf('%o', fileperms($workouts_file)), -4);
    $file_info['file_owner'] = function_exists('posix_getpwuid') ? 
        posix_getpwuid(fileowner($workouts_file))['name'] : 
        fileowner($workouts_file);
    $file_info['file_group'] = function_exists('posix_getgrgid') ? 
        posix_getgrgid(filegroup($workouts_file))['name'] : 
        filegroup($workouts_file);
}

// Test JSON structure
$test_data = [
    'workoutHistory' => [
        'TEST_USER_' . date('Y-m-d') => [
            'TestExercise' => [
                'sets' => [
                    ['weight' => 100, 'reps' => 10],
                    ['weight' => 100, 'reps' => 10]
                ]
            ],
            '_stats' => [
                'bodyWeight' => 170,
                'timestamp' => time(),
                'date' => date('Y-m-d')
            ]
        ]
    ]
];

// Try saving with different approaches
$test_results = [];

// 1. Try with file_put_contents
$test_results['file_put_contents'] = [
    'success' => false,
    'error' => null
];

try {
    // Try to create a backup first if file exists
    $backup_success = false;
    if ($file_info['file_exists'] && $file_info['is_readable']) {
        $backup_file = './workouts_backup_' . time() . '.json';
        $backup_success = copy($workouts_file, $backup_file);
        $test_results['backup'] = [
            'success' => $backup_success,
            'path' => $backup_file
        ];
    }
    
    // Try direct file_put_contents
    $result = file_put_contents($workouts_file, json_encode($test_data, JSON_PRETTY_PRINT));
    
    $test_results['file_put_contents']['success'] = ($result !== false);
    $test_results['file_put_contents']['bytes_written'] = $result;
    
} catch (Exception $e) {
    $test_results['file_put_contents']['error'] = $e->getMessage();
}

// Check permissions again after attempting write
$file_info_after = [
    'file_exists' => file_exists($workouts_file),
    'is_writable' => is_writable($workouts_file),
];

if ($file_info_after['file_exists']) {
    $file_info_after['file_size'] = filesize($workouts_file);
    $file_info_after['file_permissions'] = substr(sprintf('%o', fileperms($workouts_file)), -4);
}

// 2. Try to fix and retry if failed
if ($test_results['file_put_contents']['success'] === false) {
    $fix_results = [];
    
    // Try to create file if missing
    if (!$file_info['file_exists']) {
        $fix_results['create_file'] = touch($workouts_file);
    }
    
    // Try to change permissions
    $fix_results['chmod'] = chmod($workouts_file, 0666);
    
    // Try again
    try {
        $retry_result = file_put_contents($workouts_file, json_encode($test_data, JSON_PRETTY_PRINT));
        $fix_results['retry_success'] = ($retry_result !== false);
        $fix_results['retry_bytes'] = $retry_result;
    } catch (Exception $e) {
        $fix_results['retry_error'] = $e->getMessage();
    }
    
    $test_results['fix_attempts'] = $fix_results;
}

// Final output
$result = [
    'timestamp' => time(),
    'date' => date('Y-m-d H:i:s'),
    'server_info' => $server_info,
    'file_info_before' => $file_info,
    'file_info_after' => $file_info_after,
    'test_results' => $test_results,
    'php_errors' => error_get_last()
];

echo json_encode($result, JSON_PRETTY_PRINT);
?> 