# Setting Up Environment Variables

## Create .env File

Since `.env` files are gitignored for security, you need to create one manually.

### Step 1: Create the file

In the `typewriter_notion` directory, create a file named `.env`

### Step 2: Add your configuration

Copy this template and replace with your actual values:

```env
# Notion API Configuration
NOTION_TOKEN=your_notion_token_here
NOTION_BLOCK_ID=2297e0b5c63440f883ea65aedc7611d1
```

### Step 3: Get your Notion token

1. Go to [Notion Integrations](https://www.notion.so/my-integrations)
2. Create a new integration or use an existing one
3. Copy the "Internal Integration Token"
4. Paste it as the `NOTION_TOKEN` value

### Step 4: Get your Block ID

1. Open your Notion page
2. Click "..." menu → "Copy link"
3. The URL will contain the block/page ID
4. Extract the ID (the part after the last `/` and before any `?`)

## Files that use .env

- ✅ `proxy-server.js` - Uses `NOTION_TOKEN` from .env
- ✅ `api/notion.js` - Uses `NOTION_TOKEN` from environment (Vercel)

## For Vercel Deployment

When deploying to Vercel, add the environment variable in Vercel dashboard:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add `NOTION_TOKEN` with your token value
4. Redeploy

## Security Note

- ✅ `.env` is in `.gitignore` - it won't be committed to git
- ✅ `.env.example` is committed as a template
- ⚠️ Never commit your actual `.env` file

