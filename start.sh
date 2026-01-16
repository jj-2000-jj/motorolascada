#!/bin/bash

# Use PORT environment variable if set (for deployment environments), otherwise default to 8000
PORT=${PORT:-8000}
HOST=${HOST:-localhost}

# Kill any existing PHP server process using stored PID
echo "Checking for existing PHP servers..."
PID_FILE=".php_server.pid"
if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
        echo "Stopping previous PHP server (PID $PID)..."
        kill "$PID" 2>/dev/null
    else
        echo "Stale PID file found. Removing..."
    fi
    rm -f "$PID_FILE"
else
    echo "No existing PHP servers found."
fi

# Start the PHP server
echo "Starting PHP server at http://$HOST:$PORT"
php -S 0.0.0.0:$PORT -t . &
SERVER_PID=$!
echo $SERVER_PID > "$PID_FILE"

echo "Server started! Access the application at http://$HOST:$PORT/shred.html"
echo "Press Ctrl+C to stop the server"

# Trap to handle shutdown
trap "echo 'Shutting down server...'; kill $SERVER_PID 2>/dev/null; rm -f \"$PID_FILE\"" SIGINT SIGTERM

# Keep the script running
wait $SERVER_PID 