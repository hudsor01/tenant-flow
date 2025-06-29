import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { logger } from '@/lib/logger';
import type { MaintenanceRequest } from '@/types/entities';

interface Contractor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialties: string[];
  rating: number;
  availability: 'available' | 'busy' | 'unavailable';
  responseTimeHours: number;
  hourlyRate: number;
  maxConcurrentJobs: number;
  currentJobs: number;
  lastAssignedAt?: string;
  createdAt: string;
}

interface AutoAssignmentRule {
  id: string;
  issueType: string;
  priority: 'low' | 'medium' | 'high' | 'emergency';
  preferredContractors: string[];
  maxResponseTime: number; // hours
  autoAssign: boolean;
  requiresApproval: boolean;
  budgetLimit?: number;
}

interface AssignmentRecommendation {
  contractorId: string;
  contractor: Contractor;
  score: number;
  reasons: string[];
  estimatedResponseTime: number;
  estimatedCost: number;
}

// MaintenanceAssignment interface - future enhancement for tracking assignments
// interface MaintenanceAssignment {
//   id: string;
//   requestId: string;
//   contractorId: string;
//   contractor: Contractor;
//   assignedAt: string;
//   status: 'pending' | 'accepted' | 'declined' | 'completed';
//   estimatedResponseTime: number;
//   estimatedCost: number;
//   actualResponseTime?: number;
//   actualCost?: number;
//   notes?: string;
// }

const DEFAULT_ASSIGNMENT_RULES: AutoAssignmentRule[] = [
  {
    id: 'plumbing',
    issueType: 'plumbing',
    priority: 'high',
    preferredContractors: [],
    maxResponseTime: 4,
    autoAssign: true,
    requiresApproval: false,
  },
  {
    id: 'electrical',
    issueType: 'electrical',
    priority: 'high',
    preferredContractors: [],
    maxResponseTime: 2,
    autoAssign: false,
    requiresApproval: true,
  },
  {
    id: 'hvac',
    issueType: 'hvac',
    priority: 'medium',
    preferredContractors: [],
    maxResponseTime: 8,
    autoAssign: true,
    requiresApproval: false,
  },
  {
    id: 'general',
    issueType: 'general',
    priority: 'low',
    preferredContractors: [],
    maxResponseTime: 24,
    autoAssign: false,
    requiresApproval: false,
  },
];

