import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface UseTenantActionsProps {
  tenant?: {
    email: string;
    phone?: string;
  };
}

/**
 * Custom hook for managing tenant actions and tab navigation
 * Handles contact actions, tab state, and URL parameter management
 */
export function useTenantActions({ tenant }: UseTenantActionsProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('overview');

  // Check for tab parameter in URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'leases', 'payments', 'maintenance'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  // Contact actions
  const handleSendEmail = () => {
    if (tenant?.email) {
      window.location.href = `mailto:${tenant.email}`;
    }
  };

  const handleCall = () => {
    if (tenant?.phone) {
      window.location.href = `tel:${tenant.phone}`;
    }
  };

  // Navigation actions
  const handleBackToTenants = () => {
    navigate('/tenants');
  };

  return {
    activeTab,
    setActiveTab,
    handleSendEmail,
    handleCall,
    handleBackToTenants,
  };
}