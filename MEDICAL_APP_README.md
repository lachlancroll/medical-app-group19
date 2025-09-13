# Medical App - Group 19

A comprehensive medical application built with React Native and Expo that helps users manage their health appointments, medications, prescriptions, and emergency contacts.

## Features

### 🏠 Home Dashboard

- Personalized health overview
- Quick action buttons for common tasks
- Upcoming appointments display
- Medication reminders
- Health statistics overview

### 📅 Appointments

- View all scheduled appointments
- Create new appointments
- Edit appointment details
- Status tracking (scheduled, completed, cancelled)
- Doctor information display

### 💊 Medications

- Medication schedule management
- Dose tracking and reminders
- Add/edit/delete medications
- Next dose calculations
- Medication adherence tracking

### 📋 Prescriptions

- Prescription history management
- Refill tracking
- Expiry date monitoring
- Doctor and pharmacy information
- Prescription status tracking

### 🚨 Emergency

- Quick emergency contact access
- One-tap calling and messaging
- AI medical assistant integration
- GP recommendation system
- Quick health actions

### 👤 Profile

- Personal information management
- Medical history tracking
- Insurance information
- Notification preferences
- App settings

## Technical Stack

- **Framework**: React Native with Expo
- **Navigation**: Expo Router
- **Database**: Supabase
- **State Management**: React Hooks
- **UI Components**: Custom themed components
- **Icons**: Expo Symbols
- **Styling**: StyleSheet with theme support

## Project Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Home dashboard
│   ├── appointments.tsx   # Appointments management
│   ├── medications.tsx    # Medication tracking
│   ├── prescriptions.tsx  # Prescription management
│   ├── emergency.tsx      # Emergency contacts & AI
│   └── profile.tsx        # User profile & settings
├── signin.tsx             # Authentication
└── _layout.tsx            # Root layout

components/
├── ThemedText.tsx         # Themed text component
├── ThemedView.tsx         # Themed view component
└── ui/                    # UI components

hooks/
├── useAppointments.ts     # Appointments hook
├── usePrescrtiptions.ts   # Prescriptions hook
└── userMedicationSchedule.ts # Medication schedule hook

services/
├── appointments.ts        # Appointment API calls
├── medications.ts         # Medication API calls
├── prescriptions.ts       # Prescription API calls
├── profiles.ts           # Profile API calls
└── recommendations.ts     # GP recommendations

types/
└── db.ts                 # TypeScript type definitions
```

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo CLI
- Supabase account

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd medical-app-group19
```

2. Install dependencies

```bash
npm install
```

3. Set up environment variables
   Create a `.env` file in the root directory:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server

```bash
npx expo start
```

### Database Setup

The app uses Supabase for backend services. You'll need to set up the following tables:

- `users` - User profiles and medical information
- `doctors` - Doctor information and availability
- `appointments` - Appointment scheduling
- `medications` - Medication tracking
- `prescriptions` - Prescription management
- `emergency_contacts` - Emergency contact information
- `health_records` - Health data and records
- `notifications` - Push notifications

## Key Features Implementation

### Authentication

- Simple email/password authentication
- Session management with AsyncStorage
- Automatic login state persistence

### Medication Management

- Smart dose scheduling based on frequency
- Visual indicators for overdue/upcoming doses
- Medication adherence tracking
- Integration with prescription data

### Appointment System

- Real-time appointment status updates
- Doctor availability integration
- Appointment history tracking
- Notes and type categorization

### Emergency Features

- Quick access to emergency contacts
- One-tap calling and messaging
- AI-powered medical assistance
- GP recommendation system with location-based search

### Profile Management

- Comprehensive medical history
- Insurance information tracking
- Notification preferences
- Data export capabilities

## Customization

### Theming

The app supports light and dark themes. Colors are defined in `constants/Colors.ts` and can be easily customized.

### Adding New Features

1. Create new screens in the `app/(tabs)/` directory
2. Add corresponding hooks in the `hooks/` directory
3. Implement API calls in the `services/` directory
4. Update types in `types/db.ts`
5. Add navigation in `app/(tabs)/_layout.tsx`

## Testing

The app includes mock data for testing purposes. To test with real data:

1. Set up your Supabase database
2. Configure the environment variables
3. Update the service functions to use real API calls
4. Test the authentication flow

## Future Enhancements

- Push notifications for medication reminders
- Health data visualization and charts
- Integration with wearable devices
- Telemedicine features
- Prescription refill automation
- Health goal tracking
- Family member management
- Medical document storage

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
