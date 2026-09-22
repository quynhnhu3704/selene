$ErrorActionPreference = 'Stop'
# Configure your token once with: ngrok config add-authtoken <your-token>
ngrok http 8000 --url=https://startup-marathon-dense.ngrok-free.dev
