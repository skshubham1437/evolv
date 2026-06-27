# Evolv — Production Deployment Guide

> **Domain:** `evolv.shubhamkr.in`
> **Server:** Hetzner VPS (Ubuntu 22.04 / 24.04)
> **Stack:** Docker + Docker Compose + Nginx + Neon DB + GitHub Actions

---

## Overview

```
GitHub push → CI tests → Docker build → Docker Hub → SSH → docker compose up
```

The Hetzner server runs:
- **Nginx** (host) — TLS termination, reverse proxy
- **Go API container** — port 8081 (internal)
- **React client container** — port 3000 (internal)

Database is managed by **Neon DB** (external, no container needed).

---

## Part 1 — One-Time Hetzner Server Setup

### 1.1 Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group to take effect
```

### 1.2 Ensure Certbot is installed (for SSL/TLS)

Since Nginx is already installed, you only need to make sure Certbot is installed to obtain SSL certificates:

```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
```

### 1.3 Create App Directory

```bash
sudo mkdir -p /opt/evolv
sudo chown $USER:$USER /opt/evolv
```

### 1.4 Copy `docker-compose.prod.yml` to the Server

From your local machine:

```bash
scp docker-compose.prod.yml root@<YOUR_SERVER_IP>:/opt/evolv/
```

Or paste the contents directly on the server:

```bash
nano /opt/evolv/docker-compose.prod.yml
```

### 1.5 Create the `.env` File on the Server

```bash
nano /opt/evolv/.env
```

Paste the following and fill in your values:

```env
# Docker Hub
DOCKERHUB_USERNAME=your_dockerhub_username

# Database (Neon DB)
DATABASE_URL=postgresql://***REDACTED_USER***:***REDACTED***@***REDACTED_HOST***/neondb?sslmode=require&channel_binding=require

# Server
JWT_SECRET=                   # Generate: openssl rand -hex 32
GEMINI_API_KEY=               # Your Gemini API key

# CORS (must match your domain)
ALLOWED_ORIGIN=https://evolv.shubhamkr.in
```

> **Generate JWT secret:**
> ```bash
> openssl rand -hex 32
> ```

### 1.6 Point Your Domain to the Server

In your DNS provider (wherever `shubhamkr.in` is managed), add an **A record**:

| Type | Name  | Value              |
|------|-------|--------------------|
| A    | evolv | `<YOUR_SERVER_IP>` |

Wait for DNS propagation (usually 1–5 minutes with Cloudflare, up to a few hours elsewhere).

Verify with:
```bash
dig evolv.shubhamkr.in +short
# Should return your server IP
```

### 1.7 Configure Nginx

Copy the nginx config (from `nginx/evolv.conf` in this repo) to the server:

```bash
sudo cp /path/to/evolv.conf /etc/nginx/sites-available/evolv
sudo ln -s /etc/nginx/sites-available/evolv /etc/nginx/sites-enabled/evolv
sudo nginx -t
sudo systemctl reload nginx
```

### 1.8 Get SSL Certificate (Let's Encrypt)

> DNS must be pointing to your server before running this.

```bash
sudo certbot --nginx -d evolv.shubhamkr.in
```

Follow the prompts. Certbot will automatically update your Nginx config with SSL paths and set up auto-renewal.

Test auto-renewal:
```bash
sudo certbot renew --dry-run
```

---

## Part 2 — GitHub Secrets Setup

Go to your GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**

Add these 6 secrets:

| Secret Name          | Value                                                    |
|----------------------|----------------------------------------------------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username                                 |
| `DOCKERHUB_TOKEN`    | Docker Hub access token (see below)                      |
| `HETZNER_HOST`       | Your Hetzner server IP address                           |
| `HETZNER_USER`       | SSH user (usually `root`)                                |
| `HETZNER_SSH_KEY`    | Your **private** SSH key (full PEM content, starts with `-----BEGIN...`) |
| `VITE_API_URL`       | `https://evolv.shubhamkr.in/api`                         |

### Create a Docker Hub Access Token

1. Go to [hub.docker.com](https://hub.docker.com) → your account → **Account Settings → Security**
2. Click **New Access Token**
3. Name it `github-actions-evolv`, set permissions to **Read & Write**
4. Copy the token and add it as `DOCKERHUB_TOKEN` secret

### Generate and Add SSH Key for Hetzner

If you don't already have an SSH key pair:

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-evolv" -f ~/.ssh/evolv_deploy
```

Add the **public key** to your Hetzner server:
```bash
cat ~/.ssh/evolv_deploy.pub >> ~/.ssh/authorized_keys
```

Add the **private key** (`~/.ssh/evolv_deploy` — the file WITHOUT `.pub`) as the `HETZNER_SSH_KEY` GitHub secret (copy the entire content including the `-----BEGIN...-----END...` lines).

---

## Part 3 — First Deployment

Once everything above is done:

```bash
# On your local machine, from the repo root
git push origin main
```

GitHub Actions will:
1. Run Go tests
2. Run frontend build (TypeScript check)
3. Build Docker images and push to Docker Hub
4. SSH into your Hetzner server and run:
   ```bash
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker image prune -f
   ```

Monitor the pipeline at: `https://github.com/<your-repo>/actions`

---

## Part 4 — Verify Everything Works

```bash
# SSH into your Hetzner server
ssh root@<YOUR_SERVER_IP>

# Check containers are running
docker ps
# Should show: evolv-server, evolv-client

# Check logs
docker compose -f /opt/evolv/docker-compose.prod.yml logs -f server
docker compose -f /opt/evolv/docker-compose.prod.yml logs -f client
```

Visit **https://evolv.shubhamkr.in** in your browser.

---

## Useful Commands (on Hetzner Server)

```bash
# Manually pull and restart (if needed)
cd /opt/evolv
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d

# View live logs
docker compose -f docker-compose.prod.yml logs -f

# Restart a single service
docker compose -f docker-compose.prod.yml restart server

# Rollback to a specific version (replace sha with commit hash)
docker pull yourusername/evolv-server:<commit-sha>
# Edit docker-compose.prod.yml to use the specific tag, then:
docker compose -f docker-compose.prod.yml up -d

# Free up old images
docker image prune -f
```

---

## Architecture Summary

```
Internet
    │
    ▼
Nginx :443 (evolv.shubhamkr.in) — TLS via Let's Encrypt
    │
    ├── /        → :3000 (evolv-client Docker container — Nginx serving React SPA)
    └── /api/    → :8081 (evolv-server Docker container — Go API)
                        │
                        └── Neon DB (managed PostgreSQL, ap-southeast-1)
```

---

## Files That Are NOT in Git (Managed Manually)

| File | Location on Server | Reason |
|------|--------------------|--------|
| `nginx/evolv.conf` | `/etc/nginx/sites-available/evolv` | Contains domain config |
| `.env` | `/opt/evolv/.env` | Contains secrets |
