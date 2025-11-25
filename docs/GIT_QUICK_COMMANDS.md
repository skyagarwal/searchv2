# Git Quick Reference Commands

## 🚀 Initial Setup (Run Once)

```bash
cd /home/ubuntu/Devs/Search

# Run automated setup script
./setup-git-remote.sh

# OR manual setup:
git config --global user.email "mangwale.backend@gmail.com"
git config --global user.name "MangwaleDev"
git init
git remote add origin git@github.com:MangwaleDev/search-mangwale-ai.git
git add .
git commit -m "Initial commit: Mangwale Search API"
git branch -M main
git fetch origin
git merge origin/main  # If remote has code
git push -u origin main
```

## 📋 Daily Commands

```bash
# Check status
git status

# See what changed
git diff

# Stage all changes
git add .

# Commit changes
git commit -m "Your commit message"

# Push to remote
git push

# Pull latest changes
git pull origin main
```

## 🔍 Viewing Information

```bash
# View commit history
git log --oneline -10

# View branch structure
git log --oneline --graph --all -10

# Check remote configuration
git remote -v

# See what's ahead/behind
git status -sb
```

## 🔄 Branch Management

```bash
# Create new branch
git checkout -b feature/name

# Switch branch
git checkout main

# List branches
git branch -a

# Delete branch
git branch -d branch-name
```

## ⚠️ Conflict Resolution

```bash
# If merge conflict occurs:
git status                    # See conflicted files
# Edit files to resolve conflicts
git add <resolved-file>       # Stage resolved file
git commit                    # Complete merge

# Or abort merge
git merge --abort
```

## 🔧 Troubleshooting

```bash
# Test SSH connection
ssh -T git@github.com

# Update remote URL
git remote set-url origin git@github.com:MangwaleDev/search-mangwale-ai.git

# Reset to remote state (⚠️ destructive)
git fetch origin
git reset --hard origin/main
```

