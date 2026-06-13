# Selene Shop - Microservices Demo

This is a local demonstration of a microservices architecture using React, Node.js, Express, and Docker. 

## 1. Architecture Diagram

```text
Frontend (React/Vite)
         │
         ▼
Gateway Service (Express/Proxy)
         │
         ├── Auth Service (Express/JWT)
         │
         └── Order Service (Express)
```

## 2. Folder Structure

```text
project-root/
├── frontend/             # React application
├── services/
│   ├── gateway-service/  # API Gateway & Reverse Proxy
│   ├── auth-service/     # Authentication & JWT Provider
│   └── order-service/    # Protected Resource Service
├── docker-compose.yml    # Docker orchestration
└── package.json          # Root orchestration scripts
```

## 3. Tech Stack

- **Frontend**: ReactJS, Vite, React Router, Axios
- **Backend**: NodeJS, ExpressJS, http-proxy-middleware, jsonwebtoken, morgan
- **Infrastructure**: Docker, Docker Compose

## 4. Installation Guide

Requires Node.js and npm installed.

1. Clone or download the repository.
2. Navigate to the root directory `selene-shop`.
3. Install root dependencies (concurrently):
   ```bash
   npm install
   ```
4. Install all service dependencies:
   ```bash
   npm run install:all
   ```

## 5. Local Development Guide

To run all services simultaneously without Docker:

```bash
npm run dev
```

This uses `concurrently` to start the frontend and all three microservices.

## 6. Docker Guide

To run the entire stack using Docker:

```bash
docker compose up --build
```

This will build the images and start the containers connected via a custom Docker network.

## 7. Environment Variables

Each service uses its own `.env` file. Do not share variables globally unless required for infrastructure.

- `frontend/.env`: `VITE_API_URL`
- `services/gateway-service/.env`: `PORT`, `AUTH_SERVICE_URL`, `ORDER_SERVICE_URL`, `RATE_LIMIT_MAX`
- `services/auth-service/.env`: `PORT`, `JWT_SECRET`
- `services/order-service/.env`: `PORT`, `JWT_SECRET`

## 8. Service Port Mapping

- **Frontend**: 5173
- **Gateway Service**: 8000
- **Auth Service**: 8001
- **Order Service**: 8002

## 9. API Documentation

### Auth Service (via Gateway)
- `POST /api/auth/login`
  - Body: `{ "username": "admin", "password": "123456" }`
  - Response: `{ "token": "jwt-token" }`

### Order Service (via Gateway)
- `GET /api/orders`
  - Headers: `Authorization: Bearer <token>`
  - Response: `[{ "id": 1, ... }]`

## 10. Authentication Flow

1. User submits credentials to `POST /api/auth/login`.
2. Gateway proxies request to Auth Service.
3. Auth Service validates hardcoded credentials (`admin`/`123456`).
4. Auth Service returns a JWT (1-hour expiration).
5. Frontend stores token in `localStorage`.
6. Frontend requests `GET /api/orders` with token in header.
7. Gateway proxies request to Order Service.
8. Order Service validates token signature.
9. Order Service returns data.

## 11. Health Check Guide

Check service health at the following endpoints:

- Gateway: `GET http://localhost:8000/health`
- Auth: `GET http://localhost:8001/health`
- Order: `GET http://localhost:8002/health`

The Gateway health check also reports on the status of downstream services.

## 12. Testing Instructions

1. Start the application (`npm run dev` or `docker compose up`).
2. Open `http://localhost:5173` in a browser.
3. Login using `admin` / `123456`.
4. Verify you are redirected to the Orders page and see order data.
5. Access `http://localhost:8000/health` to confirm all services are UP.
