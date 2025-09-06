import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { SettingsItem } from '@/components/settings/SettingsItem';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAccount } from '@/src/hooks/useAccount';
import { useAuth } from '@/src/hooks/useAuth';
import { router } from 'expo-router';
import { Mail, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet } from 'react-native';

export default function AccountSettingsScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const { userEmail, updateUserEmail, isLoading, signOut } = useAuth();
  const { deleteAccount, isLoading: isDeletingAccount } = useAccount();
  
  const [isChangingEmail, setIsChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');

  const handleChangeEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (newEmail.trim().toLowerCase() === userEmail?.toLowerCase()) {
      Alert.alert('Error', 'This is already your current email address');
      return;
    }

    const result = await updateUserEmail(newEmail);

    if (result.success) {
      Alert.alert(
        'Email Update Requested', 
        'Please check both your old and new email addresses for confirmation links to complete the email change.',
        [{ text: 'OK', onPress: () => {
          setIsChangingEmail(false);
          setNewEmail('');
        }}]
      );
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your posts, comments, and data will be permanently deleted.\n\nAre you sure you want to delete your account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => showFinalConfirmation(),
        },
      ]
    );
  };

  const showFinalConfirmation = () => {
    Alert.alert(
      'Final Confirmation',
      'This will permanently delete your account and all associated data. This cannot be undone.\n\nAre you absolutely sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Delete My Account',
          style: 'destructive',
          onPress: () => handleConfirmDeletion(),
        },
      ]
    );
  };

  const handleConfirmDeletion = async () => {
    const success = await deleteAccount();
    
    if (success) {
      Alert.alert(
        'Account Deleted',
        'Your account has been permanently deleted.',
        [
          {
            text: 'OK',
            onPress: async () => {
              await signOut();
              router.replace('/welcome');
            },
          },
        ]
      );
    }

  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <SettingsHeader title="Account" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* Current Email Section */}
          <SettingsSection title="Current Email">
            <SettingsItem
              icon={Mail}
              title={userEmail || 'No email'}
              subtitle="Your current email address"
              showChevron={false}
            />
          </SettingsSection>

          {/* Change Email Section */}
          <SettingsSection 
            title="Change Email" 
            subtitle="Update your email address for login and notifications"
          >
            {!isChangingEmail ? (
              <SettingsItem
                icon={Mail}
                title="Update Email Address"
                subtitle="Change the email address for your account"
                onPress={() => setIsChangingEmail(true)}
              />
            ) : (
              <View style={styles.emailChangeSection}>
                <View style={styles.inputContainer}>
                  <Input
                    label="New Email"
                    placeholder="Enter your new email"
                    value={newEmail}
                    onChangeText={setNewEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    editable={!isLoading}
                  />
                </View>
                
                <View style={styles.buttonRow}>
                  <Button
                    variant="outline"
                    onPress={() => {
                      setIsChangingEmail(false);
                      setNewEmail('');
                    }}
                    disabled={isLoading}
                    style={styles.cancelButton}
                  >
                    Cancel
                  </Button>
                  
                  <Button
                    onPress={handleChangeEmail}
                    disabled={isLoading || !newEmail.trim()}
                    style={styles.updateButton}
                  >
                    {isLoading ? 'Updating...' : 'Update Email'}
                  </Button>
                </View>
              </View>
            )}
          </SettingsSection>

          {/* Danger Zone */}
          <SettingsSection 
            title="Danger Zone" 
            subtitle="Irreversible actions that affect your account"
          >
            <SettingsItem
              icon={Trash2}
              title="Delete Account"
              subtitle={isDeletingAccount ? "Deleting account..." : "Permanently delete your account and all data"}
              onPress={handleDeleteAccount}
              showChevron={false}
              disabled={isDeletingAccount}
            />
          </SettingsSection>

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  emailChangeSection: {
    paddingHorizontal: 16,
    gap: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
  },
  updateButton: {
    flex: 1,
  },
});