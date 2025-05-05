
# WiFi Exploitation Framework Backend

This is the backend component for the WiFi Exploitation Framework. It provides a REST API for performing wireless network reconnaissance and attacks.

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Django and Django Channels for async support
- Aircrack-ng suite (airmon-ng, airodump-ng, aireplay-ng)

### Installation

1. Install Python dependencies:

```bash
pip install django django-rest-framework django-cors-headers channels channels-redis
```

2. Install the Aircrack-ng suite:

```bash
# For Ubuntu/Debian
sudo apt-get update
sudo apt-get install aircrack-ng

# For Fedora
sudo dnf install aircrack-ng

# For Arch Linux
sudo pacman -S aircrack-ng
```

3. Install Redis for asynchronous task handling:

```bash
# For Ubuntu/Debian
sudo apt-get install redis-server

# For Fedora
sudo dnf install redis

# For Arch Linux
sudo pacman -S redis
```

### Running the Backend

1. Navigate to the backend directory:

```bash
cd backend
```

2. Run database migrations:

```bash
python manage.py migrate
```

3. Start the Django server:

```bash
sudo python manage.py runserver 0.0.0.0:5000
```

> Note: `sudo` is required because the backend needs to access wireless interfaces.

The server will start on http://localhost:5000 by default.

## API Endpoints

- `GET /api/interfaces/` - Get available wireless interfaces
- `POST /api/monitor/start/` - Start monitor mode on an interface
- `POST /api/monitor/stop/` - Stop monitor mode on an interface
- `POST /api/scan/` - Scan for wireless networks
- `POST /api/attack/deauth/` - Perform a deauthentication attack
- `GET /api/status/` - Check backend server status

## WebSocket Endpoints

- `/ws/scan/` - WebSocket connection for real-time scan updates

## Important Notes

This backend is for educational purposes only. Using these tools to attack networks without permission is illegal in most jurisdictions. Always obtain proper authorization before testing security on any network.
