// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }

  if (!user) {
    router.replace("/signin");
    return null;
  }

  const isDoctor = user?.user_metadata?.isDoctor;
  return isDoctor ? (
    <DoctorHome user={user} router={router} />
  ) : (
    <PatientHome router={router} />
  );
}

/* -------------------------------------------------------------------------- */
/*  PATIENT HOME                                                              */
/* -------------------------------------------------------------------------- */
function PatientHome({ router }: { user?: any; router: any }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [loadingReqs, setLoadingReqs] = useState(true);

  // Rx + appointment state (for current month)
  const [rxDates, setRxDates] = useState<string[]>([]);
  const [rxByDate, setRxByDate] = useState<Record<string, string[]>>({});
  const [apptDates, setApptDates] = useState<string[]>([]);
  const [apptByDate, setApptByDate] = useState<Record<string, string[]>>({});

  // Day details modal
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);

  // Helpers
  const toISO = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const parseRepeatFromSig = (sigText: string | null) => {
    if (!sigText) return null;
    const m = sigText.match(
      /Repeat:\s*every\s+(\d+)\s+(day|days|week|weeks)\s+until\s+(\d{4}-\d{2}-\d{2})/i
    );
    if (!m) return null;
    const every = Math.max(1, parseInt(m[1], 10) || 1);
    const unit = m[2].toLowerCase().startsWith("week") ? "week" : "day";
    const untilISO = m[3];
    return { every, unit: unit as "day" | "week", untilISO };
  };
  const expandOccurrencesForMonth = (
    startISO: string | null,
    endISO: string | null,
    repeat:
      | {
          every: number;
          unit: "day" | "week";
          untilISO: string;
        }
      | null,
    month: number,
    year: number
  ): string[] => {
    if (!startISO || !endISO) return [];
    const start = new Date(`${startISO}T00:00:00`);
    const hardEnd = new Date(`${endISO}T23:59:59`);
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59);

    if (!repeat) {
      if (start >= monthStart && start <= monthEnd) return [toISO(start)];
      return [];
    }

    const stepDays = repeat.unit === "day" ? repeat.every : repeat.every * 7;
    const repeatEnd = new Date(`${repeat.untilISO}T23:59:59`);
    const end = hardEnd < repeatEnd ? hardEnd : repeatEnd;

    let cursor = new Date(start);
    while (cursor < monthStart) {
      cursor = addDays(cursor, stepDays);
      if (cursor > end) break;
    }

    const out: string[] = [];
    while (cursor <= end && cursor <= monthEnd) {
      if (cursor >= monthStart) out.push(toISO(cursor));
      cursor = addDays(cursor, stepDays);
    }
    return out;
  };

  // Load requests + build calendar data (current month)
  useEffect(() => {
    (async () => {
      try {
        setLoadingReqs(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // ----- Requests -----
        const { data: reqs, error } = await supabase
          .from("patient_link_requests")
          .select("*")
          .eq("patient_id", user.id)
          .eq("status", "pending");
        if (error) throw error;

        if (!reqs?.length) {
          setRequests([]);
          setShowModal(false);
        } else {
          const doctorIds = Array.from(new Set(reqs.map((r) => r.doctor_id)));
          const { data: doctors, error: docErr } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", doctorIds);
          if (docErr) throw docErr;

          const byId = new Map((doctors || []).map((d) => [d.user_id, d]));
          const merged = (reqs || []).map((r) => {
            const d = byId.get(r.doctor_id);
            return {
              ...r,
              doctorName: d?.full_name || d?.email || r.doctor_id,
              doctorEmail: d?.email || null,
            };
          });

          setRequests(merged);
          setShowModal(true);
        }

        // ----- Calendar data for current month -----
        const now = new Date();
        const month = now.getMonth();
        const year = now.getFullYear();
        const monthStartISO = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const monthEndISO = `${year}-${String(month + 1).padStart(2, "0")}-${String(
          new Date(year, month + 1, 0).getDate()
        ).padStart(2, "0")}`;

        // Prescriptions (with items)
        const { data: rxData, error: rxErr } = await supabase
          .from("prescriptions")
          .select(
            `
            id, start_date, end_date,
            items:prescription_items ( id, sig_text )
          `
          )
          .eq("patient_id", user.id);
        if (rxErr) throw rxErr;

        const rxDatesSet = new Set<string>();
        const rxMap: Record<string, string[]> = {};

        (rxData || []).forEach((p: any) => {
          const sISO: string | null = p.start_date ?? null;
          const eISO: string | null = p.end_date ?? null;
          (p.items || []).forEach((it: any) => {
            const rep = parseRepeatFromSig(it.sig_text ?? null);
            const dates = expandOccurrencesForMonth(sISO, eISO, rep, month, year);
            dates.forEach((d) => {
              rxDatesSet.add(d);
              if (!rxMap[d]) rxMap[d] = [];
              rxMap[d].push(it.sig_text || "Prescription");
            });
          });
        });

        setRxDates(Array.from(rxDatesSet));
        setRxByDate(rxMap);

        // Appointments (only this month for patient)
        const { data: appts, error: apErr } = await supabase
          .from("appointments")
          .select("starts_at, ends_at, doctor_id")
          .eq("patient_id", user.id)
          .gte("starts_at", `${monthStartISO}T00:00:00`)
          .lte("starts_at", `${monthEndISO}T23:59:59`);
        if (apErr) throw apErr;

        const aDates: string[] = [];
        const aMap: Record<string, string[]> = {};
        (appts || []).forEach((a: any) => {
          const iso = a.starts_at.slice(0, 10);
          aDates.push(iso);
          if (!aMap[iso]) aMap[iso] = [];
          const t = new Date(a.starts_at);
          const hh = String(t.getHours()).padStart(2, "0");
          const mm = String(t.getMinutes()).padStart(2, "0");
          aMap[iso].push(`Appointment @ ${hh}:${mm}`);
        });

        setApptDates(aDates);
        setApptByDate(aMap);
      } catch (e) {
        console.error("init patient home", e);
      } finally {
        setLoadingReqs(false);
      }
    })();
  }, []);

  const acceptRequest = async (reqId: string, doctorId: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { error: linkErr } = await supabase.from("doctor_patient").insert({
        doctor_id: doctorId,
        patient_id: user.id,
      });
      if (linkErr) throw linkErr;

      const { error: delErr } = await supabase
        .from("patient_link_requests")
        .delete()
        .eq("id", reqId);
      if (delErr) throw delErr;

      const remaining = requests.filter((r) => r.id !== reqId);
      setRequests(remaining);
      if (remaining.length === 0) setShowModal(false);

      Alert.alert("Connected", "You are now linked with this doctor.");
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to accept request");
    }
  };

  const declineRequest = async (reqId: string) => {
    try {
      const { error } = await supabase
        .from("patient_link_requests")
        .delete()
        .eq("id", reqId);
    if (error) throw error;

      const remaining = requests.filter((r) => r.id !== reqId);
      setRequests(remaining);
      if (remaining.length === 0) setShowModal(false);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to decline request");
    }
  };

  const handleDatePress = (dateStr: string) => {
    setDayModalDate(dateStr);
    setDayModalOpen(true);
  };

  const dayAppts = dayModalDate ? apptByDate[dayModalDate] || [] : [];
  const dayRx = dayModalDate ? rxByDate[dayModalDate] || [] : [];
  const emptyDay = dayAppts.length === 0 && dayRx.length === 0;

  return (
    <LinearGradient
      colors={['rgb(21, 210, 209)', 'rgb(22, 161, 157)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <Header router={router} />

        <View style={styles.content}>
          <View style={styles.actionsColumn}>
            <LargeActionButton
              label="Medications"
              icon={
                <MaterialCommunityIcons name="pill" size={26} color="#0f172a" />
              }
              onPress={() => router.push("/medications")}
            />
            <LargeActionButton
              label="Appointments"
              icon={<Ionicons name="calendar" size={26} color="#0f172a" />}
              onPress={() => router.push("/appointments")}
            />
            <LargeActionButton
              label="AI Assistant"
              icon={
                <MaterialCommunityIcons
                  name="robot-happy-outline"
                  size={26}
                  color="#0f172a"
                />
              }
              onPress={() => router.push("/assistant")}
            />
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.cardTitle}>This Month</Text>
            <View style={styles.calendarCard}>
              <SimpleCalendar
                highlightDates={apptDates}          // yellow pills (appointments)
                prescriptionDates={rxDates}         // green rings (RX)
                onDatePress={handleDatePress}       // open day popup
              />
            </View>
          </View>
        </View>
      </SafeAreaView>

      {/* ---- Doctor link requests popup ---- */}
      <Modal visible={showModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Doctor Requests</Text>

            {loadingReqs ? (
              <ActivityIndicator />
            ) : requests.length === 0 ? (
              <Text style={{ textAlign: "center", color: "#64748B" }}>
                No pending requests
              </Text>
            ) : (
              <View style={{ gap: 10 }}>
                {requests.map((r) => (
                  <View
                    key={r.id}
                    style={{
                      paddingVertical: 8,
                      borderBottomWidth: 1,
                      borderColor: "#E2E8F0",
                    }}
                  >
                    <Text style={{ fontWeight: "700", color: "#0f172a" }}>
                      Doctor: {r.doctorName}
                    </Text>
                    {!!r.doctorEmail && (
                      <Text style={{ color: "#64748B" }}>{r.doctorEmail}</Text>
                    )}
                    <Text style={{ color: "#94a3b8", marginTop: 2 }}>
                      Request ID: {r.id}
                    </Text>

                    <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
                      <TouchableOpacity
                        onPress={() => acceptRequest(r.id, r.doctor_id)}
                        style={styles.btnAccept}
                      >
                        <Text style={styles.btnTextWhite}>Accept</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        onPress={() => declineRequest(r.id)}
                        style={styles.btnDecline}
                      >
                        <Text style={styles.btnTextWhite}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={{ alignSelf: "center", marginTop: 12 }}
            >
              <Text style={{ color: "#2563eb", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---- Day details popup ---- */}
      <Modal visible={dayModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {dayModalDate ? new Date(dayModalDate + "T00:00:00").toDateString() : "Day"}
            </Text>

            {emptyDay ? (
              <Text style={{ textAlign: "center", color: "#64748B" }}>
                No appointments or prescriptions
              </Text>
            ) : (
              <View style={{ gap: 12 }}>
                {dayAppts.length > 0 && (
                  <View>
                    <Text style={styles.sectionHeading}>Appointments</Text>
                    {dayAppts.map((t, i) => (
                      <Text key={i} style={styles.itemRow}>{t}</Text>
                    ))}
                  </View>
                )}
                {dayRx.length > 0 && (
                  <View>
                    <Text style={styles.sectionHeading}>Prescriptions</Text>
                    {dayRx.map((s, i) => (
                      <Text key={i} style={styles.itemRow}>
                        {s || "Prescription"}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            )}

            <TouchableOpacity
              onPress={() => setDayModalOpen(false)}
              style={{ alignSelf: "center", marginTop: 12 }}
            >
              <Text style={{ color: "#2563eb", fontWeight: "700" }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

/* -------------------------------------------------------------------------- */
/*  DOCTOR HOME                                                               */
/* -------------------------------------------------------------------------- */
function DoctorHome({ user, router }: { user: any; router: any }) {
  const [appointments, setAppointments] = useState<{ starts_at: string }[]>(
    []
  );
  const [loadingAppointments, setLoadingAppointments] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoadingAppointments(true);
      const { data, error } = await supabase
        .from("appointments")
        .select("starts_at")
        .eq("doctor_id", user.id);
      if (error) {
        console.error("Error fetching appointments:", error);
        setAppointments([]);
      } else {
        setAppointments(data || []);
      }
      setLoadingAppointments(false);
    };
    fetchAppointments();
  }, [user.id]);

  const appointmentDates = useMemo(
    () => appointments.map((a) => a.starts_at.slice(0, 10)),
    [appointments]
  );

  return (
    <LinearGradient
      colors={['rgb(21, 210, 209)', 'rgb(22, 161, 157)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={styles.container}>
        <Header router={router} />

        <View style={styles.content}>
          <View style={styles.actionsColumn}>
            <LargeActionButton
              label="Patients"
              icon={
                <MaterialCommunityIcons
                  name="account-group-outline"
                  size={33}
                  color="#0f172a"
                />
              }
              onPress={() => router.push("/patients")}
            />
            <LargeActionButton
              label="Appointments"
              icon={<Ionicons name="calendar" size={30} color="#0f172a" />}
              onPress={() => router.push("/appointments")}
            />
          </View>

          <View style={styles.cardBlock}>
            <Text style={styles.cardTitle}>Your Calendar</Text>
            <View style={styles.calendarCard}>
              {loadingAppointments ? (
                <ActivityIndicator />
              ) : (
                <SimpleCalendar
                  highlightDates={appointmentDates}
                  onDatePress={(dateStr: string) => {
                    router.push(`/appointments?from=${dateStr}&to=${dateStr}`);
                  }}
                />
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

/* -------------------------------------------------------------------------- */
/*  SHARED                                                                    */
/* -------------------------------------------------------------------------- */
function Header({ router }: { router: any }) {
  return (
    <View style={styles.headerRow}>
      <Text style={styles.title}>Welcome</Text>
      <Pressable
        onPress={() => router.push("/profile")}
        accessibilityRole="button"
        accessibilityLabel="Open profile"
        style={styles.profileBtn}
      >
        <MaterialCommunityIcons
          name="account-circle-outline"
          size={22}
          color="#fff"
        />
        <Text style={styles.profileText}>Profile</Text>
      </Pressable>
    </View>
  );
}

function LargeActionButton({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && { opacity: 0.9, transform: [{ scale: 0.995 }] },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={{ top: 6, bottom: 6, left: 8, right: 8 }}
    >
      <View style={styles.actionContent}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

/* ---- SimpleCalendar ---- */
function SimpleCalendar({
  highlightDates = [],
  prescriptionDates = [],
  onDatePress,
}: {
  highlightDates?: string[];
  prescriptionDates?: string[];
  onDatePress?: (dateStr: string) => void;
}) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-AU", {
        month: "long",
        year: "numeric",
      }).format(new Date(year, month, 1)),
    [year, month]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfMonth = new Date(year, month, 1);
  const startIndex = (startOfMonth.getDay() + 6) % 7;

  const prevMonthDays = new Date(year, month, 0).getDate();
  const leading = Array.from({ length: startIndex }, (_, i) => ({
    day: prevMonthDays - startIndex + 1 + i,
    type: "prev" as const,
  }));
  const current = Array.from({ length: daysInMonth }, (_, i) => ({
    day: i + 1,
    type: "curr" as const,
  }));
  const base = [...leading, ...current];
  const trailingCount = (7 - (base.length % 7)) % 7;
  const trailing = Array.from({ length: trailingCount }, (_, i) => ({
    day: i + 1,
    type: "next" as const,
  }));
  const cells = [...base, ...trailing];

  const isToday = (d: number) =>
    d === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();
  const getDateStr = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isHighlighted = (d: number) => highlightDates.includes(getDateStr(d));
  const isRx = (d: number) => prescriptionDates.includes(getDateStr(d));
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  const RxRing: React.FC<{ active?: boolean; children: React.ReactNode }> = ({
    active,
    children,
  }) => {
    if (!active) return <>{children}</>;
    return <View style={styles.rxRing}>{children}</View>;
  };

  return (
    <View>
      <View style={styles.calendarHeader}>
        <Text style={styles.calendarTitle}>{monthLabel}</Text>
      </View>
      <View style={styles.dowRow}>
        {DOW.map((d) => (
          <Text key={d} style={styles.dowText}>
            {d}
          </Text>
        ))}
      </View>
      <View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((c, ci) => {
              if (c.type === "curr") {
                const dateStr = getDateStr(c.day);
                const todayCell = isToday(c.day);
                const hl = isHighlighted(c.day);
                const rx = isRx(c.day);
                return (
                  <Pressable
                    key={ci}
                    style={styles.cellFixed}
                    onPress={onDatePress ? () => onDatePress(dateStr) : undefined}
                  >
                    <RxRing active={rx}>
                      {todayCell ? (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayText}>{c.day}</Text>
                        </View>
                      ) : hl ? (
                        <View style={styles.highlightPill}>
                          <Text style={styles.highlightText}>{c.day}</Text>
                        </View>
                      ) : (
                        <View>
                          <Text style={styles.dayText}>{c.day}</Text>
                        </View>
                      )}
                    </RxRing>
                  </Pressable>
                );
              }
              return (
                <View key={ci} style={styles.cellFixed}>
                  <Text style={styles.dayFaded}>{c.day}</Text>
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },

  content: {
    gap: 22,
    marginTop: 8,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    marginBottom: 12,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#ffffff" },
  profileBtn: { flexDirection: "row", alignItems: "center" },
  profileText: { marginLeft: 6, fontSize: 14, color: "#ffffff", fontWeight: "700" },

  actionsColumn: {
    flexDirection: "column",
    gap: 16,
    marginTop: 4,
    marginBottom: 4,
  },
  actionButton: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  actionContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: {
    fontSize: 26,
    fontWeight: "800",
    letterSpacing: 0.2,
    color: "#0f172a",
  },

  cardBlock: { gap: 12, marginTop: 4 },
  cardTitle: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    marginBottom: 6,
  },
  calendarCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    alignSelf: "stretch",
  },

  calendarHeader: { alignItems: "center", paddingVertical: 8, marginBottom: 2 },
  calendarTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

  dowRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  dowText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },

  weekRow: { flexDirection: "row", marginBottom: 6 },

  cellFixed: { flex: 1, height: 52, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  dayFaded: { fontSize: 16, color: "#CBD5E1" },

  todayPill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    paddingHorizontal: 8,
  },
  todayText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },

  highlightPill: {
    minWidth: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FACC15",
    paddingHorizontal: 8,
  },
  highlightText: { color: "#1E293B", fontWeight: "800", fontSize: 16 },

  rxRing: {
    minWidth: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#22c55e",
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
  },

  // Modal shared
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
    padding: 24,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    maxHeight: "75%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },

  // Buttons
  btnAccept: {
    flex: 1,
    backgroundColor: "#22c55e",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnDecline: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnTextWhite: { color: "#fff", fontWeight: "800", textAlign: "center" },

  // Day modal list
  sectionHeading: { fontWeight: "800", marginBottom: 6, color: "#0f172a" },
  itemRow: { color: "#334155", marginBottom: 4 },
});
