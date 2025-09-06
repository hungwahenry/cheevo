# Cheevo 🎓

**Campus Social Media Platform**

A React Native social media app built for university communities with advanced privacy controls and intelligent content algorithms.

## ✨ Features

- 🏫 Campus-focused networking with global discovery
- 🔒 Granular privacy controls (profile, reactions, comments)
- 🔥 Multiple feed algorithms (trending, chronological, discovery)
- 💬 Real-time comments with optimistic updates
- ✅ University email verification system
- 📊 Post analytics and engagement metrics

## 🛠 Tech Stack

- **Frontend:** React Native + Expo + TypeScript
- **Backend:** Supabase (PostgreSQL + Edge Functions)
- **Auth:** JWT with university verification
- **Security:** Row Level Security + privacy functions

## 🚀 Setup

```bash
# Clone and install
git clone https://github.com/hungwahenry/cheevo.git
cd cheevo
npm install

# Configure environment
cp .env.example .env
# Add your Supabase URL, anon key, and Giphy API key

# Set up database
supabase link --project-ref your-project-ref
supabase db push
supabase functions deploy

# Run the app
npm start
```

## 📱 Platform Support

- ✅ iOS / Android / Web
- ✅ Expo Go development
- ✅ EAS production builds

---

[Henry Hungwa](https://github.com/hungwahenry)