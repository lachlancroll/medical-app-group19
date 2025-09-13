import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAppointments } from "@/hooks/useAppointments";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { AppointmentForm, AppointmentWithDetails } from "@/types/db";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function AppointmentsScreen() {
  const colorScheme = useColorScheme();
  const { user, patientProfile } = useAuth();
  const {
    data: appointments,
    loading,
    error: appointmentsError,
    refresh,
    createAppointment,
  } = useAppointments(patientProfile?.user_id || "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAppointment, setNewAppointment] = useState<AppointmentForm>({
    doctor_id: "",
    starts_at: "",
    ends_at: "",
    notes: "",
  });

  const handleAddAppointment = async () => {
    if (!user?.id) {
      Alert.alert("Error", "Please sign in to create appointments");
      return;
    }

    try {
      await createAppointment(newAppointment, user.id);
      setShowAddModal(false);
      setNewAppointment({
        doctor_id: "",
        starts_at: "",
        ends_at: "",
        notes: "",
      });
      Alert.alert("Success", "Appointment created successfully");
    } catch {
      Alert.alert("Error", "Failed to create appointment");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "#007AFF";
      case "completed":
        return "#34C759";
      case "cancelled":
        return "#FF3B30";
      default:
        return "#8E8E93";
    }
  };

  const renderAppointment = ({ item }: { item: AppointmentWithDetails }) => (
    <ThemedView style={styles.appointmentCard}>
      <View style={styles.appointmentHeader}>
        <ThemedText type="subtitle" style={styles.doctorName}>
          {item.doctor?.full_name || "Unknown Doctor"}
        </ThemedText>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <ThemedText style={styles.appointmentTime}>
        {formatDate(item.starts_at)} - {formatDate(item.ends_at)}
      </ThemedText>
      {item.notes && (
        <ThemedText style={styles.appointmentNotes}>{item.notes}</ThemedText>
      )}
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading appointments...</ThemedText>
      </ThemedView>
    );
  }

  if (appointmentsError) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          Error: {appointmentsError}
        </ThemedText>
        <TouchableOpacity style={styles.retryButton} onPress={refresh}>
          <ThemedText style={styles.retryButtonText}>Retry</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Appointments
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: Colors[colorScheme ?? "light"].tint },
          ]}
          onPress={() => setShowAddModal(true)}
        >
          <IconSymbol name="plus" size={20} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={appointments}
        renderItem={renderAppointment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="calendar" size={48} color="#8E8E93" />
            <ThemedText style={styles.emptyText}>
              No appointments scheduled
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap the + button to schedule your first appointment
            </ThemedText>
          </ThemedView>
        }
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <ThemedText type="title">New Appointment</ThemedText>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <IconSymbol name="xmark" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Doctor ID</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newAppointment.doctor_id}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, doctor_id: text })
                }
                placeholder="Enter doctor ID"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Start Time</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newAppointment.starts_at}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, starts_at: text })
                }
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>End Time</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newAppointment.ends_at}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, ends_at: text })
                }
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                Notes (Optional)
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newAppointment.notes}
                onChangeText={(text) =>
                  setNewAppointment({ ...newAppointment, notes: text })
                }
                placeholder="Add any notes about the appointment"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddModal(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: Colors[colorScheme ?? "light"].tint },
              ]}
              onPress={handleAddAppointment}
            >
              <ThemedText style={styles.saveButtonText}>
                Create Appointment
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  listContainer: {
    paddingBottom: 100,
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
  doctorName: {
    fontSize: 18,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  appointmentTime: {
    fontSize: 14,
    color: "#8E8E93",
    marginBottom: 4,
  },
  appointmentNotes: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#8E8E93",
    textAlign: "center",
  },
  errorText: {
    color: "#FF3B30",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "center",
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
  },
  modalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5EA",
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  saveButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
