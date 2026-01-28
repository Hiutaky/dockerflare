# Troubleshooting Guide

This guide addresses common issues you may encounter when using Dockerflare. Problems are categorized by area, with detailed solutions and diagnostic steps.

## 🚀 Startup Issues

### Application Won't Start

**Symptoms:**

- Port 3000 already in use
- Database connection errors
- Missing dependencies

**Solutions:**

**Port Already in Use:**

```bash
# Find what's using port 3000
lsof -i :3000

# Kill the process (replace PID)
kill -9 <PID>

# Or change Dockerflare port
PORT=3001 bun run dev
```

**Database Connection Failed:**

```bash
# Check database file exists
ls -la dev.db

# Reset database if corrupted
bunx prisma migrate reset

# Generate Prisma client
bunx prisma generate
```

**Missing Dependencies:**

```bash
# Clear and reinstall dependencies
rm -rf node_modules package-lock.json yarn.lock
bun install

# If still failing, check Node.js version
node --version  # Should be 18+
```

### Database Migration Errors

**Prisma Schema Outdated:**

```bash
# Pull latest changes
git pull origin main

# Generate client and run migrations
bunx prisma generate
bunx prisma migrate dev

# If conflicts, reset and migrate
bunx prisma migrate reset
```

**Migration Files Missing:**

```bash
# Check migration files exist
ls prisma/migrations/

# Re-create initial migration
bunx prisma migrate dev --name init
```

## 🐳 Docker Connection Problems

### Cannot Connect to Docker Host

**Symptoms:**

- "Host unreachable" errors
- Containers not loading
- Operations failing

**Diagnostic Steps:**

**Check Docker Status:**

```bash
# Verify Docker daemon is running
docker info

# Check Docker Engine API is enabled
curl -v http://localhost:2375/info

# Test with Docker CLI
docker ps
```

**Network Connectivity:**

```bash
# Check Docker daemon port is accessible
telnet localhost 2375

# If using remote host, test network
ping <docker-host-ip>
nc -zv <docker-host-ip> 2375
```

**Docker Engine API Configuration:**

```bash
# Check daemon.json configuration
cat /etc/docker/daemon.json

# Should contain:
{
  "hosts": ["unix:///var/run/docker.sock", "tcp://0.0.0.0:2375"]
}

# Restart Docker if configuration changed
sudo systemctl restart docker
```

### Cloudflare WARP Connection Issues

**WARP Not Connected:**

```bash
# Check WARP status
warp-cli status

# Connect if disconnected
warp-cli connect

# Check registration status
warp-cli registration show
```

**Device Not Appearing in Dockerflare:**

```bash
# Verify WARP is connected to correct organization
warp-cli teams

# Re-register if needed
warp-cli registration delete
warp-cli registration new <token>
```

**Firewall Blocking WARP:**

```bash
# Allow WARP traffic (Linux)
sudo ufw allow out to 162.159.192.0/18
sudo ufw allow out to 162.159.193.0/24

# Check Cloudflare status
curl -I https://1.1.1.1
```

## 🌐 WebSocket Connection Issues

### Real-Time Features Not Working

**Symptoms:**

- Live logs not updating
- Terminal sessions failing
- Container stats not refreshing

**WebSocket Connection Diagnosis:**

**Check Browser Console:**

```javascript
// Open Developer Tools → Console
// Look for WebSocket errors
```

**Server-Side Debugging:**

```bash
# Enable debug logging
DEBUG=* bun run dev

# Check server logs
tail -f logs/server.log
```

### Terminal Session Problems

**Terminal Not Connecting:**

```bash
# Check Docker permissions
docker exec -it <container-id> /bin/bash

# Verify container is running
docker ps | grep <container-id>

# Check container has shell available
docker exec <container-id> which bash || which sh
```

**Terminal Input Not Working:**

- Some containers don't have `/bin/bash` or interactive shells
- Check container configuration for CMD/ENTRYPOINT
- Try alternative shells: `/bin/sh`, `/bin/ash`

## 📊 Performance Issues

### Host Status Updates Slow

**Host Discovery Issues:**

```bash
# Increase timeout for host checks
# Edit Docker client configuration (advanced)
```

**Batch Status Updates:**

- Reduce number of concurrent host checks
- Increase delay between status checks in settings
- Check network latency to Docker hosts

## 🔐 Permission & Security Issues

### Docker Permission Denied

**Linux Permissions:**

