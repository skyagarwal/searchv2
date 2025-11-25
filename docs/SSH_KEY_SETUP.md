# SSH Key Setup for MangwaleDev GitHub Account

## 🔑 Your SSH Public Key

Copy this entire key (it's one line):

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIAyP5q2ZCtlmftdbjnMrL9AfThiEELJvYYivirrZiGDt mangwale.backend@gmail.com
```

## 📋 Steps to Add SSH Key to GitHub

### Step 1: Copy the Public Key

The public key has been generated and is shown above. Copy the entire line starting with `ssh-ed25519`.

### Step 2: Add Key to GitHub

1. **Go to GitHub Settings:**
   - Visit: https://github.com/settings/keys
   - Or: GitHub → Your Profile (top right) → Settings → SSH and GPG keys

2. **Click "New SSH key"** button

3. **Fill in the form:**
   - **Title**: `MangwaleDev - Jupiter Server` (or any descriptive name)
   - **Key type**: `Authentication Key` (default)
   - **Key**: Paste the entire public key from above

4. **Click "Add SSH key"**

5. **Confirm with your GitHub password** (if prompted)

### Step 3: Verify the Setup

After adding the key, test the connection:

```bash
ssh -T git@github.com
```

You should see:
```
Hi MangwaleDev! You've successfully authenticated, but GitHub does not provide shell access.
```

## ✅ Current Configuration

- **SSH Key Location**: `~/.ssh/id_ed25519_mangwaledev`
- **Public Key**: `~/.ssh/id_ed25519_mangwaledev.pub`
- **SSH Config**: Updated to use this key for GitHub
- **Email**: mangwale.backend@gmail.com

## 🔧 Quick Commands

### View Public Key Again
```bash
cat ~/.ssh/id_ed25519_mangwaledev.pub
```

### Test SSH Connection
```bash
ssh -T git@github.com
```

### Add Key to SSH Agent (if needed)
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519_mangwaledev
```

## 🐛 Troubleshooting

### If "Permission denied" error:

1. **Verify key is added to GitHub:**
   - Check: https://github.com/settings/keys
   - Ensure the key is listed and enabled

2. **Check SSH config:**
   ```bash
   cat ~/.ssh/config
   ```
   Should show:
   ```
   Host github.com
       HostName github.com
       User git
       IdentityFile ~/.ssh/id_ed25519_mangwaledev
       IdentitiesOnly yes
   ```

3. **Test with verbose output:**
   ```bash
   ssh -vT git@github.com
   ```

4. **Ensure key permissions are correct:**
   ```bash
   chmod 600 ~/.ssh/id_ed25519_mangwaledev
   chmod 644 ~/.ssh/id_ed25519_mangwaledev.pub
   chmod 600 ~/.ssh/config
   ```

## 📝 Next Steps

After adding the key to GitHub and verifying the connection:

1. **Run the Git setup script:**
   ```bash
   cd /home/ubuntu/Devs/Search
   ./setup-git-remote.sh
   ```

2. **Push to repository:**
   ```bash
   git push -u origin main
   ```

---

**Key Generated**: $(date)  
**For Account**: MangwaleDev  
**Email**: mangwale.backend@gmail.com

