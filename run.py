"""Start the Foodics Organisation Domain API server."""
import os
import sys

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(PROJECT_DIR)
sys.path.insert(0, PROJECT_DIR)

import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    is_dev = os.environ.get("ENV", "production") == "development"
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=is_dev)
