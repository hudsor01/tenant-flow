# n8n Stack for Server Deployment

## 📁 What's in this directory

**Files you need for server deployment:**
- `docker-compose-n8n-stack.yml` - Main Docker Compose file
- `.env.n8n-stack` - Environment template (copy to `.env`)
- `n8n-stack-manager.sh` - Management script
- `listmonk-config.toml` - Listmonk email configuration

**Documentation:**
- `README.md` - This file
- `DEPLOYMENT-GUIDE.md` - Detailed setup instructions
- `SERVER-FIREWALL.md` - Firewall configuration guide
- `server-security-guide.md` - Security best practices

## 🚀 Quick Deploy to Server

### 1. Copy files to your server
```bash
# From your local machine
scp -r /Users/richard/Developer/tenant-flow/n8n/* user@your-server:/opt/n8n/
```

### 2. Setup environment on server
```bash
# SSH to your server
ssh user@your-server
cd /opt/n8n

# Create environment file
cp .env.n8n-stack .env
nano .env  # Edit with your passwords

# Make manager script executable
chmod +x n8n-stack-manager.sh
```

### 3. Start the stack
```bash
./n8n-stack-manager.sh start
```

## 🔗 Service Access

After deployment, access from your local machine:
- **n8n**: http://your-server-ip:5678
- **NocoDB**: http://your-server-ip:8088
- **Listmonk**: http://your-server-ip:9000
- **Ollama**: http://your-server-ip:11434

## 📋 What happens automatically

The stack will automatically:
1. Create PostgreSQL databases for n8n, nocodb, listmonk, penpot
2. Set up all service networking
3. Configure health checks
4. Pull Ollama models when you run setup-ollama

**No manual SQL needed!** PostgreSQL automatically creates databases when services start.

## 🎯 n8n Workflow URLs

Your n8n workflows should use these container URLs:
- Ollama: `http://ollama:11434`
- NocoDB: `http://nocodb:8088` 
- Listmonk: `http://listmonk:9000`
- Stirling PDF: `http://stirling-pdf:8080`

## 🛠️ Management Commands

```bash
./n8n-stack-manager.sh start    # Start all services
./n8n-stack-manager.sh stop     # Stop all services  
./n8n-stack-manager.sh status   # Check service status
./n8n-stack-manager.sh logs n8n # View n8n logs
./n8n-stack-manager.sh backup   # Backup all data
```

## ⚠️ Important Notes

1. **Firewall**: Make sure your server allows traffic on ports 5678, 8088, 9000, etc.
2. **Security**: Change all passwords in `.env` file before starting
3. **Backups**: Run `./n8n-stack-manager.sh backup` regularly
4. **Updates**: Use `docker-compose pull` then restart to update images