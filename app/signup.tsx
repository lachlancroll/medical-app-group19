// // app/signup.tsx
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../supabaseClient";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [dob, setDob] = useState(""); // YYYY-MM-DD
  const [isDoctor, setIsDoctor] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const provisionForUser = useCallback(
    async (uid: string) => {
      const { data: authUser } = await supabase.auth.getUser();
      const emailNow = authUser?.user?.email ?? email;

      const { error: upUsersErr } = await supabase
        .from("users")
        .upsert(
          { id: uid, email: emailNow ?? "", isDoctor },
          { onConflict: "id" }
        );
      if (upUsersErr) console.error("upsert public.users failed:", upUsersErr);

      const dobClean = /^\d{4}-\d{2}-\d{2}$/.test(dob.trim())
        ? dob.trim()
        : null;

      const { error: upProfilesErr } = await supabase.from("profiles").upsert(
        {
          user_id: uid,
          full_name: fullName || null,
          phone: phone || null,
          dob: dobClean,
        },
        { onConflict: "user_id" }
      );
      if (upProfilesErr) {
        console.error("upsert public.profiles failed:", upProfilesErr);
        setError(upProfilesErr.message);
      }
    },
    [email, fullName, phone, dob, isDoctor]
  );

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await provisionForUser(session.user.id);
        router.replace("/");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_e, session) => {
        if (session?.user?.id) {
          await provisionForUser(session.user.id);
          router.replace("/");
        }
      }
    );
    return () => sub.subscription.unsubscribe();
  }, [router, provisionForUser]);

  const handleSignUp = async () => {
    if (!email || !password)
      return setError("Email and password are required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    setLoading(true);
    setError("");
    setInfo("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || undefined,
          phone: phone || undefined,
          dob: dob || undefined,
          isDoctor: isDoctor,
        },
        emailRedirectTo:
          Platform.OS === "web" ? window.location.origin : undefined,
      },
    });

    setLoading(false);
    if (error) return setError(error.message);

    if (!data.session) {
      setInfo("Check your email to confirm your account, then sign in.");
    } else {
      setInfo("Account created!");
    }
  };

  return (
    <LinearGradient
      colors={["rgb(21, 210, 209)", "rgb(22, 161, 157)"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        <TextInput
          style={styles.input}
          placeholder="Full name (optional)"
          placeholderTextColor="#666"
          value={fullName}
          onChangeText={setFullName}
        />

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#666"
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          placeholderTextColor="#666"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        <TextInput
          style={styles.input}
          placeholder="DOB (YYYY-MM-DD)"
          placeholderTextColor="#666"
          autoCapitalize="none"
          value={dob}
          onChangeText={setDob}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          secureTextEntry
          autoComplete="password-new"
          value={password}
          onChangeText={setPassword}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor="#666"
          secureTextEntry
          autoComplete="password-new"
          value={confirm}
          onChangeText={setConfirm}
        />

        <View style={styles.row}>
          <Switch
            value={isDoctor}
            onValueChange={setIsDoctor}
            trackColor={{ false: "#ccc", true: "#22c55e" }}
            thumbColor={isDoctor ? "#fff" : "#f4f3f4"}
          />
          <Text style={styles.switchLabel}>I’m a doctor</Text>
        </View>

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <TouchableOpacity style={styles.createBtn} onPress={handleSignUp}>
              <Text style={styles.createBtnText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.link} onPress={() => router.replace("/signin")}>
              Have an account? <Text style={{ fontWeight: "700" }}>Sign in</Text>
            </Text>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: {
    fontSize: 26,
    textAlign: "center",
    fontWeight: "800",
    color: "#fff",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#fff",
    color: "#000",
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
  },
  switchLabel: {
    marginLeft: 8,
    color: "#fff",
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  link: {
    marginTop: 18,
    textAlign: "center",
    color: "#fff",
    textDecorationLine: "underline",
  },
  error: {
    color: "#ff5252",
    marginBottom: 10,
    textAlign: "center",
    fontWeight: "600",
  },
  info: {
    color: "#d1fae5",
    marginBottom: 10,
    textAlign: "center",
  },
});
