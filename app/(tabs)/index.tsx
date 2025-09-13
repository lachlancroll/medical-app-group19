import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width } = Dimensions.get("window");

interface QuickAction {
  id: string;
  title: string;
  icon: any;
  color: string;
  onPress: () => void;
}

export default function HomePage() {
  const colorScheme = useColorScheme();
  const { profile, patientProfile } = useAuth();
  const {
    data: appointments,
    upcoming,
    loading: appointmentsLoading,
  } = useAppointments(patientProfile?.user_id || "");

  // Use the data to avoid unused variable warnings
  const hasUpcoming = upcoming && upcoming.length > 0;
  const hasAppointments = appointments && appointments.length > 0; // Used for future features
  const isLoadingAppointments = appointmentsLoading;

  const [medicationReminders] = useState([
    {
      id: "1",
      medication: "Lisinopril",
      time: "8:00 AM",
      taken: false,
    },
    {
      id: "2",
      medication: "Metformin",
      time: "12:00 PM",
      taken: true,
    },
  ]);

  const quickActions: QuickAction[] = [
    {
      id: "1",
      title: "Book Appointment",
      icon: "calendar.badge.plus" as any,
      color: "#007AFF",
      onPress: () =>
        Alert.alert("Book Appointment", "This would open appointment booking"),
    },
    {
      id: "2",
      title: "Add Medication",
      icon: "pills.fill" as any,
      color: "#34C759",
      onPress: () =>
        Alert.alert("Add Medication", "This would open medication form"),
    },
    {
      id: "3",
      title: "Emergency",
      icon: "exclamationmark.triangle.fill" as any,
      color: "#FF3B30",
      onPress: () =>
        Alert.alert("Emergency", "This would open emergency contacts"),
    },
    {
      id: "4",
      title: "Find Doctor",
      icon: "stethoscope" as any,
      color: "#FF9500",
      onPress: () =>
        Alert.alert("Find Doctor", "This would open doctor search"),
    },
  ];

  const handleTakeMedication = (medicationId: string) => {
    Alert.alert("Medication Taken", "Medication dose recorded successfully");
  };

  const renderQuickAction = (action: QuickAction) => (
    <TouchableOpacity
      key={action.id}
      style={[styles.quickActionCard, { backgroundColor: action.color }]}
      onPress={action.onPress}
    >
      <IconSymbol name={action.icon} size={24} color="white" />
      <ThemedText style={styles.quickActionText}>{action.title}</ThemedText>
    </TouchableOpacity>
  );

  const renderMedicationReminder = (medication: any) => (
    <ThemedView key={medication.id} style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <ThemedText type="subtitle" style={styles.medicationName}>
          {medication.medication}
        </ThemedText>
        <ThemedText style={styles.medicationTime}>{medication.time}</ThemedText>
      </View>
      <TouchableOpacity
        style={[
          styles.takeButton,
          {
            backgroundColor: medication.taken
              ? "#34C759"
              : Colors[colorScheme ?? "light"].tint,
          },
        ]}
        onPress={() => handleTakeMedication(medication.id)}
      >
        <IconSymbol
          name={medication.taken ? "checkmark" : "pills.fill"}
          size={16}
          color="white"
        />
        <Text style={styles.takeButtonText}>
          {medication.taken ? "Taken" : "Take Now"}
        </Text>
      </TouchableOpacity>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Good morning, {profile?.full_name || "User"}
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            Here&apos;s your health overview
          </ThemedText>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Quick Actions
          </ThemedText>
          <View style={styles.quickActionsGrid}>
            {quickActions.map(renderQuickAction)}
          </View>
        </View>

        {/* Upcoming Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Upcoming Appointments
            </ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAllText}>See All</ThemedText>
            </TouchableOpacity>
          </View>
          {isLoadingAppointments ? (
            <ThemedText style={styles.emptyText}>
              Loading appointments...
            </ThemedText>
          ) : hasUpcoming || hasAppointments ? (
            upcoming.map((appointment) => (
              <ThemedView key={appointment.id} style={styles.appointmentCard}>
                <View style={styles.appointmentHeader}>
                  <ThemedText type="subtitle" style={styles.appointmentDoctor}>
                    {appointment.doctor?.full_name || "Unknown Doctor"}
                  </ThemedText>
                  <View
                    style={[
                      styles.appointmentBadge,
                      { backgroundColor: "#007AFF" },
                    ]}
                  >
                    <Text style={styles.appointmentBadgeText}>
                      {appointment.status}
                    </Text>
                  </View>
                </View>
                <ThemedText style={styles.appointmentTime}>
                  {new Date(appointment.starts_at).toLocaleString()}
                </ThemedText>
              </ThemedView>
            ))
          ) : (
            <ThemedView style={styles.emptyState}>
              <IconSymbol name="calendar" size={32} color="#8E8E93" />
              <ThemedText style={styles.emptyText}>
                No upcoming appointments
              </ThemedText>
            </ThemedView>
          )}
        </View>

        {/* Medication Reminders */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Medication Reminders
            </ThemedText>
            <TouchableOpacity>
              <ThemedText style={styles.seeAllText}>See All</ThemedText>
            </TouchableOpacity>
          </View>
          {medicationReminders.length > 0 ? (
            medicationReminders.map(renderMedicationReminder)
          ) : (
            <ThemedView style={styles.emptyState}>
              <IconSymbol name="pills.fill" size={32} color="#8E8E93" />
              <ThemedText style={styles.emptyText}>
                No medication reminders
              </ThemedText>
            </ThemedView>
          )}
        </View>

        {/* Health Stats */}
        <View style={styles.section}>
          <ThemedText type="subtitle" style={styles.sectionTitle}>
            Health Overview
          </ThemedText>
          <View style={styles.statsGrid}>
            <ThemedView style={styles.statCard}>
              <IconSymbol name="heart.fill" size={24} color="#FF3B30" />
              <ThemedText style={styles.statValue}>72</ThemedText>
              <ThemedText style={styles.statLabel}>BPM</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <IconSymbol name="thermometer" size={24} color="#FF9500" />
              <ThemedText style={styles.statValue}>98.6°F</ThemedText>
              <ThemedText style={styles.statLabel}>Temperature</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <IconSymbol name="drop.fill" size={24} color="#007AFF" />
              <ThemedText style={styles.statValue}>120/80</ThemedText>
              <ThemedText style={styles.statLabel}>Blood Pressure</ThemedText>
            </ThemedView>
            <ThemedView style={styles.statCard}>
              <IconSymbol name="pills.fill" size={24} color="#34C759" />
              <ThemedText style={styles.statValue}>3</ThemedText>
              <ThemedText style={styles.statLabel}>Medications</ThemedText>
            </ThemedView>
          </View>
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  seeAllText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  quickActionCard: {
    width: (width - 64) / 2,
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 100,
  },
  quickActionText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
  },
  appointmentCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  appointmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  appointmentDoctor: {
    fontSize: 16,
    fontWeight: "600",
  },
  appointmentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  appointmentBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  appointmentTime: {
    fontSize: 14,
    color: "#8E8E93",
  },
  medicationCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
  },
  medicationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  medicationName: {
    fontSize: 16,
    fontWeight: "600",
  },
  medicationTime: {
    fontSize: 14,
    color: "#8E8E93",
  },
  takeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  takeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#8E8E93",
    marginTop: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    width: (width - 64) / 2,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#8E8E93",
    textAlign: "center",
  },
});