export function useMaintenanceAutoAssignment() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Get all contractors
  const { data: contractors = [], isLoading: isLoadingContractors } = useQuery({
    queryKey: ['contractors', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('Contractor')
        .select('*')
        .eq('ownerId', user.id)
        .order('rating', { ascending: false });

      if (error) {
        logger.error('Failed to fetch contractors', error);
        throw error;
      }

      return data as Contractor[];
    },
    enabled: !!user?.id,
  });

  // Get pending maintenance requests that need assignment
  const { data: pendingRequests = [], isLoading: isLoadingRequests } = useQuery({
    queryKey: ['pendingMaintenanceRequests', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('MaintenanceRequest')
        .select(`
          *,
          property:Property!inner(
            id,
            name,
            address,
            ownerId
          ),
          unit:Unit(
            id,
            unitNumber
          ),
          tenant:Tenant(
            id,
            name,
            email,
            phone
          )
        `)
        .eq('property.ownerId', user.id)
        .eq('status', 'OPEN')
        .is('assignedContractorId', null)
        .order('createdAt', { ascending: true });

      if (error) {
        logger.error('Failed to fetch pending maintenance requests', error);
        throw error;
      }

      return data as MaintenanceRequest[];
    },
    enabled: !!user?.id,
  });

  // Get assignment rules
  const { data: assignmentRules = DEFAULT_ASSIGNMENT_RULES } = useQuery({
    queryKey: ['assignmentRules', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('No user ID');

      // TODO: Get from user_settings table
      return DEFAULT_ASSIGNMENT_RULES;
    },
    enabled: !!user?.id,
  });

  // Calculate contractor score for a specific request
  const calculateContractorScore = (contractor: Contractor, request: MaintenanceRequest): number => {
    let score = 0;

    // Base score from rating (0-100)
    score += contractor.rating * 20;

    // Specialty match bonus (0-30)
    const requestType = request.category?.toLowerCase() || 'general';
    if (contractor.specialties.some(s => s.toLowerCase().includes(requestType))) {
      score += 30;
    }

    // Availability bonus (0-20)
    if (contractor.availability === 'available') {
      score += 20;
    } else if (contractor.availability === 'busy') {
      score += 10;
    }

    // Workload penalty (0 to -15)
    const workloadRatio = contractor.currentJobs / contractor.maxConcurrentJobs;
    score -= workloadRatio * 15;

    // Response time bonus (0-15)
    if (contractor.responseTimeHours <= 2) {
      score += 15;
    } else if (contractor.responseTimeHours <= 4) {
      score += 10;
    } else if (contractor.responseTimeHours <= 8) {
      score += 5;
    }

    // Recent assignment penalty (0 to -10)
    if (contractor.lastAssignedAt) {
      const daysSinceLastAssignment = (Date.now() - new Date(contractor.lastAssignedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceLastAssignment < 1) {
        score -= 10;
      } else if (daysSinceLastAssignment < 3) {
        score -= 5;
      }
    }

    return Math.max(0, Math.min(100, score));
  };

  // Get assignment recommendations for a request
  const getAssignmentRecommendations = (request: MaintenanceRequest): AssignmentRecommendation[] => {
    return contractors
      .map(contractor => {
        const score = calculateContractorScore(contractor, request);
        const reasons: string[] = [];

        // Add scoring reasons
        if (contractor.rating >= 4.5) reasons.push('Excellent rating');
        if (contractor.availability === 'available') reasons.push('Currently available');
        if (contractor.responseTimeHours <= 4) reasons.push('Fast response time');
        
        const requestType = request.category?.toLowerCase() || 'general';
        if (contractor.specialties.some(s => s.toLowerCase().includes(requestType))) {
          reasons.push(`Specializes in ${requestType}`);
        }

        return {
          contractorId: contractor.id,
          contractor,
          score,
          reasons,
          estimatedResponseTime: contractor.responseTimeHours,
          estimatedCost: contractor.hourlyRate * 2, // Rough estimate
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5 recommendations
  };

  // Auto-assign contractor to request
  const autoAssignMutation = useMutation({
    mutationFn: async ({ requestId, contractorId }: { requestId: string; contractorId: string }) => {
      const contractor = contractors.find(c => c.id === contractorId);
      if (!contractor) throw new Error('Contractor not found');

      // Update maintenance request with contractor assignment
      const { error: updateError } = await supabase
        .from('MaintenanceRequest')
        .update({
          assignedContractorId: contractorId,
          status: 'IN_PROGRESS',
          assignedAt: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (updateError) {
        logger.error('Failed to assign contractor to maintenance request', updateError);
        throw updateError;
      }

      // Send notification to contractor
      const { error: notificationError } = await supabase.functions.invoke('send-maintenance-assignment', {
        body: {
          contractorEmail: contractor.email,
          contractorName: contractor.name,
          requestId,
          requestType: 'assignment',
        },
      });

      if (notificationError) {
        logger.warn('Failed to send assignment notification', notificationError);
      }

      // Update contractor's current job count
      await supabase
        .from('Contractor')
        .update({
          currentJobs: contractor.currentJobs + 1,
          lastAssignedAt: new Date().toISOString(),
        })
        .eq('id', contractorId);

      return { requestId, contractorId, contractor };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pendingMaintenanceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['maintenanceRequests'] });
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      logger.info('Maintenance request auto-assigned successfully', undefined, { 
        requestId: data.requestId, 
        contractorId: data.contractorId 
      });
    },
  });

  // Bulk auto-assign multiple requests
  const bulkAutoAssignMutation = useMutation({
    mutationFn: async (requestIds: string[]) => {
      const results = await Promise.allSettled(
        requestIds.map(async (requestId) => {
          const request = pendingRequests.find(r => r.id === requestId);
          if (!request) throw new Error(`Request ${requestId} not found`);

          const recommendations = getAssignmentRecommendations(request);
          if (recommendations.length === 0) throw new Error('No suitable contractors found');

          const bestContractor = recommendations[0];
          await autoAssignMutation.mutateAsync({
            requestId,
            contractorId: bestContractor.contractorId,
          });

          return { requestId, contractorId: bestContractor.contractorId };
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      return { successful, failed, total: requestIds.length };
    },
    onSuccess: (results) => {
      if (results.failed === 0) {
        logger.info(`Successfully auto-assigned ${results.successful} maintenance requests`);
      } else {
        logger.warn(`Auto-assigned ${results.successful} requests, ${results.failed} failed`);
      }
    },
  });

  // Statistics
  const stats = {
    totalPendingRequests: pendingRequests.length,
    availableContractors: contractors.filter(c => c.availability === 'available').length,
    busyContractors: contractors.filter(c => c.availability === 'busy').length,
    avgContractorRating: contractors.length > 0 
      ? contractors.reduce((sum, c) => sum + c.rating, 0) / contractors.length 
      : 0,
    avgResponseTime: contractors.length > 0 
      ? contractors.reduce((sum, c) => sum + c.responseTimeHours, 0) / contractors.length 
      : 0,
    emergencyRequests: pendingRequests.filter(r => r.priority === 'EMERGENCY').length,
    highPriorityRequests: pendingRequests.filter(r => r.priority === 'HIGH').length,
  };

  return {
    contractors,
    pendingRequests,
    assignmentRules,
    stats,
    isLoading: isLoadingContractors || isLoadingRequests,
    getAssignmentRecommendations,
    autoAssign: autoAssignMutation.mutate,
    bulkAutoAssign: bulkAutoAssignMutation.mutate,
    isAssigning: autoAssignMutation.isPending || bulkAutoAssignMutation.isPending,
  };
}

export function useContractorManagement() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Add new contractor
  const addContractorMutation = useMutation({
    mutationFn: async (contractor: Omit<Contractor, 'id' | 'ownerId' | 'createdAt'>) => {
      if (!user?.id) throw new Error('No user ID');

      const { data, error } = await supabase
        .from('Contractor')
        .insert({
          ...contractor,
          ownerId: user.id,
          createdAt: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        logger.error('Failed to add contractor', error);
        throw error;
      }

      return data as Contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      logger.info('Contractor added successfully');
    },
  });

  // Update contractor
  const updateContractorMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Contractor> }) => {
      const { data, error } = await supabase
        .from('Contractor')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        logger.error('Failed to update contractor', error);
        throw error;
      }

      return data as Contractor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contractors'] });
      logger.info('Contractor updated successfully');
    },
  });

  return {
    addContractor: addContractorMutation.mutate,
    updateContractor: updateContractorMutation.mutate,
    isAddingContractor: addContractorMutation.isPending,
    isUpdatingContractor: updateContractorMutation.isPending,
  };
}