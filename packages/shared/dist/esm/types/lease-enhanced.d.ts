/**
 * Enhanced lease management types for Issue #93
 * Includes lease templates, digital signatures, PDF generation, and lifecycle management
 */
export interface LeaseTemplate {
    id: string;
    name: string;
    description?: string;
    state?: string;
    type: 'STANDARD' | 'COMMERCIAL' | 'MONTH_TO_MONTH';
    content: string;
    variables: Record<string, unknown>;
    isActive: boolean;
    isSystemTemplate: boolean;
    version: number;
    parentTemplateId?: string;
    ownerId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface LeaseClause {
    id: string;
    title: string;
    content: string;
    category: string;
    state?: string;
    isRequired: boolean;
    isSystemClause: boolean;
    ownerId?: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface LeaseDocument {
    id: string;
    leaseId: string;
    templateId?: string;
    documentUrl?: string;
    status: 'DRAFT' | 'GENERATED' | 'SENT_FOR_SIGNATURE' | 'SIGNED' | 'CANCELLED';
    version: number;
    generatedAt?: Date;
    signatureProvider?: 'DOCUSIGN' | 'HELLOSIGN' | 'ADOBE_SIGN';
    signatureEnvelopeId?: string;
    variables: Record<string, unknown>;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
export interface LeaseSignature {
    id: string;
    leaseDocumentId: string;
    signerType: 'LANDLORD' | 'TENANT' | 'GUARANTOR' | 'WITNESS';
    signerName: string;
    signerEmail: string;
    signerId?: string;
    status: 'PENDING' | 'SENT' | 'VIEWED' | 'SIGNED' | 'DECLINED' | 'EXPIRED';
    signedAt?: Date;
    ipAddress?: string;
    userAgent?: string;
    signatureImageUrl?: string;
    providerSignatureId?: string;
    auditTrail: Array<Record<string, unknown>>;
    createdAt: Date;
    updatedAt: Date;
}
export interface LeaseAmendment {
    id: string;
    leaseId: string;
    title: string;
    description: string;
    type: 'AMENDMENT' | 'ADDENDUM' | 'RIDER';
    content: string;
    effectiveDate: Date;
    status: 'DRAFT' | 'PENDING_SIGNATURES' | 'SIGNED' | 'ACTIVE';
    documentUrl?: string;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface LeaseRenewal {
    id: string;
    originalLeaseId: string;
    newLeaseId?: string;
    status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
    proposedStartDate: Date;
    proposedEndDate: Date;
    proposedRentAmount: number;
    notes?: string;
    offerExpiresAt?: Date;
    respondedAt?: Date;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare enum EnhancedLeaseStatus {
    DRAFT = "DRAFT",
    PENDING_REVIEW = "PENDING_REVIEW",
    PENDING_SIGNATURES = "PENDING_SIGNATURES",
    SIGNED = "SIGNED",
    ACTIVE = "ACTIVE",
    EXPIRED = "EXPIRED",
    TERMINATED = "TERMINATED",
    PENDING_RENEWAL = "PENDING_RENEWAL"
}
export interface CreateLeaseTemplateRequest {
    name: string;
    description?: string;
    state?: string;
    type?: 'STANDARD' | 'COMMERCIAL' | 'MONTH_TO_MONTH';
    content: string;
    variables: Record<string, unknown>;
    clauseIds?: string[];
    isActive?: boolean;
}
export interface UpdateLeaseTemplateRequest {
    name?: string;
    description?: string;
    state?: string;
    type?: 'STANDARD' | 'COMMERCIAL' | 'MONTH_TO_MONTH';
    content?: string;
    variables?: Record<string, unknown>;
    clauseIds?: string[];
    isActive?: boolean;
}
export interface CreateLeaseAmendmentRequest {
    leaseId: string;
    title: string;
    description: string;
    type?: 'AMENDMENT' | 'ADDENDUM' | 'RIDER';
    content: string;
    effectiveDate: string;
    signers?: Array<{
        type: 'LANDLORD' | 'TENANT' | 'GUARANTOR' | 'WITNESS';
        name: string;
        email: string;
        userId?: string;
    }>;
    autoGeneratePdf?: boolean;
    autoSendForSignature?: boolean;
}
export interface GenerateLeaseFromTemplateRequest {
    leaseId: string;
    templateId: string;
    variables: Record<string, unknown>;
    signers?: Array<{
        type: 'LANDLORD' | 'TENANT' | 'GUARANTOR' | 'WITNESS';
        name: string;
        email: string;
        userId?: string;
    }>;
    autoSendForSignature?: boolean;
}
export interface LeaseRenewalProposalRequest {
    leaseId: string;
    proposedStartDate: string;
    proposedEndDate: string;
    proposedRentAmount: number;
    notes?: string;
    offerExpiresAt?: string;
    notifyTenant?: boolean;
}
export interface SignatureRequestData {
    leaseDocumentId: string;
    signers: Array<{
        signerType: 'LANDLORD' | 'TENANT' | 'GUARANTOR' | 'WITNESS';
        name: string;
        email: string;
        userId?: string;
        order?: number;
    }>;
    provider?: 'DOCUSIGN' | 'HELLOSIGN' | 'ADOBE_SIGN';
    redirectUrl?: string;
    message?: string;
}
export interface LeaseWorkflowStatus {
    currentStatus: EnhancedLeaseStatus;
    nextPossibleStatuses: EnhancedLeaseStatus[];
    documents: LeaseDocument[];
    pendingActions: string[];
    warnings: string[];
}
export interface StatusTransitionRequest {
    newStatus: EnhancedLeaseStatus;
    reason?: string;
    skipValidation?: boolean;
    notifyParties?: boolean;
}
export interface PdfGenerationOptions {
    templateContent: string;
    variables: Record<string, unknown>;
    filename?: string;
    watermark?: string;
    documentTitle?: string;
    metadata?: Record<string, unknown>;
}
export interface PdfGenerationResult {
    url: string;
    filename: string;
    size: number;
    contentType: string;
}
export interface TemplateVariableDefinition {
    type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox' | 'array';
    required: boolean;
    label: string;
    description?: string;
    defaultValue?: unknown;
    options?: Array<{
        value: string;
        label: string;
    }>;
    validation?: {
        min?: number;
        max?: number;
        pattern?: string;
        message?: string;
    };
}
export interface TemplateVariables {
    property: {
        address: TemplateVariableDefinition;
        city: TemplateVariableDefinition;
        state: TemplateVariableDefinition;
        zipCode: TemplateVariableDefinition;
    };
    landlord: {
        name: TemplateVariableDefinition;
        address: TemplateVariableDefinition;
        email: TemplateVariableDefinition;
        phone: TemplateVariableDefinition;
    };
    tenants: {
        type: 'array';
        label: 'Tenants';
        items: {
            name: TemplateVariableDefinition;
            email: TemplateVariableDefinition;
        };
    };
    lease: {
        startDate: TemplateVariableDefinition;
        endDate: TemplateVariableDefinition;
        rentAmount: TemplateVariableDefinition;
        securityDeposit: TemplateVariableDefinition;
        lateFeeDays: TemplateVariableDefinition;
        lateFeeAmount: TemplateVariableDefinition;
    };
}
export interface LeaseManagementApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
    metadata?: {
        timestamp: string;
        version?: string;
    };
}
export interface LeaseTemplateWithClauses extends LeaseTemplate {
    clauses: Array<{
        id: string;
        order: number;
        isRequired: boolean;
        customContent?: string;
        clause: LeaseClause;
    }>;
}
export interface LeaseDocumentWithSignatures extends LeaseDocument {
    signatures: LeaseSignature[];
}
export interface LeaseWithEnhancedData {
    id: string;
    unitId: string;
    tenantId: string;
    startDate: Date;
    endDate: Date;
    rentAmount: number;
    securityDeposit: number;
    terms?: string;
    status: EnhancedLeaseStatus;
    templateId?: string;
    documentUrl?: string;
    signatureStatus: 'UNSIGNED' | 'PENDING' | 'SIGNED';
    lateFeeDays?: number;
    lateFeeAmount?: number;
    leaseTerms?: string;
    createdAt: Date;
    updatedAt: Date;
    template?: LeaseTemplate;
    documents: LeaseDocument[];
    amendments: LeaseAmendment[];
    renewals: LeaseRenewal[];
}
export declare const LeaseStatusLabels: Record<EnhancedLeaseStatus, string>;
export declare const LeaseStatusColors: Record<EnhancedLeaseStatus, string>;
export declare const SignatureStatusLabels: {
    readonly PENDING: "Pending";
    readonly SENT: "Sent";
    readonly VIEWED: "Viewed";
    readonly SIGNED: "Signed";
    readonly DECLINED: "Declined";
    readonly EXPIRED: "Expired";
};
export declare const AmendmentTypeLabels: {
    readonly AMENDMENT: "Amendment";
    readonly ADDENDUM: "Addendum";
    readonly RIDER: "Rider";
};
//# sourceMappingURL=lease-enhanced.d.ts.map