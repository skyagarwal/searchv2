# Quick Git Setup Guide

## 🚀 Fast Setup (3 Steps)

### Step 1: Run the Setup Script

```bash
cd /home/ubuntu/Devs/Search
./setup-git-repo.sh
```

This will:
- ✅ Initialize Git repository
- ✅ Add all files (respecting .gitignore)
- ✅ Create initial commit

### Step 2: Create Remote Repository

Choose one:

**GitHub:**
1. Go to https://github.com/new
2. Repository name: `mangwale-search` (or your preferred name)
3. Choose Public or Private
4. **DO NOT** check "Initialize with README"
5. Click "Create repository"

**GitLab:**
1. Go to https://gitlab.com/projects/new
2. Project name: `mangwale-search`
3. Choose visibility
4. **DO NOT** initialize with README
5. Click "Create project"

### Step 3: Push to Remote

After creating the remote repository, run:

```bash
# Replace with your actual repository URL
git remote add origin https://github.com/YOUR_USERNAME/mangwale-search.git

# Or for SSH:
# git remote add origin git@github.com:YOUR_USERNAME/mangwale-search.git

# Rename branch to main
git branch -M main

# Push to remote
git push -u origin main
```

## ✅ Verify Setup

```bash
# Check remote
git remote -v

# Check status
git status

# View commits
git log --oneline
```

## 📝 Manual Setup (Alternative)

If you prefer manual setup:

```bash
cd /home/ubuntu/Devs/Search

# Initialize
git init

# Configure user (if not set globally)
git config user.name "Your Name"
git config user.email "your.email@example.com"

# Add files
git add .

# Commit
git commit -m "Initial commit: Mangwale Search API"

# Add remote and push (after creating remote repo)
git remote add origin <YOUR_REPO_URL>
git branch -M main
git push -u origin main
```

## 🔒 Security Checklist

Before pushing, ensure:
- ✅ No `.env` files with secrets
- ✅ No API keys in code
- ✅ No database passwords
- ✅ `.gitignore` is properly configured

## 📚 More Information

See `GIT_SETUP_INSTRUCTIONS.md` for detailed documentation.



