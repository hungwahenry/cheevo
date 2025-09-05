import { supabase } from '@/lib/supabase';

export type ContentType = 'post' | 'comment' | 'user';
export type ReportStatus = 'pending' | 'reviewed' | 'dismissed';

export interface Report {
  id: number;
  reporter_user_id: string;
  reported_content_type: ContentType;
  reported_content_id: number;
  reason: string;
  status: ReportStatus | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CreateReportRequest {
  contentType: ContentType;
  contentId: number;
  reason: string;
}

export interface ReportServiceResponse {
  success: boolean;
  message: string;
  reportId?: number;
  error?: string;
}

export const REPORT_REASONS = {
  post: [
    { value: 'spam', label: 'Spam or repetitive content' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech or discrimination' },
    { value: 'misinformation', label: 'False or misleading information' },
    { value: 'inappropriate', label: 'Inappropriate or offensive content' },
    { value: 'violence', label: 'Threats or violent content' },
    { value: 'privacy', label: 'Privacy violation or doxxing' },
    { value: 'other', label: 'Other (please explain)' }
  ],
  comment: [
    { value: 'spam', label: 'Spam or repetitive content' },
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'hate_speech', label: 'Hate speech or discrimination' },
    { value: 'inappropriate', label: 'Inappropriate or offensive content' },
    { value: 'off_topic', label: 'Off-topic or irrelevant' },
    { value: 'other', label: 'Other (please explain)' }
  ],
  user: [
    { value: 'harassment', label: 'Harassment or bullying' },
    { value: 'impersonation', label: 'Impersonation or fake account' },
    { value: 'spam', label: 'Spam or bot behavior' },
    { value: 'inappropriate_profile', label: 'Inappropriate profile content' },
    { value: 'other', label: 'Other (please explain)' }
  ]
} as const;

class ReportService {
  /**
   * Create a new report for content
   */
  async createReport(request: CreateReportRequest): Promise<ReportServiceResponse> {
    try {
      // Validate request
      if (!request.reason?.trim()) {
        return {
          success: false,
          message: 'Report reason is required'
        };
      }

      if (!request.contentType || !['post', 'comment', 'user'].includes(request.contentType)) {
        return {
          success: false,
          message: 'Invalid content type'
        };
      }

      if (!request.contentId || request.contentId <= 0) {
        return {
          success: false,
          message: 'Invalid content ID'
        };
      }

      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          message: 'You must be logged in to report content'
        };
      }

      // Create the report using edge function for additional validation
      const { data, error } = await supabase.functions.invoke('create-report', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: {
          contentType: request.contentType,
          contentId: request.contentId,
          reason: request.reason.trim()
        }
      });

      if (error) {
        console.error('Create report error:', error);
        return {
          success: false,
          message: error.message || 'Failed to submit report'
        };
      }

      return {
        success: true,
        message: 'Report submitted successfully. Thank you for helping keep our community safe.',
        reportId: data.reportId
      };

    } catch (error) {
      console.error('Unexpected error creating report:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get user's reports (for their own reference)
   */
  async getUserReports(): Promise<{ success: boolean; reports?: Report[]; error?: string }> {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        return {
          success: false,
          error: 'You must be logged in to view reports'
        };
      }

      const { data: reports, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Get user reports error:', error);
        return {
          success: false,
          error: 'Failed to load reports'
        };
      }

      return {
        success: true,
        reports: reports || []
      };

    } catch (error) {
      console.error('Unexpected error getting user reports:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }

  /**
   * Get available report reasons for content type
   */
  getReportReasons(contentType: ContentType) {
    return REPORT_REASONS[contentType] || [];
  }
}

export const reportService = new ReportService();