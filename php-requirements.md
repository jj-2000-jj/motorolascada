# PHP Requirements

This document lists the PHP requirements for running the Shred application.

## PHP Version
- PHP 7.4.0 or higher

## Required PHP Extensions
- json
- mysqli (if using MySQL database)
- pdo_mysql (if using PDO with MySQL)

## Installation

These requirements should be installed at the system level, not through pip or other Python package managers.

### macOS
```bash
brew install php
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install php php-json php-mysql
```

### Windows
Download PHP from the [official website](https://windows.php.net/download/) or use a package like [XAMPP](https://www.apachefriends.org/index.html). 