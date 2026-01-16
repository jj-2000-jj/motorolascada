#!/bin/bash

# Make all scripts executable
chmod +x ./run
chmod +x ./start.sh
chmod +x ./deploy.sh
chmod +x ./build.sh
chmod +x ./start
chmod +x "./start.sh "

# Create a simple touch file to indicate setup has been completed
touch .setup-complete

echo "Setup completed successfully." 