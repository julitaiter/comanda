#!/usr/bin/env sh
set -eu

# Comanda - build/dev helper for Linux, macOS, Git Bash, WSL, Render, etc.
# For Windows PowerShell, use setup.ps1 instead.

pause_on_exit() {
  status=$?

  echo ""
  if [ "$status" -eq 0 ]; then
    echo "Proceso finalizado."
  else
    echo "Proceso finalizado con error. Codigo: $status"
  fi

  echo "Presiona Enter para cerrar..."
  read _

  exit "$status"
}

trap pause_on_exit EXIT

if [ -f ".env" ]; then
  # Load simple KEY=value entries from .env.
  # Lines beginning with # are ignored.
  set -a
  . ./.env
  set +a
fi

if [ -n "${NODE_PATH_DIR:-}" ]; then
  export PATH="$NODE_PATH_DIR:$PATH"
fi

if [ -n "${NPM_PATH_DIR:-}" ]; then
  export PATH="$NPM_PATH_DIR:$PATH"
fi

echo "Checking Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node was not found in PATH."
  echo "Set NODE_PATH_DIR in .env or install Node.js."
  exit 1
fi

echo "Checking npm..."
if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm was not found in PATH."
  echo "Set NPM_PATH_DIR in .env or install npm."
  exit 1
fi

echo "Node version:"
node -v

echo "npm version:"
npm -v

echo "Installing dependencies..."
npm install

echo "Starting development server..."
npm run dev