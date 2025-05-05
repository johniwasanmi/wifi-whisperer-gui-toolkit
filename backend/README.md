
# WiFi Exploitation Framework Backend

This is the backend component for the WiFi Exploitation Framework. It provides a REST API for performing wireless network reconnaissance and attacks.

## Setup Instructions

### Prerequisites

- Python 3.7 or higher
- Flask and other dependencies
- Aircrack-ng suite (airmon-ng, airodump-ng, aireplay-ng)

### Installation

1. Install Python dependencies:

```bash
pip install flask flask-cors
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

### Running the Backend

1. Navigate to the backend directory:

```bash
cd backend
```

2. Start the Flask server:

```bash
sudo python app.py
```

> Note: `sudo` is required because the backend needs to access wireless interfaces.

The server will start on http://localhost:5000 by default.

## API Endpoints

- `GET /api/interfaces` - Get available wireless interfaces
- `POST /api/monitor/start` - Start monitor mode on an interface
- `POST /api/monitor/stop` - Stop monitor mode on an interface
- `POST /api/scan` - Scan for wireless networks
- `POST /api/attack/deauth` - Perform a deauthentication attack
- `GET /api/status` - Check backend server status

## Important Notes

This backend is for educational purposes only. Using these tools to attack networks without permission is illegal in most jurisdictions. Always obtain proper authorization before testing security on any network.
