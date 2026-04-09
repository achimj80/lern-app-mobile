import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { API_BASE } from '../config';
import { loadUsers, setActiveUser, UserProfile } from '../services/storage';

interface Props {
  onLogin: (user: UserProfile) => void;
}

const ICONS = ['🧙', '👸', '🦸', '🧑‍🚒', '🏴‍☠️', '🦹', '🧚', '🤴', '🧑‍🚀', '🐉', '🦄', '🐱', '👦🏽', '👧🏽', '👦🏿', '👧🏿'];

export default function LoginScreen({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Register state
  const [showRegister, setShowRegister] = useState(false);
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regIcon, setRegIcon] = useState('👤');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleLogin = async () => {
    if (!name.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Anmeldung fehlgeschlagen');
        return;
      }
      await loadUsers();
      await setActiveUser(data.user.id, data.token);
      onLogin(data.user);
    } catch {
      setError('Verbindungsfehler');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regName.trim() || !regEmail.trim() || !regPassword) return;
    setIsRegistering(true);
    setRegError('');
    setRegSuccess('');
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, icon: regIcon }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRegError(data.error || 'Registrierung fehlgeschlagen');
        return;
      }
      setRegSuccess(`${regName} wurde angelegt! Du kannst dich jetzt anmelden.`);
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegIcon('👤');
      await loadUsers();
    } catch {
      setRegError('Verbindungsfehler');
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.header}>
          <Text style={styles.emoji}>✏️</Text>
          <Text style={styles.title}>LernApp</Text>
          <Text style={styles.subtitle}>Lernen – ganz einfach!</Text>
        </View>

        {!showRegister ? (
          <View style={styles.card}>
            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Dein Name"
                placeholderTextColor="#9ca3af"
                value={name}
                onChangeText={(v) => { setName(v); setError(''); }}
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Passwort</Text>
              <TextInput
                style={styles.input}
                placeholder="Passwort"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={(v) => { setPassword(v); setError(''); }}
                secureTextEntry
              />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.loginButton, (loading || !name.trim() || !password) && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading || !name.trim() || !password}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Anmelden</Text>
              )}
            </TouchableOpacity>

            <View style={styles.linksRow}>
              <TouchableOpacity>
                <Text style={styles.linkText}>Passwort vergessen?</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowRegister(true); setError(''); }}>
                <Text style={styles.linkText}>Registrieren</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.registerTitle}>Neuen Benutzer anlegen</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                placeholder="z.B. Victoria"
                placeholderTextColor="#9ca3af"
                value={regName}
                onChangeText={(v) => { setRegName(v); setRegError(''); }}
                autoCapitalize="words"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>E-Mail</Text>
              <TextInput
                style={styles.input}
                placeholder="eltern@email.de"
                placeholderTextColor="#9ca3af"
                value={regEmail}
                onChangeText={(v) => { setRegEmail(v); setRegError(''); }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Passwort</Text>
              <TextInput
                style={styles.input}
                placeholder="Passwort"
                placeholderTextColor="#9ca3af"
                value={regPassword}
                onChangeText={(v) => { setRegPassword(v); setRegError(''); }}
                secureTextEntry
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Icon</Text>
              <View style={styles.iconGrid}>
                {ICONS.map(icon => (
                  <TouchableOpacity
                    key={icon}
                    style={[styles.iconButton, regIcon === icon && styles.iconButtonActive]}
                    onPress={() => setRegIcon(icon)}
                  >
                    <Text style={styles.iconButtonText}>{icon}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {regError ? <Text style={styles.error}>{regError}</Text> : null}
            {regSuccess ? <Text style={styles.success}>{regSuccess}</Text> : null}

            <TouchableOpacity
              style={[styles.registerButton, (isRegistering || !regName.trim() || !regEmail.trim() || !regPassword) && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isRegistering || !regName.trim() || !regEmail.trim() || !regPassword}
              activeOpacity={0.9}
            >
              {isRegistering ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginButtonText}>Registrieren</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { setShowRegister(false); setRegError(''); setRegSuccess(''); }}>
              <Text style={[styles.linkText, { textAlign: 'center', marginTop: 8 }]}>Zurück zum Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fffbeb',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    color: '#374151',
  },
  subtitle: {
    fontSize: 18,
    color: '#9ca3af',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    maxWidth: 340,
    alignSelf: 'center',
    width: '100%',
  },
  registerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    textAlign: 'center',
    marginBottom: 16,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    color: '#1f2937',
  },
  error: {
    color: '#dc2626',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  success: {
    color: '#16a34a',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  loginButton: {
    backgroundColor: '#f59e0b',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  registerButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  linksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
  },
  iconButtonText: {
    fontSize: 24,
  },
});
