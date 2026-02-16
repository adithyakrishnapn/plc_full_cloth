#!/bin/bash

# PLC Cloth Application Startup Script
# Starts both backend (Server) and frontend (PLC_App) servers

echo "=========================================="
echo "Starting PLC Cloth Application"
echo "=========================================="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Start backend server
echo -e "${BLUE}Starting backend server...${NC}"
cd "$(dirname "$0")/server" || exit
npm run dev &
BACKEND_PID=$!
echo -e "${GREEN}Backend server started (PID: $BACKEND_PID)${NC}"

# Give backend a moment to start
sleep 2

# Start frontend server
echo -e "${BLUE}Starting frontend server...${NC}"
cd "$(dirname "$0")/PLC_App" || exit
npm run dev &
FRONTEND_PID=$!
echo -e "${GREEN}Frontend server started (PID: $FRONTEND_PID)${NC}"

echo ""
echo "=========================================="
echo -e "${GREEN}✓ Both servers are running!${NC}"
echo "=========================================="
echo "Backend: http://localhost:5000 (or your configured port)"
echo "Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo "=========================================="

# Wait for both processes and handle cleanup
trap 'kill $BACKEND_PID $FRONTEND_PID' INT TERM
wait
