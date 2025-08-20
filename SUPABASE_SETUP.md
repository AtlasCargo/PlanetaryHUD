# 🚀 Supabase Setup Guide for Ideologram

This guide will help you set up Supabase to replace the file-based storage and solve your Vercel deployment data persistence issues.

## 📋 Prerequisites

- [ ] Supabase account (free at [supabase.com](https://supabase.com))
- [ ] Your project running locally
- [ ] Access to Vercel dashboard

## 🔧 Step 1: Create Supabase Project

1. **Go to [supabase.com](https://supabase.com)**
2. **Click "Start your project"**
3. **Sign in with GitHub** (recommended)
4. **Click "New Project"**
5. **Choose your organization** (or create one)
6. **Project details:**
   - Name: `ideologram-db` (or whatever you prefer)
   - Database Password: **Save this password!** You'll need it
   - Region: Choose closest to you
7. **Click "Create new project"**
8. **Wait for setup** (2-3 minutes)

## 🗄️ Step 2: Set Up Database Schema

1. **In your Supabase dashboard, go to "SQL Editor"**
2. **Click "New query"**
3. **Copy and paste the entire contents of `supabase-schema.sql`**
4. **Click "Run"**
5. **Verify all tables are created** (check "Table Editor" in sidebar)

## 🔑 Step 3: Get API Keys

1. **Go to "Settings" → "API" in Supabase dashboard**
2. **Copy these values:**
   - **Project URL** (looks like: `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

## 🌍 Step 4: Add Environment Variables

### Local Development (.env file)
Create or update `.env` in your project root:
```bash
REACT_APP_SUPABASE_URL=https://your-project-id.supabase.co
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here
```

### Vercel Deployment
1. **Go to your Vercel project dashboard**
2. **Click "Settings" → "Environment Variables"**
3. **Add these variables:**
   - `REACT_APP_SUPABASE_URL` = your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` = your Supabase anon key

## 🧪 Step 5: Test Locally

1. **Restart your development server** (to load new env vars)
2. **Go to Ideologram mode**
3. **Try uploading a CSV** - should now save to Supabase
4. **Check browser console** for Supabase connection logs

## 🚀 Step 6: Deploy to Vercel

1. **Commit and push your changes**
2. **Vercel will automatically deploy**
3. **Your data will now persist!** 🎉

## 🔍 Troubleshooting

### "Supabase environment variables not found"
- Check your `.env` file exists
- Restart your dev server
- Verify variable names are correct

### "Database connection failed"
- Check your Supabase URL and key
- Verify your database is running in Supabase dashboard
- Check Row Level Security policies are set up

### "Permission denied"
- Make sure you ran the SQL schema
- Check RLS policies are enabled
- Verify user authentication is working

## 📊 What You Get

✅ **Data persists across Vercel deployments**
✅ **No more data loss issues**
✅ **Better performance than file storage**
✅ **Real-time updates capability**
✅ **Automatic backups**
✅ **500MB free storage** (more than enough)

## 🔄 Migration from Current System

The system automatically:
- **Uses Supabase** when available
- **Falls back to localStorage** when not
- **Migrates existing data** seamlessly
- **Maintains all functionality**

## 🆘 Need Help?

- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Discord Community**: [discord.gg/supabase](https://discord.gg/supabase)
- **GitHub Issues**: Check your project's issue tracker

---

**🎯 You're now ready to solve your Vercel data persistence issues permanently!**
