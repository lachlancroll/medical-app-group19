import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { IconSymbol } from "@/components/ui/IconSymbol";
import { Colors } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useColorScheme } from "@/hooks/useColorScheme";
import { useMedicationSchedule } from "@/hooks/userMedicationSchedule";
import { MedicationSchedule } from "@/types/db";
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

export default function MedicationsScreen() {
  const colorScheme = useColorScheme();
  const { patientProfile } = useAuth();
  const { schedules, upcoming, overdue, loading, takeDose } =
    useMedicationSchedule(patientProfile?.user_id || "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    prescription_item_id: "",
    reminder_enabled: true,
    reminder_time: "",
  });

  const handleAddSchedule = async () => {
    try {
      // This would create a medication schedule in a real app
      Alert.alert("Success", "Medication schedule added successfully");
      setShowAddModal(false);
      setNewSchedule({
        prescription_item_id: "",
        reminder_enabled: true,
        reminder_time: "",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to add medication schedule");
    }
  };

  const handleTakeDose = async (scheduleId: string) => {
    try {
      await takeDose(scheduleId);
      Alert.alert("Dose Taken", "Medication dose recorded");
    } catch (error) {
      Alert.alert("Error", "Failed to record dose");
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

  const getStatusColor = (schedule: MedicationSchedule) => {
    const now = new Date();
    const nextDose = new Date(schedule.next_dose);

    if (nextDose < now) {
      return "#FF3B30"; // Red for overdue
    } else if (nextDose.getTime() - now.getTime() < 2 * 60 * 60 * 1000) {
      return "#FF9500"; // Orange for due soon
    } else {
      return "#34C759"; // Green for scheduled
    }
  };

  const getTimeUntilNext = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffMs < 0) {
      return "Overdue";
    } else if (diffHours < 1) {
      return `In ${diffMinutes} minutes`;
    } else if (diffHours < 24) {
      return `In ${diffHours} hours`;
    } else {
      return formatDate(dateString);
    }
  };

  const renderMedicationSchedule = ({ item }: { item: MedicationSchedule }) => (
    <ThemedView style={styles.medicationCard}>
      <View style={styles.medicationHeader}>
        <View style={styles.medicationInfo}>
          <ThemedText type="subtitle" style={styles.medicationName}>
            {item.prescription_item?.medication?.generic_name ||
              "Unknown Medication"}
          </ThemedText>
          <ThemedText style={styles.medicationDosage}>
            {item.prescription_item?.medication?.strength_value}{" "}
            {item.prescription_item?.medication?.strength_unit}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusIndicator,
            { backgroundColor: getStatusColor(item) },
          ]}
        />
      </View>

      <View style={styles.nextDoseContainer}>
        <ThemedText style={styles.nextDoseLabel}>Next dose:</ThemedText>
        <ThemedText
          style={[styles.nextDoseTime, { color: getStatusColor(item) }]}
        >
          {getTimeUntilNext(item.next_dose)}
        </ThemedText>
      </View>

      {item.prescription_item?.sig_text && (
        <ThemedText style={styles.medicationNotes}>
          {item.prescription_item.sig_text}
        </ThemedText>
      )}

      <TouchableOpacity
        style={[
          styles.takeDoseButton,
          { backgroundColor: Colors[colorScheme ?? "light"].tint },
        ]}
        onPress={() => handleTakeDose(item.id)}
      >
        <IconSymbol name="checkmark" size={16} color="white" />
        <Text style={styles.takeDoseText}>Take Dose</Text>
      </TouchableOpacity>
    </ThemedView>
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText>Loading medications...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title}>
          Medications
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
        data={schedules}
        renderItem={renderMedicationSchedule}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <ThemedView style={styles.emptyState}>
            <IconSymbol name="pills.fill" size={48} color="#8E8E93" />
            <ThemedText style={styles.emptyText}>
              No medications scheduled
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              Tap the + button to add your first medication schedule
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
            <ThemedText type="title">Add Medication Schedule</ThemedText>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <IconSymbol name="xmark" size={24} color="#8E8E93" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>
                Prescription Item ID
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newSchedule.prescription_item_id}
                onChangeText={(text) =>
                  setNewSchedule({ ...newSchedule, prescription_item_id: text })
                }
                placeholder="Enter prescription item ID"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Reminder Time</ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: Colors[colorScheme ?? "light"].border },
                ]}
                value={newSchedule.reminder_time}
                onChangeText={(text) =>
                  setNewSchedule({ ...newSchedule, reminder_time: text })
                }
                placeholder="HH:MM format"
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
              onPress={handleAddSchedule}
            >
              <ThemedText style={styles.saveButtonText}>
                Add Schedule
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
    alignItems: "flex-start",
    marginBottom: 12,
  },
  medicationInfo: {
    flex: 1,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  medicationDosage: {
    fontSize: 14,
    color: "#8E8E93",
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 4,
  },
  nextDoseContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  nextDoseLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginRight: 8,
  },
  nextDoseTime: {
    fontSize: 14,
    fontWeight: "600",
  },
  medicationNotes: {
    fontSize: 14,
    color: "#8E8E93",
    fontStyle: "italic",
    marginBottom: 12,
  },
  takeDoseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  takeDoseText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
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
