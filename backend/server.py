import uvicorn
from db.bootstrap import bootstrap_database

if __name__ == "__main__":

    bootstrap_database()

    uvicorn.run(
        "api.app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )