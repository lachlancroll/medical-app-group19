import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
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
  const [dob, setDob] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const IS_DOCTOR = false;

  const provisionForUser = useCallback(
    async (uid: string) => {
      const { data: authUser } = await supabase.auth.getUser();
      const emailNow = authUser?.user?.email ?? email;

      await supabase.from("users").upsert(
        { id: uid, email: emailNow ?? "", isDoctor: IS_DOCTOR },
        { onConflict: "id" }
      );

      const dobClean = /^\d{4}-\d{2}-\d{2}$/.test(dob.trim())
        ? dob.trim()
        : null;

      await supabase.from("profiles").upsert(
        {
          user_id: uid,
          full_name: fullName || null,
          phone: phone || null,
          dob: dobClean,
        },
        { onConflict: "user_id" }
      );
    },
    [email, fullName, phone, dob]
  );

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        await provisionForUser(session.user.id);
        router.replace("/");
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
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
        data: { full_name: fullName, phone, dob, isDoctor: IS_DOCTOR },
        emailRedirectTo:
          Platform.OS === "web" ? window.location.origin : undefined,
      },
    });

    setLoading(false);
    if (error) return setError(error.message);

    if (!data.session) setInfo("Check your email to confirm your account.");
    else setInfo("Account created!");
  };

  return (
    <LinearGradient
      colors={["#15d2d1", "#16a19d"]}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Create Patient Account</Text>

        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <TextInput style={styles.input} placeholder="Phone Number" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <TextInput style={styles.input} placeholder="DOB (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
        <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm Password" value={confirm} onChangeText={setConfirm} secureTextEntry />

        {!!error && <Text style={styles.error}>{error}</Text>}
        {!!info && <Text style={styles.info}>{info}</Text>}

        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <TouchableOpacity style={styles.createBtn} onPress={handleSignUp}>
              <Text style={styles.createBtnText}>Create Account</Text>
            </TouchableOpacity>

            <Text style={styles.link}>
              Have an account?{" "}
              <Text style={styles.boldLink} onPress={() => router.replace("/signin")}>
                Sign in
              </Text>
            </Text>
          </>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24 },
  title: { fontSize: 26, textAlign: "center", fontWeight: "800", color: "#fff", marginBottom: 24 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 10,
  },
  createBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  link: { marginTop: 18, textAlign: "center", color: "#fff" },
  boldLink: { fontWeight: "700", textDecorationLine: "underline" },
  error: { color: "#ff5252", marginBottom: 10, textAlign: "center", fontWeight: "600" },
  info: { color: "#d1fae5", marginBottom: 10, textAlign: "center" },
});
