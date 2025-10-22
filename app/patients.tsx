// app/patients/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    Pressable,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { supabase } from "../supabaseClient";

/* ---------- small helpers ---------- */
async function ensurePatientProfile(uid: string) {
  const { error } = await supabase
    .from("patient_profiles")
    .upsert({ user_id: uid }, { onConflict: "user_id" });
  if (error) throw error;
}

async function checkDoctorLinkedToPatient(doctorId: string, patientId: string) {
  const { count, error } = await supabase
    .from("doctor_patient")
    .select("id", { count: "exact", head: true })
    .eq("doctor_id", doctorId)
    .eq("patient_id", patientId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

/* ---- NEW: scheduling helpers (same behavior as medications.tsx) ---- */
function clampRangeMonths(n: number) {
  if (!Number.isFinite(n)) return 1;
  return Math.max(1, Math.min(12, Math.floor(n)));
}
function toISODate(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
/** Returns { startISO, endISO } where end <= start + 1 year and also <= start + rangeMonths */
function computeDateRange(startISO: string, rangeMonths: number) {
  const start = new Date(startISO + "T00:00:00");
  if (isNaN(start.getTime())) throw new Error("Invalid start date");
  const endByMonths = new Date(start);
  endByMonths.setMonth(endByMonths.getMonth() + clampRangeMonths(rangeMonths));
  const endByYear = new Date(start);
  endByYear.setFullYear(endByYear.getFullYear() + 1);
  const end = endByMonths < endByYear ? endByMonths : endByYear;
  return { startISO: toISODate(start), endISO: toISODate(end) };
}
/** Make a human tag to append to SIG (info only) */
function recurrenceLabel(every: number, unit: "day" | "week", untilISO: string) {
  const u = unit === "day" ? (every === 1 ? "day" : "days") : every === 1 ? "week" : "weeks";
  return `Repeat: every ${every} ${u} until ${untilISO}`;
}

type MedOption = { id: string; label: string; sublabel?: string };

export default function PatientsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  // ----- prescribe modal state -----
  const [rxOpen, setRxOpen] = useState(false);
  const [targetPatient, setTargetPatient] = useState<{ user_id: string; full_name?: string; email?: string } | null>(null);
  const [medSearch, setMedSearch] = useState("");
  const [medLoading, setMedLoading] = useState(false);
  const [medOptions, setMedOptions] = useState<MedOption[]>([]);
  const [selectedMed, setSelectedMed] = useState<MedOption | null>(null);
  const [sig, setSig] = useState("");
  // NEW scheduling UI state
  const [startDate, setStartDate] = useState<string>(() => toISODate(new Date()));
  const [repeatUnit, setRepeatUnit] = useState<"day" | "week">("week"); // "day" or "week"
  const [repeatEvery, setRepeatEvery] = useState<number>(1); // every X
  const [rangeMonths, setRangeMonths] = useState<number>(3); // 1..12

  // Fetch current patients
  const fetchPatients = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const doctorId = user.id;

      // Fetch existing patients
      const { data: links, error: linkErr } = await supabase
        .from("doctor_patient")
        .select("patient_id")
        .eq("doctor_id", doctorId);
      if (linkErr) throw linkErr;

      const ids = (links || []).map((r) => r.patient_id);

      // Profiles for linked patients
      const { data: profs, error: profErr } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone")
        .in("user_id", ids);
      if (profErr) throw profErr;

      setPatients(profs || []);

      // Pending requests
      const { data: reqs } = await supabase
        .from("patient_link_requests")
        .select("patient_id, status")
        .eq("doctor_id", doctorId)
        .eq("status", "pending");

      setPendingRequests(reqs || []);
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  // Search through all non-doctor patients
  const handleSearch = async (q: string) => {
    setSearch(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("is_doctor", false)
      .ilike("full_name", `%${q}%`)
      .limit(20);
    if (!error) setSearchResults(data || []);
    setSearching(false);
  };

  // Send a connection request
  const handleSendRequest = async (patientId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const doctorId = user.id;

    const { error } = await supabase.from("patient_link_requests").insert({
      doctor_id: doctorId,
      patient_id: patientId,
      status: "pending",
    });

    if (error) Alert.alert("Error", error.message);
    else {
      Alert.alert("Request Sent", "The patient has been notified of your request.");
      setAddOpen(false);
      fetchPatients();
    }
  };

  const isPending = (patientId: string) =>
    pendingRequests.some((r) => r.patient_id === patientId);

  /* ---------- prescribe flow ---------- */
  const openPrescribe = (p: { user_id: string; full_name?: string; email?: string }) => {
    setTargetPatient(p);
    setSelectedMed(null);
    setSig("");
    setMedSearch("");
    // reset scheduling defaults
    setStartDate(toISODate(new Date()));
    setRepeatUnit("week");
    setRepeatEvery(1);
    setRangeMonths(3);
    setRxOpen(true);
    // initial meds fetch
    fetchMedOptions("");
  };

  const fetchMedOptions = async (q: string) => {
    setMedLoading(true);
    try {
      const orFilter = q?.trim()
        ? `generic_name.ilike.%${q.trim()}%,brand_name.ilike.%${q.trim()}%`
        : undefined;

      let query = supabase
        .from("medications")
        .select("id, generic_name, brand_name, form, strength_value, strength_unit, atc_code")
        .order("generic_name", { ascending: true })
        .limit(50);

      if (orFilter) query = query.or(orFilter);

      const { data, error } = await query;
      if (error) throw error;

      const opts: MedOption[] = (data ?? []).map((m: any) => {
        const main =
          (m.brand_name ? `${m.brand_name} (${m.generic_name})` : m.generic_name) ?? "Medication";

        const dose = [m.strength_value, m.strength_unit].filter(Boolean).join(" ");
        const form = m.form ? ` ${m.form}` : "";
        const label = [main, dose || "", form].join("").trim();

        return { id: m.id, label: label || main, sublabel: m.atc_code ? `ATC: ${m.atc_code}` : undefined };
      });
      setMedOptions(opts);
    } catch (e) {
      console.error("fetch meds failed:", e);
      setMedOptions([]);
    } finally {
      setMedLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (rxOpen) fetchMedOptions(medSearch);
    }, 200);
    return () => clearTimeout(t);
  }, [medSearch, rxOpen]);

  const savePrescription = async () => {
    try {
      if (!targetPatient) return;
      if (!selectedMed?.id) {
        Alert.alert("Select medication", "Please choose a medication.");
        return;
      }
      if (!sig.trim()) {
        Alert.alert("Missing SIG", "Please enter directions for use.");
        return;
      }

      // validate date + range
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
        Alert.alert("Invalid start date", "Please use format YYYY-MM-DD.");
        return;
      }
      const { startISO, endISO } = computeDateRange(startDate.trim(), rangeMonths);
      const every = Math.max(1, Math.floor(repeatEvery));
      const unit: "day" | "week" = repeatUnit;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const doctorId = user.id;
      const patientId = targetPatient.user_id;

      // Guard: ensure link exists
      const linked = await checkDoctorLinkedToPatient(doctorId, patientId);
      if (!linked) {
        Alert.alert("Not linked", "You can only prescribe to patients you’re linked with.");
        return;
      }

      // Ensure patient_profiles row exists for FK
      await ensurePatientProfile(patientId);

      // Create prescription (created_by must exist in doctor_profiles)
      const { data: rx, error: rxErr } = await supabase
        .from("prescriptions")
        .insert([
          {
            patient_id: patientId,
            created_by: doctorId,
            start_date: startISO,
            end_date: endISO,
            // Optionally: notes: recurrenceLabel(every, unit, endISO),
          },
        ])
        .select("id")
        .single();

      if (rxErr) throw rxErr;

      // Add item — append recurrence tag to SIG (informational)
      const sigWithRecurrence = `${sig.trim()} (${recurrenceLabel(every, unit, endISO)})`;

      const { error: itemErr } = await supabase.from("prescription_items").insert([
        {
          prescription_id: rx.id,
          medication_id: selectedMed.id,
          sig_text: sigWithRecurrence,
        },
      ]);
      if (itemErr) throw itemErr;

      Alert.alert("Success", "Prescription created.");
      setRxOpen(false);
    } catch (e: any) {
      console.error("savePrescription failed:", e);
      Alert.alert("Error", e?.message ?? "Could not create prescription.");
    }
  };

  return (
    <LinearGradient colors={["#0ea5e9", "#6366f1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.title}>Patients</Text>
        </View>

        <View style={styles.card}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator />
              <Text style={styles.subtle}>Loading patients…</Text>
            </View>
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : patients.length === 0 ? (
            <Text style={styles.subtle}>No confirmed patients yet.</Text>
          ) : (
            <FlatList
              data={patients.sort((a, b) =>
                (a.full_name || "").localeCompare(b.full_name || "", undefined, { sensitivity: "base" })
              )}
              keyExtractor={(item) => item.user_id}
              renderItem={({ item }) => (
                <View style={styles.patientRow}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>
                      {(item.full_name?.[0] || item.email?.[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.full_name || "Unnamed Patient"}</Text>
                    {!!item.email && <Text style={styles.meta}>{item.email}</Text>}
                  </View>
                  <TouchableOpacity
                    style={styles.prescribeBtn}
                    onPress={() => openPrescribe(item)}
                    accessibilityLabel="Prescribe medication"
                  >
                    <Ionicons name="medical" size={18} color="#fff" />
                    <Text style={styles.prescribeText}>Prescribe</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          )}

          {pendingRequests.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <Text style={styles.pendingTitle}>Pending Requests</Text>
              {pendingRequests.map((r, i) => (
                <Text key={i} style={styles.subtle}>• Request sent to patient ({r.patient_id.slice(0, 6)}...)</Text>
              ))}
            </View>
          )}
        </View>

        {/* Add button (send request) */}
        <TouchableOpacity style={styles.fab} onPress={() => setAddOpen(true)}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>

        {/* Add Patient Modal */}
        <Modal visible={addOpen} animationType="slide" onRequestClose={() => setAddOpen(false)}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setAddOpen(false)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#0f172a" />
              </Pressable>
              <Text style={styles.modalTitle}>Send Request</Text>
            </View>

            <TextInput
              placeholder="Search patients..."
              placeholderTextColor="#9ca3af"
              style={styles.searchBox}
              value={search}
              onChangeText={handleSearch}
            />

            {searching ? (
              <ActivityIndicator style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.resultRow}
                    onPress={() => {
                      if (isPending(item.user_id))
                        Alert.alert("Already pending", "You already sent a request to this patient.");
                      else handleSendRequest(item.user_id);
                    }}
                  >
                    <Text style={styles.resultName}>{item.full_name || "Unnamed Patient"}</Text>
                    <Text style={styles.resultEmail}>{item.email}</Text>
                  </Pressable>
                )}
              />
            )}
          </SafeAreaView>
        </Modal>

        {/* Prescribe Modal (with repeats + range) */}
        <Modal visible={rxOpen} animationType="slide" onRequestClose={() => setRxOpen(false)}>
          <SafeAreaView style={[styles.modalContainer, { backgroundColor: "#fff" }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setRxOpen(false)} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#0f172a" />
              </Pressable>
              <Text style={styles.modalTitle}>
                Prescribe {targetPatient?.full_name ? `to ${targetPatient.full_name}` : ""}
              </Text>
            </View>

            {/* Medication picker (simple search list) */}
            <Text style={styles.inputLabel}>Medication</Text>
            <TextInput
              placeholder="Search by brand/generic..."
              placeholderTextColor="#9ca3af"
              style={styles.searchBox}
              value={medSearch}
              onChangeText={setMedSearch}
            />
            <View style={{ maxHeight: 220, borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10 }}>
              {medLoading ? (
                <View style={{ alignItems: "center", justifyContent: "center", height: 180 }}>
                  <ActivityIndicator />
                </View>
              ) : (
                <FlatList
                  data={medOptions}
                  keyExtractor={(o) => o.id}
                  ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: "#F3F4F6" }} />}
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setSelectedMed(item)}
                      style={[styles.medRow, selectedMed?.id === item.id && { backgroundColor: "#EFF6FF" }]}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.medTitle}>{item.label}</Text>
                        {!!item.sublabel && <Text style={styles.medSub}>{item.sublabel}</Text>}
                      </View>
                      {selectedMed?.id === item.id && (
                        <Ionicons name="checkmark-circle" size={20} color="#2563EB" />
                      )}
                    </Pressable>
                  )}
                  ListEmptyComponent={
                    <View style={{ padding: 14 }}>
                      <Text style={{ color: "#6B7280" }}>No results.</Text>
                    </View>
                  }
                />
              )}
            </View>

            {/* SIG */}
            <Text style={styles.inputLabel}>SIG / Directions</Text>
            <TextInput
              placeholder="e.g., 1 tablet by mouth twice daily"
              placeholderTextColor="#9ca3af"
              style={[styles.input, { minHeight: 80 }]}
              multiline
              value={sig}
              onChangeText={setSig}
            />

            {/* Scheduling controls */}
            <Text style={styles.inputLabel}>Start date (YYYY-MM-DD)</Text>
            <TextInput
              placeholder="2025-01-01"
              placeholderTextColor="#9ca3af"
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              autoCapitalize="none"
            />

            <Text style={styles.inputLabel}>Repeat</Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <TextInput
                  value={String(repeatEvery)}
                  onChangeText={(t) => {
                    const n = parseInt(t || "1", 10);
                    setRepeatEvery(isNaN(n) || n < 1 ? 1 : n);
                  }}
                  keyboardType="number-pad"
                  style={styles.input}
                  placeholder="Every"
                />
              </View>
              <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() => setRepeatUnit("day")}
                  style={[styles.chip, repeatUnit === "day" && styles.chipActive]}
                >
                  <Text style={repeatUnit === "day" ? styles.chipTextActive : styles.chipText}>Day(s)</Text>
                </Pressable>
                <Pressable
                  onPress={() => setRepeatUnit("week")}
                  style={[styles.chip, repeatUnit === "week" && styles.chipActive]}
                >
                  <Text style={repeatUnit === "week" ? styles.chipTextActive : styles.chipText}>Week(s)</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.inputLabel}>Valid for (months, max 12)</Text>
            <TextInput
              value={String(rangeMonths)}
              onChangeText={(t) => {
                const n = parseInt(t || "1", 10);
                setRangeMonths(clampRangeMonths(n));
              }}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="e.g., 3"
            />
            <Text style={{ color: "#6B7280", marginBottom: 6 }}>
              End date will be capped to at most one year from the start date.
            </Text>

            <View style={styles.modalActions}>
              <Pressable style={[styles.actionBtn, styles.cancelBtn]} onPress={() => setRxOpen(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.saveBtn]} onPress={savePrescription}>
                <Text style={styles.saveText}>Save</Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  backBtn: { padding: 4, marginRight: 8 },
  title: { fontSize: 24, fontWeight: "800", color: "#fff" },
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  subtle: { color: "#64748B", textAlign: "center" },
  error: { color: "#ef4444", fontWeight: "700", textAlign: "center" },
  patientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  avatarText: { fontSize: 16, fontWeight: "800", color: "#334155" },
  name: { fontWeight: "800", fontSize: 16, color: "#0f172a" },
  meta: { color: "#64748B", fontSize: 13 },
  prescribeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  prescribeText: { color: "#fff", fontWeight: "800" },
  fab: {
    position: "absolute",
    bottom: 28,
    right: 24,
    backgroundColor: "#2563eb",
    borderRadius: 30,
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
  },

  // Modal (Add Patient)
  modalContainer: { flex: 1, padding: 20, backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 22, fontWeight: "800", color: "#0f172a" },
  searchBox: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  resultRow: { paddingVertical: 12, borderBottomWidth: 1, borderColor: "#F1F5F9" },
  resultName: { fontWeight: "700", fontSize: 16, color: "#0f172a" },
  resultEmail: { fontSize: 13, color: "#64748B" },
  pendingTitle: {
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 10,
    textAlign: "center",
  },

  // Prescribe modal bits
  inputLabel: { fontWeight: "700", marginTop: 12, marginBottom: 6, color: "#0f172a" },
  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    fontSize: 16,
    color: "#0f172a",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  medRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 10 },
  medTitle: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  medSub: { fontSize: 12, color: "#6B7280" },

  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 14 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  cancelBtn: { backgroundColor: "#E2E8F0" },
  saveBtn: { backgroundColor: "#0EA5E9" },
  cancelText: { color: "#0F172A", fontWeight: "700" },
  saveText: { color: "#fff", fontWeight: "700" },

  // Chips for repeat unit
  chip: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E5F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  chipActive: {
    backgroundColor: "#0EA5E9",
    borderColor: "#0EA5E9",
  },
  chipText: { fontSize: 16, fontWeight: "600", color: "#111827" },
  chipTextActive: { fontSize: 16, fontWeight: "700", color: "white" },
});
