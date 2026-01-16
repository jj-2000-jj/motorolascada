@echo off
echo Checking for existing PHP servers...
taskkill /F /IM php.exe 2>nul || echo No existing PHP servers found.

echo Starting PHP server at http://localhost:8000
start "" http://localhost:8000/shred.html
php -S localhost:8000 -t .

echo Server stopped.
pause 