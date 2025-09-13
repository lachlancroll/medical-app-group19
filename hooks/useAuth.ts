import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCurrentUser, getUserProfile, getPatientProfile, getDoctorProfile, getUserRole } from '@/services/auth';
import { User, Profile, PatientProfile, DoctorProfile } from '@/types/db';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patientProfile, setPatientProfile] = useState<PatientProfile | null>(null);
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUserData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if user is authenticated
      const isAuthed = await AsyncStorage.getItem('authed');
      if (!isAuthed) {
        setLoading(false);
        return;
      }

      // Get current user from Supabase
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        await AsyncStorage.removeItem('authed');
        await AsyncStorage.removeItem('userId');
        setLoading(false);
        return;
      }

      setUser(currentUser);

      // Get user role
      const userRole = await getUserRole(currentUser.id);
      setRole(userRole);

      // Get profile data
      const [profileData, patientData, doctorData] = await Promise.all([
        getUserProfile(currentUser.id),
        getPatientProfile(currentUser.id).catch(() => null),
        getDoctorProfile(currentUser.id).catch(() => null),
      ]);

      setProfile(profileData);
      setPatientProfile(patientData);
      setDoctorProfile(doctorData);

    } catch (err: any) {
      setError(err.message);
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('authed');
      await AsyncStorage.removeItem('userId');
      setUser(null);
      setProfile(null);
      setPatientProfile(null);
      setDoctorProfile(null);
      setRole(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const refresh = () => {
    loadUserData();
  };

  useEffect(() => {
    loadUserData();
  }, []);

  return {
    user,
    profile,
    patientProfile,
    doctorProfile,
    role,
    loading,
    error,
    signOut,
    refresh,
  };
}
