# Git Remote Repository Setup Guide

## 🎯 Objective

Connect the local Search folder to the GitHub repository `git@github.com:MangwaleDev/search-mangwale-ai.git` and safely merge local changes with existing remote code.

## 📋 Prerequisites

1. **SSH Key Setup**: Ensure your SSH key is added to GitHub
   ```bash
   # Test SSH connection
   ssh -T git@github.com
   # Should return: Hi MangwaleDev! You've successfully authenticated...
   ```

2. **Repository Access**: Verify you have access to `MangwaleDev/search-mangwale-ai`
   - Go to: https://github.com/MangwaleDev/search-mangwale-ai
   - Ensure you have write access

3. **Git Configuration**: Already configured via script:
   - Name: `MangwaleDev`
   - Email: `mangwale.backend@gmail.com`

## 🚀 Quick Setup (Automated)

### Option 1: Run the Setup Script

```bash
cd /home/ubuntu/Devs/Search
./setup-git-remote.sh
```

The script will:
- ✅ Configure Git user (global)
- ✅ Initialize Git repository (if needed)
- ✅ Add/update remote repository
- ✅ Stage and commit local changes
- ✅ Fetch remote repository
- ✅ Merge local and remote changes
- ✅ Handle conflicts (if any)

### Option 2: Manual Setup

If you prefer manual setup or need more control:

#### Step 1: Configure Git User

```bash
git config --global user.email "mangwale.backend@gmail.com"
git config --global user.name "MangwaleDev"
```

#### Step 2: Initialize Git Repository

```bash
cd /home/ubuntu/Devs/Search

# Initialize if not already done
git init

# Check status
git status
```

#### Step 3: Add Remote Repository

```bash
# Add remote (or update if exists)
git remote add origin git@github.com:MangwaleDev/search-mangwale-ai.git

# Or update existing remote
# git remote set-url origin git@github.com:MangwaleDev/search-mangwale-ai.git

# Verify remote
git remote -v
```

#### Step 4: Stage and Commit Local Changes

```bash
# Stage all files (respects .gitignore)
git add .

# Check what will be committed
git status

# Commit local changes
git commit -m "Local changes: Mangwale Search API

- Complete Search system with module_id architecture
- NestJS backend API with OpenSearch integration
- React frontend with Vite
- Docker Compose setup for production
- Caddy reverse proxy with SSL/TLS
- Semantic search with vector embeddings
- Full-text search with faceting
- Analytics and trending queries
- Natural language search agent
- Complete documentation and deployment guides"
```

#### Step 5: Fetch Remote Repository

```bash
# Fetch remote branches and commits
git fetch origin

# Check remote branches
git branch -r
```

#### Step 6: Merge Strategy

**Scenario A: Remote has code, Local has code (Most Common)**

```bash
# Ensure you're on main branch
git checkout -b main  # or git checkout main if exists

# Merge remote changes
git merge origin/main --no-edit

# If conflicts occur, resolve them:
# 1. Check conflicts: git status
# 2. Edit conflicted files (look for <<<<<<, ======, >>>>>> markers)
# 3. Stage resolved files: git add <file>
# 4. Complete merge: git commit
```

**Scenario B: Remote is empty or doesn't exist**

```bash
# Just push your local branch
git branch -M main
git push -u origin main
```

**Scenario C: You want to keep remote as base, add local on top**

```bash
# Fetch and checkout remote
git fetch origin
git checkout -b main origin/main

# Create a branch for your local changes
git checkout -b local-changes

# Cherry-pick or merge your local commits
# (This depends on your specific situation)
```

#### Step 7: Push to Remote

```bash
# Push to remote (first time)
git push -u origin main

# Subsequent pushes
git push
```

## 🔧 Handling Merge Conflicts

If merge conflicts occur:

### 1. Identify Conflicts

```bash
git status
# Shows files with conflicts
```

### 2. Resolve Conflicts

Open conflicted files and look for markers:
```
<<<<<<< HEAD
Your local changes
=======
Remote changes
>>>>>>> origin/main
```

Edit the file to keep the desired code, remove the markers.

### 3. Stage Resolved Files

```bash
git add <resolved-file>
```

### 4. Complete Merge

```bash
git commit
```

### 5. Or Abort Merge

```bash
git merge --abort
```

## 📊 Verification

After setup, verify everything is correct:

```bash
# Check remote configuration
git remote -v

# Check current branch
git branch

# Check status
git status

# View commit history
git log --oneline --graph --all -10

# Check what's ahead/behind
git status -sb
```

## 🔄 Common Workflows

### Daily Workflow

```bash
# Pull latest changes
git pull origin main

# Make your changes
# ... edit files ...

# Stage and commit
git add .
git commit -m "Your commit message"

# Push changes
git push
```

### Creating a Feature Branch

```bash
# Create and switch to new branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "Add feature X"

# Push branch to remote
git push -u origin feature/your-feature-name
```

### Syncing with Remote

```bash
# Fetch latest changes
git fetch origin

# Merge remote changes
git merge origin/main

# Or rebase (cleaner history)
git rebase origin/main
```

## ⚠️ Important Notes

1. **Never force push to main** unless absolutely necessary
   ```bash
   # ⚠️ Dangerous - only use if you know what you're doing
   git push --force origin main
   ```

2. **Always pull before pushing** to avoid conflicts
   ```bash
   git pull origin main
   git push
   ```

3. **Review changes before committing**
   ```bash
   git diff          # See unstaged changes
   git diff --cached # See staged changes
   ```

4. **Use meaningful commit messages**
   - Be descriptive
   - Reference issues/tickets if applicable
   - Follow project conventions

## 🐛 Troubleshooting

### SSH Key Issues

```bash
# Test SSH connection
ssh -T git@github.com

# If fails, check SSH key
ls -la ~/.ssh/

# Add SSH key to agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_rsa  # or your key name
```

### Remote Repository Not Found

```bash
# Verify repository exists and you have access
# Visit: https://github.com/MangwaleDev/search-mangwale-ai

# Check remote URL
git remote -v

# Update if needed
git remote set-url origin git@github.com:MangwaleDev/search-mangwale-ai.git
```

### Permission Denied

```bash
# Ensure SSH key is added to GitHub account
# Settings > SSH and GPG keys > New SSH key

# Test connection
ssh -T git@github.com
```

### Large Files Warning

If you see warnings about large files:

```bash
# Check for large files
find . -type f -size +50M -not -path "./.git/*" -not -path "./node_modules/*"

# Add to .gitignore if needed
echo "large-file.bin" >> .gitignore
git rm --cached large-file.bin
git commit -m "Remove large file"
```

## 📚 Additional Resources

- [Git Documentation](https://git-scm.com/doc)
- [GitHub SSH Setup](https://docs.github.com/en/authentication/connecting-to-github-with-ssh)
- [Git Merge Strategies](https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging)

## ✅ Checklist

Before pushing to remote, ensure:

- [ ] Git user is configured correctly
- [ ] SSH key is set up and tested
- [ ] Remote repository URL is correct
- [ ] `.gitignore` is properly configured
- [ ] No sensitive data (API keys, passwords) in code
- [ ] No large files that shouldn't be in repo
- [ ] All local changes are committed
- [ ] Remote changes are fetched and merged
- [ ] No merge conflicts (or resolved if any)
- [ ] Ready to push

---

**Repository**: `git@github.com:MangwaleDev/search-mangwale-ai.git`  
**User**: MangwaleDev  
**Email**: mangwale.backend@gmail.com

