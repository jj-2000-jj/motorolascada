# Shred - Workout Tracker

A web-based application for tracking workouts and fitness progress.

## Features

- Track workouts and exercises
- Monitor personal records
- Store workout history
- Calendar view for workout planning

## Requirements

- PHP 7.4 or higher
- PHP extensions: json, mysqli (if using database storage)

See [PHP Requirements](php-requirements.md) for detailed installation instructions.

## Setup & Running

### Local Development

#### macOS/Linux
```bash
# Make the startup script executable
chmod +x start.sh

# Run the application
./start.sh
```

#### Windows
```bash
# Run the application
start.bat
```

The application will be available at http://localhost:8000/shred.html

### Deployment

This application can be deployed to various platforms that support PHP:

- **Procfile** is provided for platforms like Heroku
- **run** script is provided as a standard entry point
- **build.sh** handles any build-time setup

The server will automatically use the `PORT` environment variable if provided by the hosting platform.

## Technologies Used

- HTML/CSS
- JavaScript
- PHP
- JSON for data storage


