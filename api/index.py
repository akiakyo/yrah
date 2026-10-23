"""vercel entry point: serves the fastapi app in /server as a serverless function."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "server"))

from main import app  # noqa: E402,F401