```bash
# Add user to docker group
sudo usermod -aG docker $USER

# Apply group changes
newgrp docker

# Or run with sudo (not recommended)
sudo bun run dev
```

**Container Access Issues:**

```bash
# Check Docker container permissions
docker inspect <container-id> | grep -A 10 "User"

# Run with privileged mode if needed
docker run --privileged <image>
```

### File System Permissions

**Database Write Errors:**

```bash
# Check database file permissions
ls -la dev.db

# Fix permissions
chmod 664 dev.db
chown $USER:$USER dev.db
```

**Log File Permissions:**

```bash
# Ensure log directory is writable
mkdir -p logs
chmod 755 logs
```

## 🖥️ User Interface Issues

### Dashboard Not Loading Data

**API Connection Issues:**

```bash
# Test tRPC endpoints directly
curl http://localhost:3000/api/trpc/docker.getHosts

# Check browser network tab for failed requests
# Look for CORS errors in console
```

**React State Issues:**

```bash
# Clear browser cache and cookies
# Hard refresh (Ctrl+Shift+R)

# Check React DevTools for component errors
```

### Charts Not Displaying

**Missing Dependencies:**

```bash
# Ensure Recharts is installed
bun add recharts

# Check browser compatibility for SVG
```

**Data Format Issues:**

- Verify data structure matches chart expectations
- Check for null/undefined values in chart data

## 🚀 Deployment Issues

### Build Failures

**TypeScript Compilation Errors:**

```bash
# Run type check
bunx tsc --noEmit

# Fix type errors before building
bun run build
```

**Missing Environment Variables:**

```bash
# Ensure all required env vars are set
cat .env

# Check build logs for missing variables
bun run build 2>&1 | grep -i error
```

### Production Runtime Errors

**Database Connection in Production:**

```bash
# Ensure DATABASE_URL is set correctly
echo $DATABASE_URL

# Run migrations in production
bunx prisma migrate deploy
```

**WebSocket Issues in Production:**

- Ensure reverse proxy supports WebSocket upgrades
- Check for missing `wss://` protocol in production URLs
- Verify firewall allows WebSocket connections

## 📱 Mobile & Browser Issues

### Mobile Responsiveness Problems

**Viewport Issues:**

```html
<!-- Ensure proper viewport meta tag -->
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

**Touch Target Sizes:**

- Minimum 44px touch targets for mobile usability
- Check CSS for appropriate touch styles

### Browser Compatibility

**Supported Browsers:**

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Fallbacks for Older Browsers:**

- WebSocket fallbacks to polling (if implemented)
- Progressive enhancement for modern features

## 🔍 Advanced Debugging

### Enable Debug Logging

**Server-Side Debug:**

```bash
# Environment variables
DEBUG=*
NODE_ENV=development

# Application logs
tail -f logs/application.log
```

**Client-Side Debug:**

```javascript
// In browser console
localStorage.setItem("debug", "*");
location.reload();
```

**Database Debug:**

```bash
# Enable Prisma query logging
export DATABASE_URL="file:./dev.db?debug=true"

# Use Prisma Studio
bunx prisma studio
```

### Network Debugging

**API Request Debugging:**

```bash
# Use curl for API testing
curl -X POST http://localhost:3000/api/trpc/docker.getHosts \
  -H "Content-Type: application/json" \
  -d '{}'

# Check network timing
curl -w "@curl-format.txt" -o /dev/null http://localhost:3000
```

## 🆘 Getting Help

### Information to Provide

When reporting issues, include:

- **Environment Details:**

  ```bash
  # System information
  uname -a
  docker --version
  node --version
  bun --version
  ```

- **Relevant Logs:**

  ```bash
  # Application logs
  tail -n 50 logs/application.log

  # Docker logs
  docker logs <container-id>

  # System logs
  journalctl -u docker --no-pager | tail -n 50
  ```

- **Configuration Files:**
  - `prisma/schema.prisma`
  - `/etc/docker/daemon.json`
  - Environment variables (sanitized)

- **Browser Information:**
  - Browser version and OS
  - Console errors and network failures

### Community Support

- Check GitHub Issues for similar problems
- Create detailed bug reports with reproduction steps
- Include screenshots for UI issues
- Tag issues appropriately (frontend, backend, docker, etc.)

This troubleshooting guide should resolve most common issues. If you encounter persistent problems not covered here, please create a GitHub issue with detailed information.
