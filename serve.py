#!/usr/bin/env python3
"""
Simple HTTP server for the MarkdownReader.org application.
Run this script and open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import webbrowser
import os
from functools import partial

PORT = 8000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")


def main():
    os.chdir(DIRECTORY)

    handler = partial(http.server.SimpleHTTPRequestHandler, directory=DIRECTORY)

    with socketserver.TCPServer(("", PORT), handler) as httpd:
        url = f"http://localhost:{PORT}"
        print(f"Serving MarkdownReader.org at {url}")
        print("Press Ctrl+C to stop the server")

        # Open browser automatically
        webbrowser.open(url)

        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")


if __name__ == "__main__":
    main()
