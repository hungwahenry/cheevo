# Cheevo 🎓

**Campus Social Media Platform**

A sophisticated React Native social media application designed specifically for university communities. Combines mainstream social platform engagement with privacy-first design and campus-focused networking.

## ✨ Key Features

- 🏫 **Campus-Centric Networking** - Connect within your university or discover content globally
- 🔒 **Advanced Privacy Controls** - Granular settings for profile visibility, reactions, and comments
- 🔥 **Intelligent Feed Algorithms** - Trending, chronological, engagement, balanced, and discovery modes  
- ⚡ **Real-time Engagement** - Optimistic UI updates with robust error handling
- ✅ **University Verification** - Domain-based authentication for genuine campus communities
- 🛡️ **Content Moderation** - Built-in reporting system and admin tools
- 💬 **Nested Comments** - Threaded discussions with real-time updates
- 📊 **Analytics & Insights** - Post performance and engagement metrics
- 🎥 **Rich Media Support** - GIFs, images, and interactive content

## 🛠 Tech Stack

### Frontend
- **React Native** + **Expo** (SDK 51+)
- **TypeScript** for type safety
- **Expo Router** for navigation
- Custom UI components with theming system

### Backend
- **Supabase** (PostgreSQL + Edge Functions)
- **Row Level Security (RLS)** for data protection
- **Edge Functions** (Deno runtime) for server-side logic
- **Real-time subscriptions** for live updates

### Key Libraries
- `@supabase/supabase-js` - Database and auth
- `expo-image` - Optimized image handling
- `lucide-react-native` - Icons
- `react-native-reanimated` - Animations

## 📦 Setup Instructions

### Prerequisites
- Node.js 18+ and npm/yarn
- Expo CLI (`npm install -g @expo/cli`)
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/hungwahenry/cheevo.git
cd cheevo

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Configuration

Create a `.env` file with your Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_GIPHY_API_KEY=your_giphy_api_key
```

### Database Setup

1. Create a new Supabase project
2. Run the migration files in order from `/supabase/migrations/`
3. Deploy the edge functions from `/supabase/functions/`

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Link your project
supabase link --project-ref your-project-ref

# Push database changes
supabase db push

# Deploy edge functions
supabase functions deploy
```

### Running the App

```bash
# Start the development server
npm start

# Run on specific platforms
npm run ios
npm run android
npm run web
```

## 📱 Platform Support

- ✅ **iOS** - Full native iOS support
- ✅ **Android** - Full native Android support  
- ✅ **Web** - Responsive web support (Expo Web)
- ✅ **Expo Go** - Development with Expo Go
- ✅ **EAS Build** - Production builds with EAS

## 🏗️ Architecture Highlights

### Privacy-First Design
- **Database-level privacy enforcement** with PostgreSQL functions
- **Client-side privacy state management** prevents unauthorized interactions
- **Precomputed permissions** for optimal performance
- **Comprehensive blocking system** with mutual block detection

### Performance Optimizations
- **Optimistic UI updates** for instant user feedback
- **Edge function processing** for reduced client load
- **Image optimization** with Expo Image
- **Efficient pagination** and infinite scroll

### Security Features
- **Row Level Security (RLS)** on all database tables
- **JWT-based authentication** with university email verification
- **Input validation** and sanitization
- **Rate limiting** and abuse prevention

## 🔧 Key Components

- **Feed System** - Multiple algorithms with privacy filtering
- **Comment System** - Nested threading with optimistic updates
- **User Profiles** - Privacy-controlled profile management
- **University System** - Domain verification and campus scoping
- **Moderation Tools** - Reporting and content management
- **Analytics** - Post engagement and trending algorithms

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

Made with 💻 by [Henry Wong](https://github.com/hungwahenry)
