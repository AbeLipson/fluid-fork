#!/usr/bin/env python3
"""
Simple HTTP server for local development.
Serves the fluid simulation on http://localhost:8000
"""

import http.server
import socketserver
import webbrowser
import os
import socket

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers to allow local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        # Prevent caching during development so changes are immediately visible
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class ReusableTCPServer(socketserver.TCPServer):
    """TCP Server that allows port reuse"""
    allow_reuse_address = True

def find_free_port(start_port, max_attempts=10):
    """Find a free port starting from start_port"""
    for i in range(max_attempts):
        port = start_port + i
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

def main():
    # Change to the script's directory
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    Handler = MyHTTPRequestHandler
    
    # Try to use the desired port, or find a free one
    actual_port = PORT
    try:
        httpd = ReusableTCPServer(("", actual_port), Handler)
    except OSError:
        print(f"Port {actual_port} is in use. Searching for available port...")
        actual_port = find_free_port(PORT)
        if actual_port is None:
            print("Error: Could not find an available port.")
            return
        httpd = ReusableTCPServer(("", actual_port), Handler)
        print(f"Using port {actual_port} instead.")
    
    url = f"http://localhost:{actual_port}"
    print("=" * 60)
    print(f"Fluid Simulation Server")
    print("=" * 60)
    print(f"Server running at: {url}")
    print(f"Press Ctrl+C to stop the server")
    print("=" * 60)
    
    # Try to open browser automatically
    try:
        webbrowser.open(url)
    except:
        pass
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\nServer stopped.")
        httpd.shutdown()

if __name__ == "__main__":
    main()
