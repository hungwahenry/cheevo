import React, { useState } from 'react';
import { StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import { Text } from '@/components/ui/text';
import { View } from '@/components/ui/view';
import { Button } from '@/components/ui/button';
import { SettingsHeader } from '@/components/settings/SettingsHeader';
import { useThemeColor } from '@/hooks/useThemeColor';
import { useReportsHistory } from '@/src/hooks/useReportsHistory';
import { type Report, type ContentType } from '@/src/services/report.service';
import { FileText, MessageSquare, User, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react-native';

export default function ReportsHistoryScreen() {
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'card');
  const mutedColor = useThemeColor({}, 'mutedForeground');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'foreground');
  
  const { reports, loading, error, refresh } = useReportsHistory();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const getContentTypeIcon = (contentType: ContentType) => {
    switch (contentType) {
      case 'post':
        return FileText;
      case 'comment':
        return MessageSquare;
      case 'user':
        return User;
      default:
        return FileText;
    }
  };

  const getContentTypeLabel = (contentType: ContentType) => {
    switch (contentType) {
      case 'post':
        return 'Post';
      case 'comment':
        return 'Comment';
      case 'user':
        return 'User Profile';
      default:
        return 'Content';
    }
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case 'reviewed':
        return CheckCircle;
      case 'dismissed':
        return XCircle;
      case 'pending':
      default:
        return Clock;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'reviewed':
        return '#22c55e'; // green
      case 'dismissed':
        return '#ef4444'; // red
      case 'pending':
      default:
        return '#f59e0b'; // orange
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'reviewed':
        return 'Reviewed';
      case 'dismissed':
        return 'Dismissed';
      case 'pending':
      default:
        return 'Pending';
    }
  };

  const formatReason = (reason: string) => {
    // Convert snake_case to readable format
    return reason
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <AlertTriangle size={48} color={mutedColor} style={styles.emptyIcon} />
      <Text variant="heading" style={styles.emptyTitle}>No Reports Yet</Text>
      <Text style={[styles.emptyText, { color: mutedColor }]}>
        You haven't submitted any reports yet. When you report content that violates our community guidelines, it will appear here.
      </Text>
    </View>
  );

  const renderReport = (report: Report) => {
    const ContentIcon = getContentTypeIcon(report.reported_content_type);
    const StatusIcon = getStatusIcon(report.status);
    const statusColor = getStatusColor(report.status);
    
    return (
      <View key={report.id} style={[styles.reportCard, { backgroundColor: cardBackground, borderColor }]}>
        {/* Header with content type and status */}
        <View style={styles.reportHeader}>
          <View style={styles.contentInfo}>
            <ContentIcon size={14} color={mutedColor} />
            <Text style={[styles.contentType, { color: textColor }]}>
              {getContentTypeLabel(report.reported_content_type)}
            </Text>
            <Text style={[styles.reasonText, { color: textColor }]}>
              • {formatReason(report.reason)}
            </Text>
          </View>
          
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
            <StatusIcon size={10} color={statusColor} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {getStatusLabel(report.status)}
            </Text>
          </View>
        </View>

        {/* Reported content preview */}
        {report.reported_content && (
          <View style={[styles.contentPreview, { borderColor }]}>
            {report.reported_content.author_username && (
              <Text style={[styles.authorText, { color: mutedColor }]}>
                by @{report.reported_content.author_username}
              </Text>
            )}
            <Text 
              style={[
                styles.contentText, 
                { color: report.reported_content.is_deleted ? mutedColor : textColor }
              ]}
              numberOfLines={3}
            >
              {report.reported_content.content}
            </Text>
          </View>
        )}

        {/* Footer with date info */}
        <View style={styles.reportFooter}>
          <Text style={[styles.dateText, { color: mutedColor }]}>
            {new Date(report.created_at).toLocaleDateString()}
            {report.reviewed_at && ` • Reviewed ${new Date(report.reviewed_at).toLocaleDateString()}`}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <SettingsHeader title="Reports History" />

      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
          />
        }
      >
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={{ color: mutedColor }}>Loading your reports...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={{ color: mutedColor }}>{error}</Text>
              <Button variant="outline" onPress={refresh} style={styles.retryButton}>
                Try Again
              </Button>
            </View>
          ) : reports.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              <Text style={[styles.description, { color: mutedColor }]}>
                You have submitted {reports.length} report{reports.length !== 1 ? 's' : ''}. 
                Thank you for helping keep our community safe.
              </Text>
              
              <View style={styles.reportsList}>
                {reports.map(renderReport)}
              </View>
            </>
          )}
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
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    textAlign: 'center',
  },
  reportsList: {
    gap: 8,
  },
  reportCard: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  reportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  contentType: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 13,
    color: 'inherit',
    flex: 1,
  },
  contentPreview: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  authorText: {
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
  },
  contentText: {
    fontSize: 12,
    lineHeight: 16,
  },
  reportFooter: {
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  retryButton: {
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 16,
  },
  emptyIcon: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});