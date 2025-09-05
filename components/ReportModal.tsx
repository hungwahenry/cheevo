import React, { useState } from 'react';
import { StyleSheet, Modal, TouchableOpacity, Alert, TextInput } from 'react-native';
import { View } from '@/components/ui/view';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { reportService, ContentType } from '@/src/services/report.service';

interface ReportModalProps {
  visible: boolean;
  onClose: () => void;
  contentType: ContentType;
  contentId: number;
}

export function ReportModal({ 
  visible, 
  onClose, 
  contentType, 
  contentId
}: ReportModalProps) {
  const insets = useSafeAreaInsets();
  const backgroundColor = useThemeColor({}, 'background');
  const borderColor = useThemeColor({}, 'border');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const textColor = useThemeColor({}, 'foreground');
  const primaryColor = useThemeColor({}, 'primary');
  
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reasons = reportService.getReportReasons(contentType);
  const isCustomReason = selectedReason === 'other';
  const finalReason = isCustomReason ? customReason.trim() : selectedReason;

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!finalReason) {
      Alert.alert('Error', 'Please select a reason for reporting this content');
      return;
    }

    if (isCustomReason && customReason.trim().length < 5) {
      Alert.alert('Error', 'Please provide an explanation (at least 5 characters)');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await reportService.createReport({
        contentType,
        contentId,
        reason: finalReason
      });

      if (result.success) {
        Alert.alert('Report Submitted', result.message, [
          { text: 'OK', onPress: handleClose }
        ]);
      } else {
        Alert.alert('Error', result.message);
      }
    } catch (error) {
      console.error('Report submission error:', error);
      Alert.alert('Error', 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getContentTypeLabel = () => {
    switch (contentType) {
      case 'post': return 'Post';
      case 'comment': return 'Comment';
      case 'user': return 'User';
      default: return 'Content';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.container, { backgroundColor }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <Text variant="title" style={styles.headerTitle}>
            Report {getContentTypeLabel()}
          </Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color={mutedColor} />
          </TouchableOpacity>
        </View>


        {/* Content */}
        <View style={styles.content}>
          <Text style={[styles.questionText, { color: textColor }]}>
            Why are you reporting this {contentType}?
          </Text>

          {/* Reason List */}
          <View style={styles.reasonsList}>
            {reasons.map((reason) => (
              <TouchableOpacity
                key={reason.value}
                style={[
                  styles.reasonOption,
                  { 
                    backgroundColor: selectedReason === reason.value ? `${primaryColor}15` : 'transparent'
                  }
                ]}
                onPress={() => setSelectedReason(reason.value)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.reasonLabel, 
                  { 
                    color: selectedReason === reason.value ? primaryColor : textColor,
                    fontWeight: selectedReason === reason.value ? '600' : '400'
                  }
                ]}>
                  {reason.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Custom Reason Input */}
          {isCustomReason && (
            <TextInput
              style={[
                styles.customReasonInput,
                { 
                  borderColor,
                  color: textColor
                }
              ]}
              placeholder="Please explain..."
              placeholderTextColor={mutedColor}
              value={customReason}
              onChangeText={setCustomReason}
              multiline
              maxLength={200}
              textAlignVertical="top"
            />
          )}
        </View>

        {/* Actions */}
        <View style={[styles.actionsContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Button
            variant="outline"
            onPress={handleClose}
            style={styles.cancelButton}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onPress={handleSubmit}
            style={styles.submitButton}
            disabled={!finalReason || isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  reasonsList: {
    gap: 8,
  },
  reasonOption: {
    padding: 12,
    borderRadius: 8,
  },
  reasonLabel: {
    fontSize: 15,
  },
  customReasonInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    marginTop: 12,
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 16,
  },
  cancelButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});