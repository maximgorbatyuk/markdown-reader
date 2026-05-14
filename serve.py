#!/usr/bin/env python3
"""
Simple HTTP server for the MarkdownReader.org application.
Run this script and open http://localhost:8000 in your browser.
"""

import http.server
import socketserver
import webbrowser
import os
import re
import math
from functools import partial
from urllib.parse import urlsplit
from html import unescape

PORT = 8000
DIRECTORY = os.path.join(os.path.dirname(os.path.abspath(__file__)), "docs")

LINK_RELATIONS = (
    ("/.well-known/api-catalog", "api-catalog"),
    ("/.well-known/service-desc.json", "service-desc"),
    ("/api.html", "service-doc"),
    ("/.well-known/oauth-authorization-server", "authorization_server"),
    ("/.well-known/agent.json", "describedby"),
)


def _extract_body_html(html):
    match = re.search(r"<body[^>]*>(.*?)</body>", html, flags=re.IGNORECASE | re.DOTALL)
    return match.group(1) if match else html


def _extract_title(html):
    match = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.IGNORECASE | re.DOTALL)
    return unescape(re.sub(r"\s+", " ", match.group(1))).strip() if match else ""


def _html_to_markdown(html):
    body_html = _extract_body_html(html)

    # Remove non-content blocks before conversion.
    body_html = re.sub(
        r"<(script|style|noscript|svg|canvas)[^>]*>.*?</\1>",
        "",
        body_html,
        flags=re.IGNORECASE | re.DOTALL,
    )
    body_html = re.sub(
        r"<(header|footer|nav|aside)[^>]*>.*?</\1>",
        "",
        body_html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    def _replace_heading(match):
        level = int(match.group(1))
        text = re.sub(r"<[^>]+>", "", match.group(2))
        text = unescape(re.sub(r"\s+", " ", text)).strip()
        return f"\n\n{'#' * level} {text}\n\n" if text else ""

    body_html = re.sub(
        r"<h([1-6])[^>]*>(.*?)</h\1>",
        _replace_heading,
        body_html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    def _replace_link(match):
        href = match.group(1).strip()
        text = re.sub(r"<[^>]+>", "", match.group(2))
        text = unescape(re.sub(r"\s+", " ", text)).strip()
        if not text:
            return ""
        return f"[{text}]({href})"

    body_html = re.sub(
        r"<a[^>]*href=[\"']([^\"']+)[\"'][^>]*>(.*?)</a>",
        _replace_link,
        body_html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    def _replace_list_item(match):
        text = re.sub(r"<[^>]+>", "", match.group(1))
        text = unescape(re.sub(r"\s+", " ", text)).strip()
        return f"\n- {text}" if text else ""

    body_html = re.sub(
        r"<li[^>]*>(.*?)</li>",
        _replace_list_item,
        body_html,
        flags=re.IGNORECASE | re.DOTALL,
    )

    body_html = re.sub(r"<br\s*/?>", "\n", body_html, flags=re.IGNORECASE)
    body_html = re.sub(r"</(p|div|section|article|main|ul|ol|pre)>", "\n\n", body_html, flags=re.IGNORECASE)
    body_html = re.sub(r"<[^>]+>", "", body_html)
    body_markdown = unescape(body_html)
    body_markdown = re.sub(r"[ \t]+\n", "\n", body_markdown)
    body_markdown = re.sub(r"\n{3,}", "\n\n", body_markdown).strip()

    title = _extract_title(html)
    if title:
        return f"# {title}\n\n{body_markdown}".strip()
    return body_markdown


def _estimate_token_count(markdown_text):
    if not markdown_text:
        return 0
    return max(1, math.ceil(len(markdown_text) / 4))


class MarkdownReaderRequestHandler(http.server.SimpleHTTPRequestHandler):
    def guess_type(self, path):
        if path.endswith("/.well-known/api-catalog") or path.endswith(".well-known/api-catalog"):
            return "application/linkset+json"
        if path.endswith("/.well-known/oauth-authorization-server") or path.endswith(".well-known/oauth-authorization-server"):
            return "application/json"
        if path.endswith("/oauth/authorize") or path.endswith("/oauth/token"):
            return "application/json"
        return super().guess_type(path)

    def _wants_markdown(self):
        accept = self.headers.get("Accept", "")
        return "text/markdown" in accept.lower()

    def _resolve_html_path(self):
        request_path = urlsplit(self.path).path
        file_path = self.translate_path(request_path)

        if os.path.isdir(file_path):
            index_path = os.path.join(file_path, "index.html")
            return index_path if os.path.exists(index_path) else None

        if os.path.exists(file_path) and file_path.endswith(".html"):
            return file_path

        return None

    def _serve_markdown(self, head_only=False):
        html_path = self._resolve_html_path()
        if not html_path:
            return False

        with open(html_path, "r", encoding="utf-8", errors="replace") as file_handle:
            html = file_handle.read()

        markdown_text = _html_to_markdown(html)
        body = markdown_text.encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "text/markdown; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Vary", "Accept")
        self.send_header("x-markdown-tokens", str(_estimate_token_count(markdown_text)))
        self.send_header("Last-Modified", self.date_time_string(os.path.getmtime(html_path)))
        self.end_headers()

        if not head_only:
            self.wfile.write(body)

        return True

    def _is_homepage(self):
        request_path = urlsplit(self.path).path
        return request_path in ("/", "/index.html")

    def do_GET(self):
        if self._wants_markdown() and self._serve_markdown(head_only=False):
            return
        super().do_GET()

    def do_HEAD(self):
        if self._wants_markdown() and self._serve_markdown(head_only=True):
            return
        super().do_HEAD()

    def end_headers(self):
        if self.command in ("GET", "HEAD") and self._is_homepage():
            for target, relation in LINK_RELATIONS:
                self.send_header("Link", f'<{target}>; rel="{relation}"')

        super().end_headers()


def main():
    os.chdir(DIRECTORY)

    handler = partial(MarkdownReaderRequestHandler, directory=DIRECTORY)

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
