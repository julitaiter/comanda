# Comanda scripts

## Windows PowerShell

Run from project root:

```powershell
.\setup.ps1
```

If Windows blocks the script before it can change the policy, run once:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then:

```powershell
.\setup.ps1
```

## Linux, macOS, WSL, Git Bash

```bash
chmod +x build.sh
./build.sh
```

## .env

Create `.env` from `.env.example` only if node/npm are not found automatically.
