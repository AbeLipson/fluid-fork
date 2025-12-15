# Local Development Setup

## Quick Start

### Option 1: Python Server (Recommended)
```bash
python3 server.py
```

Or simply:
```bash
./server.py
```

### Option 2: Shell Script
```bash
./start-server.sh
```

### Option 3: Python One-Liner
```bash
python3 -m http.server 8000
```

## Access the Site

Once the server is running, open your browser and go to:
**http://localhost:8000**

The server will automatically try to open your browser.

## Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

## Why a Local Server?

WebGL and many web features require files to be served over HTTP (not just opened as `file://`). This is especially important for:
- Loading shader files
- CORS policies
- WebGL context creation

## Troubleshooting

### Port Already in Use
The server script now automatically handles port conflicts by:
1. Allowing port reuse (kills old connections)
2. Finding the next available port if 8000 is busy

If you still have issues, you can manually kill processes on port 8000:
```bash
# On macOS/Linux:
./kill-server.sh

# Or manually:
lsof -ti:8000 | xargs kill -9
```

### Python Not Found
Make sure Python 3 is installed:
```bash
python3 --version
```

If it's not installed, you can:
- Install from python.org
- Use Homebrew: `brew install python3`
- Or use Node.js alternative (see below)

## Alternative: Node.js Server

If you prefer Node.js, you can use `http-server`:

```bash
# Install globally (one time)
npm install -g http-server

# Run in the project directory
http-server -p 8000
```

## Development Workflow

1. Start the server: `python3 server.py`
2. Open browser to `http://localhost:8000`
3. Make changes to your code
4. Refresh the browser to see updates
5. No need to restart the server for code changes!
