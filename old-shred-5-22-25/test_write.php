<?php
// test_write.php - Test file write permissions
header("Content-Type: application/json");

// Get server information
$server_info = [
    'php_version' => phpversion(),
    'server_software' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
    'os' => PHP_OS,
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'Unknown',
    'script_path' => __FILE__,
    'current_dir' => getcwd(),
];

// Check for workouts.json in current directory
$workouts_file = './workouts.json';
$workouts_file_absolute = realpath($workouts_file);

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

// Test writing to the file
$test_data = [
    'test' => true,
    'timestamp' => time(),
    'date' => date('Y-m-d H:i:s')
];

// Try to create a backup first
$backup_success = false;
if ($file_info['file_exists'] && $file_info['is_readable']) {
    $backup_file = './workouts_backup.json';
    $backup_success = copy($workouts_file, $backup_file);
}

// Try to write to a test file first
$test_write_file = './test_write.json';
$test_write_success = file_put_contents($test_write_file, json_encode($test_data, JSON_PRETTY_PRINT));

// Only try to write to the actual file if a backup exists
$write_test = [
    'backup_created' => $backup_success,
    'test_file_write_success' => $test_write_success !== false,
    'test_file_write_bytes' => $test_write_success,
];

// Final output
$result = [
    'server_info' => $server_info,
    'file_info' => $file_info,
    'write_test' => $write_test,
    'php_errors' => error_get_last()
];

echo json_encode($result, JSON_PRETTY_PRINT);
?> 