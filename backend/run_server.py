import uvicorn
from app import app

if __name__ == "__main__":
    print("Starting Boltz GUI Server...")
    print("Server will be available at: http://localhost:6969")
    print("API documentation: http://localhost:6969/docs")
    print("Health check: http://localhost:6969/health")
    print("Press Ctrl+C to stop the server")
    
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=6969,
        reload=True,
        log_level="info"
    ) 