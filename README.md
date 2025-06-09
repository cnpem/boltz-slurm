# Boltz GUI

GUI for using Boltz.
Original Github: https://github.com/jwohlwend/boltz/
Boltz2 paper: https://cdn.prod.website-files.com/68404fd075dba49e58331ad9/6842ee1285b9af247ac5a122_boltz2.pdf


## Architecture

- **Frontend**: React + Vite + Tailwind CSS (`/frontend`)
- **Backend**: FastAPI + Python (`/backend`)

## Quick Start

### Backend Setup

```bash
cd backend
uv sync
uv run run_server.py
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The application will be available at:
- Frontend: http://localhost:6868
- Backend API: http://localhost:6969

You will access the GUI at http://localhost:6868.


