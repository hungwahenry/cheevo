import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useAuth } from '@/src/hooks/useAuth';
import { useUniversities } from '@/src/hooks/useUniversities';
import { debounce } from '@/src/utils/helpers';
import { validation } from '@/src/utils/validation';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Loader2, Search, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { completeOnboarding, isLoading, error, clearError, checkUsernameAvailability } = useAuth();
  const { searchResults, searchUniversities, isSearching } = useUniversities();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardColor = useThemeColor({}, 'card');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  
  const [username, setUsername] = useState('');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const [universityQuery, setUniversityQuery] = useState('');
  const [selectedUniversity, setSelectedUniversity] = useState<{id: number, name: string} | null>(null);
  const [universityError, setUniversityError] = useState<string | null>(null);
  const [showUniversityList, setShowUniversityList] = useState(false);

  // Animation values
  const contentOpacity = useSharedValue(0);

  React.useEffect(() => {
    contentOpacity.value = withTiming(1, { duration: 500 });
  }, []);

  React.useEffect(() => {
    if (error) {
      clearError();
    }
  }, [error]);

  // Debounced university search
  const debouncedSearch = React.useCallback(
    debounce((query: string) => {
      searchUniversities(query);
    }, 300),
    [searchUniversities]
  );

  // Debounced username availability check
  const debouncedUsernameCheck = React.useCallback(
    debounce(async (usernameToCheck: string) => {
      if (usernameToCheck.length < 3) {
        setIsCheckingUsername(false);
        return;
      }
      
      setIsCheckingUsername(true);
      const result = await checkUsernameAvailability(usernameToCheck);
      
      if (result.success) {
        if (!result.data) {
          setUsernameError('This username is already taken');
        } else {
          // Clear any previous availability errors when username is available
          if (usernameError?.includes('taken') || usernameError?.includes('availability')) {
            setUsernameError(null);
          }
        }
      } else {
        setUsernameError('Unable to check username availability');
      }
      
      setIsCheckingUsername(false);
    }, 500),
    [checkUsernameAvailability, usernameError]
  );

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    if (usernameError) {
      setUsernameError(null);
    }
    
    // Check username availability after user stops typing
    if (value.length >= 3) {
      debouncedUsernameCheck(value);
    }
  };

  const handleUniversityQueryChange = (value: string) => {
    setUniversityQuery(value);
    setShowUniversityList(!!value.trim());
    
    if (universityError) {
      setUniversityError(null);
    }
    
    if (selectedUniversity) {
      setSelectedUniversity(null);
    }

    debouncedSearch(value);
  };

  const handleSelectUniversity = (university: {id: number, name: string, state: string}) => {
    setSelectedUniversity({id: university.id, name: university.name});
    setUniversityQuery(university.name);
    setShowUniversityList(false);
    if (universityError) {
      setUniversityError(null);
    }
  };

  const handleComplete = async () => {
    let hasErrors = false;

    // Validate username format
    const usernameValidation = validation.username(username);
    if (!usernameValidation.isValid) {
      setUsernameError(usernameValidation.error!);
      hasErrors = true;
    }

    // Check if there's already a username availability error from debounced check
    if (usernameError && usernameError.includes('taken')) {
      hasErrors = true;
    }

    // Validate university selection
    const universityValidation = validation.university(selectedUniversity?.id || null);
    if (!universityValidation.isValid) {
      setUniversityError(universityValidation.error!);
      hasErrors = true;
    }

    if (hasErrors) return;

    // Complete onboarding
    const success = await completeOnboarding({
      username: username.trim(),
      universityId: selectedUniversity!.id
    });

    if (success) {
      router.replace('/');
    }
  };

  const renderUniversityItem = ({ item }: { item: any }) => (
    <Pressable
      style={[styles.universityItem, { backgroundColor: cardColor, borderBottomColor: borderColor }]}
      onPress={() => handleSelectUniversity(item)}
    >
      <View style={styles.universityInfo}>
        <Text variant="body" style={styles.universityName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text variant="caption" style={styles.universityState}>
          {item.state}
        </Text>
      </View>
    </Pressable>
  );

  const canComplete = username.trim().length >= 3 && 
    selectedUniversity && 
    !isLoading && 
    !isCheckingUsername &&
    !usernameError;

  return (
    <>
      <StatusBar style="auto" />
      <KeyboardAvoidingView 
        style={[styles.container, { backgroundColor }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { paddingTop: insets.top }]}>
          <Animated.View style={[styles.animatedContent, contentAnimatedStyle]}>
            {/* Header */}
            <View style={styles.header}>
              <Text variant="title">Complete Setup</Text>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
              <View style={styles.titleSection}>
                <Text variant="heading" style={styles.title}>
                  Create your profile
                </Text>
                <Text variant="body" style={styles.subtitle}>
                  Choose a username and select your university to join your campus community.
                </Text>
              </View>

              <View style={styles.formSection}>
                {/* Username Input */}
                <Input
                  label="Username"
                  placeholder="johndoe"
                  value={username}
                  onChangeText={handleUsernameChange}
                  error={usernameError || undefined}
                  autoCapitalize="none"
                  autoCorrect={false}
                  icon={User}
                  rightComponent={isCheckingUsername ? (
                    <Loader2 size={16} color={mutedColor} />
                  ) : undefined}
                  containerStyle={styles.input}
                />

                {/* University Input */}
                <View style={styles.universitySection}>
                  <Input
                    label="University"
                    placeholder="Search for your university..."
                    value={universityQuery}
                    onChangeText={handleUniversityQueryChange}
                    error={universityError || undefined}
                    autoCapitalize="words"
                    autoCorrect={false}
                    icon={Search}
                    containerStyle={styles.input}
                    onFocus={() => setShowUniversityList(!!universityQuery.trim())}
                  />

                  {/* University Search Results */}
                  {showUniversityList && (
                    <View style={[styles.universityList, { backgroundColor: cardColor, borderColor }]}>
                      {isSearching ? (
                        <View style={styles.searchingContainer}>
                          <Text variant="caption">Searching...</Text>
                        </View>
                      ) : searchResults.length > 0 ? (
                        <FlatList
                          data={searchResults}
                          renderItem={renderUniversityItem}
                          keyExtractor={item => item.id.toString()}
                          style={styles.resultsList}
                          showsVerticalScrollIndicator={false}
                        />
                      ) : universityQuery.trim() ? (
                        <View style={styles.noResultsContainer}>
                          <Text variant="caption">No universities found</Text>
                        </View>
                      ) : null}
                    </View>
                  )}
                </View>
              </View>
            </View>

            {/* Button */}
            <View style={styles.buttonSection}>
              <Button 
                size="lg"
                onPress={handleComplete}
                loading={isLoading}
                disabled={!canComplete}
                style={styles.completeButton}
              >
                Complete Setup
              </Button>
            </View>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  animatedContent: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 20,
  },
  titleSection: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    marginBottom: 12,
    lineHeight: 36,
    textAlign: 'center',
  },
  subtitle: {
    opacity: 0.7,
    lineHeight: 24,
    textAlign: 'center',
    maxWidth: width - 60,
    alignSelf: 'center',
  },
  formSection: {
    marginBottom: 60,
  },
  input: {
    marginBottom: 20,
  },
  universitySection: {
    position: 'relative',
    zIndex: 1000,
  },
  universityList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 12,
    maxHeight: 200,
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  resultsList: {
    maxHeight: 180,
  },
  universityItem: {
    padding: 16,
    borderBottomWidth: 1,
  },
  universityInfo: {
    flex: 1,
  },
  universityName: {
    fontWeight: '500',
    marginBottom: 4,
  },
  universityState: {
    opacity: 0.6,
  },
  searchingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  buttonSection: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  completeButton: {
    minWidth: width - 48,
  },
});