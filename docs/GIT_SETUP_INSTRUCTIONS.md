# Git Repository Setup Instructions

This document provides step-by-step instructions for setting up a Git repository for the Mangwale Search project.

## Prerequisites

- Git installed on your system
- Access to a Git hosting service (GitHub, GitLab, Bitbucket, etc.)
- Basic knowledge of Git commands

## Quick Setup

### Option 1: Automated Setup (Recommended)

Run the setup script:

```bash
cd /home/ubuntu/Devs/Search
./setup-git-repo.sh
```

The script will:
- Initialize the Git repository
- Add all files (respecting `.gitignore`)
- Create an initial commit
- Provide instructions for pushing to remote

### Option 2: Manual Setup

If you prefer to set up manually, follow these steps:

#### Step 1: Initialize Git Repository

```bash
cd /home/ubuntu/Devs/Search
git init
```

#### Step 2: Configure Git User (if not already set globally)

```bash
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

#### Step 3: Add All Files

```bash
git add .
```

#### Step 4: Create Initial Commit

```bash
git commit -m "Initial commit: Mangwale Search API with module_id based search

- NestJS search API with OpenSearch integration
- React frontend with Vite
- Module ID based search endpoints (v2)
- Enhanced store and item search with fallback
- Docker Compose setup for production
- Caddy reverse proxy with SSL/TLS
- Semantic search with vector embeddings
- Full-text search with faceting
- Analytics and trending queries
- Natural language search agent"
```

## Creating Remote Repository

### On GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Enter repository name (e.g., `mangwale-search`)
5. Choose visibility (Public or Private)
6. **DO NOT** initialize with README, .gitignore, or license (we already have these)
7. Click "Create repository"

### On GitLab

1. Go to [GitLab](https://gitlab.com) and sign in
2. Click "New project" or the "+" icon
3. Select "Create blank project"
4. Enter project name and choose visibility
5. **DO NOT** initialize with README
6. Click "Create project"

### On Bitbucket

1. Go to [Bitbucket](https://bitbucket.org) and sign in
2. Click "Create" → "Repository"
3. Enter repository name
4. Choose visibility
5. **DO NOT** initialize with README
6. Click "Create repository"

## Pushing to Remote

After creating the remote repository, add it and push:

```bash
# Add remote (replace with your repository URL)
git remote add origin https://github.com/yourusername/mangwale-search.git

# Or for SSH:
# git remote add origin git@github.com:yourusername/mangwale-search.git

# Rename default branch to main (if needed)
git branch -M main

# Push to remote
git push -u origin main
```

## Verifying Setup

Check that everything is set up correctly:

```bash
# Check remote configuration
git remote -v

# Check current branch
git branch

# Check commit history
git log --oneline -5

# Check repository status
git status
```

## Files Excluded from Repository

The following files and directories are excluded via `.gitignore`:

- `node_modules/` - Node.js dependencies
- `dist/` - Build outputs
- `venv/` - Python virtual environment
- `*.log` - Log files
- `*.pid` - Process ID files
- `*.sql` - Database dump files
- `.env` - Environment variables
- `data/` - Data directories
- Docker volumes and data directories

## Repository Structure

```
Search/
├── apps/
│   ├── search-api/          # NestJS backend API
│   └── search-web/          # React frontend
├── connectors/               # Database connectors
├── scripts/                 # Utility scripts
├── nginx/                    # Nginx configuration
├── opensearch/              # OpenSearch setup scripts
├── docker-compose.yml       # Development Docker setup
├── docker-compose.production.yml  # Production Docker setup
├── Dockerfile.api           # API Dockerfile
├── Dockerfile.frontend      # Frontend Dockerfile
├── Dockerfile.embedding     # Embedding service Dockerfile
├── Caddyfile                # Caddy reverse proxy config
├── package.json             # Node.js dependencies
├── tsconfig.json            # TypeScript configuration
├── .gitignore               # Git ignore rules
└── README.md                # Project documentation
```

## Common Git Commands

### Daily Workflow

```bash
# Check status
git status

# Add changes
git add <file>
# Or add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to remote
git push

# Pull latest changes
git pull
```

### Branch Management

```bash
# Create new branch
git checkout -b feature/new-feature

# Switch branch
git checkout main

# List branches
git branch

# Merge branch
git checkout main
git merge feature/new-feature
```

### Viewing History

```bash
# View commit history
git log

# View changes in a file
git log -p <file>

# View who changed what
git blame <file>
```

## Troubleshooting

### Issue: "fatal: not a git repository"

**Solution:** Make sure you're in the project directory and run `git init`

### Issue: "Permission denied (publickey)"

**Solution:** Set up SSH keys for your Git hosting service, or use HTTPS with a personal access token

### Issue: Large files causing slow push

**Solution:** Check `.gitignore` is properly excluding large files. Use `git-lfs` for large binary files if needed.

### Issue: Accidentally committed sensitive data

**Solution:** 
1. Remove from history: `git filter-branch` or `git filter-repo`
2. Update `.gitignore` to prevent future commits
3. Force push (if already pushed): `git push --force` (use with caution!)

## Security Notes

⚠️ **Important:** Before pushing to a public repository:

1. **Never commit:**
   - API keys or secrets
   - Database passwords
   - `.env` files with sensitive data
   - Private keys or certificates

2. **Review `.gitignore`** to ensure sensitive files are excluded

3. **Use environment variables** for configuration:
   - Create `.env.example` with placeholder values
   - Document required environment variables in README

4. **Scan for secrets** before pushing:
   ```bash
   # Use tools like git-secrets or truffleHog
   ```

## Next Steps

After setting up the repository:

1. ✅ Add collaborators (if needed)
2. ✅ Set up CI/CD pipelines
3. ✅ Configure branch protection rules
4. ✅ Add issue templates
5. ✅ Set up automated testing
6. ✅ Configure deployment workflows

## Support

For issues or questions:
- Check the project README.md
- Review Git documentation: https://git-scm.com/doc
- Check your Git hosting service's documentation

---

**Last Updated:** $(date)



