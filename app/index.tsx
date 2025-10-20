// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    <PatientHome user={user} router={router} />
  );
}

function PatientHome({ router }: { user: any; router: any }) {
  return (
    <LinearGradient colors={["#0ea5e9", "#6366f1"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
      <SafeAreaView style={styles.container}>
        <Header router={router} />
        <View style={styles.actionsColumn}>
          <LargeActionButton
            label="Medications"
            icon={<MaterialCommunityIcons name="pill" size={26} color="#0f172a" />}
            onPress={() => router.push("/medications")}
          />
          <LargeActionButton
            label="Appointments"
            icon={<Ionicons name="calendar" size={26} color="#0f172a" />}
            onPress={() => router.push("/appointments")}
          />
          <LargeActionButton
            label="AI Assistant"
            icon={<MaterialCommunityIcons name="robot-happy-outline" size={26} color="#0f172a" />}
            onPress={() => router.push("/assistant")}
          />
        </View>

        <View style={styles.cardBlock}>
          <Text style={styles.cardTitle}>This Month</Text>
          <View style={styles.calendarCard}>
            <SimpleCalendar />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

function DoctorHome({ user, router }: { user: any; router: any }) {
  const [appointments, setAppointments] = useState<{ starts_at: string }[]>([]);
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
    <LinearGradient colors={["#0ea5e9", "#6366f1"]} start={{x:0,y:0}} end={{x:1,y:1}} style={{flex:1}}>
      <SafeAreaView style={styles.container}>
        <Header router={router} />
        <View style={styles.actionsColumn}>
          <LargeActionButton
            label="Patients"
            icon={<MaterialCommunityIcons name="account-group-outline" size={26} color="#0f172a" />}
            onPress={() => router.push("/appointments")}
          />
          <LargeActionButton
            label="Appointments"
            icon={<Ionicons name="calendar" size={26} color="#0f172a" />}
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
      </SafeAreaView>
    </LinearGradient>
  );
}

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
        <MaterialCommunityIcons name="account-circle-outline" size={22} color="#fff" />
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
    >
      <View style={styles.actionContent}>
        <View style={styles.iconWrap}>{icon}</View>
        <Text style={styles.actionLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

/* ---- SimpleCalendar unchanged from your version ---- */
function SimpleCalendar({ highlightDates = [], onDatePress }: { highlightDates?: string[], onDatePress?: (dateStr: string) => void }) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("en-AU", { month: "long", year: "numeric" }).format(new Date(year, month, 1)),
    [year, month]
  );

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOfMonth = new Date(year, month, 1);
  const startIndex = (startOfMonth.getDay() + 6) % 7;

  const prevMonthDays = new Date(year, month, 0).getDate();
  const leading = Array.from({ length: startIndex }, (_, i) => ({
    day: prevMonthDays - startIndex + 1 + i, type: "prev" as const,
  }));
  const current = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, type: "curr" as const }));
  const base = [...leading, ...current];
  const trailingCount = (7 - (base.length % 7)) % 7;
  const trailing = Array.from({ length: trailingCount }, (_, i) => ({ day: i + 1, type: "next" as const }));
  const cells = [...base, ...trailing];

  const isToday = (d: number) => d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  const getDateStr = (d: number) => `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const isHighlighted = (d: number) => highlightDates.includes(getDateStr(d));
  const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const weeks = []; for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <View style={styles.calendarHeader}><Text style={styles.calendarTitle}>{monthLabel}</Text></View>
      <View style={styles.dowRow}>
        {DOW.map((d) => (<Text key={d} style={styles.dowText}>{d}</Text>))}
      </View>
      <View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((c, ci) => {
              if (c.type === "curr") {
                const dateStr = getDateStr(c.day);
                const todayCell = isToday(c.day);
                const hl = isHighlighted(c.day);
                return (
                  <Pressable key={ci} style={styles.cellFixed} onPress={onDatePress ? () => onDatePress(dateStr) : undefined}>
                    {todayCell ? (
                      <View style={styles.todayPill}><Text style={styles.todayText}>{c.day}</Text></View>
                    ) : hl ? (
                      <View style={styles.highlightPill}><Text style={styles.highlightText}>{c.day}</Text></View>
                    ) : (
                      <Text style={styles.dayText}>{c.day}</Text>
                    )}
                  </Pressable>
                );
              }
              return <View key={ci} style={styles.cellFixed}><Text style={styles.dayFaded}>{c.day}</Text></View>;
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingBottom: 10, marginTop: 6,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#ffffff" },
  profileBtn: { flexDirection: "row", alignItems: "center" },
  profileText: { marginLeft: 6, fontSize: 14, color: "#ffffff", fontWeight: "700" },

  actionsColumn: { flexDirection: "column", gap: 12, marginTop: 10, marginBottom: 16 },
  actionButton: {
    alignSelf: "stretch",
    backgroundColor: "#ffffff",
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  actionContent: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  iconWrap: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 18, fontWeight: "800", letterSpacing: 0.2, color: "#0f172a" },

  cardBlock: { gap: 8 },
  cardTitle: { color: "#fff", fontWeight: "700", marginLeft: 4 },
  calendarCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 12,
    alignSelf: "stretch",
  },

  calendarHeader: { alignItems: "center", paddingVertical: 8 },
  calendarTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },
  dowRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, marginBottom: 4, paddingHorizontal: 6 },
  dowText: { width: `${100 / 7}%`, textAlign: "center", fontSize: 12, color: "#64748B", fontWeight: "600" },
  weekRow: { flexDirection: "row" },
  cellFixed: { flex: 1, height: 48, alignItems: "center", justifyContent: "center" },
  dayText: { fontSize: 16, fontWeight: "600", color: "#0f172a" },
  dayFaded: { fontSize: 16, color: "#CBD5E1" },
  todayPill: { minWidth: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#0EA5E9", paddingHorizontal: 8 },
  todayText: { color: "#FFFFFF", fontWeight: "800", fontSize: 16 },
  highlightPill: { minWidth: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#FACC15", paddingHorizontal: 8 },
  highlightText: { color: "#1E293B", fontWeight: "800", fontSize: 16 },
});
