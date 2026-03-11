"""
Entry point to run the ExecuSim FastAPI server.

Usage:
    python server.py
"""

import uvicorn
from db.bootstrap import bootstrap_database

if __name__ == "__main__":

    # Ensure DB exists
    bootstrap_database()

    uvicorn.run(
        "api.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )