import type { PropertyStatus, UnitStatus } from "#types/core";

export type DesignPropertyType =
	| "single_family"
	| "multi_family"
	| "apartment"
	| "condo"
	| "townhouse";

export interface PropertyImage {
	id: string;
	url: string;
	displayOrder: number;
}

export interface UnitTenant {
	id: string;
	name: string;
	email: string;
	leaseEndDate: string;
}

export interface DesignUnit {
	id: string;
	unitNumber: string;
	bedrooms: number;
	bathrooms: number;
	sqft: number;
	rentAmount: number;
	status: UnitStatus;
	tenant: UnitTenant | null;
}

export interface DesignProperty {
	id: string;
	name: string;
	addressLine1: string;
	addressLine2: string | null;
	city: string;
	state: string;
	postalCode: string;
	propertyType: DesignPropertyType;
	status: PropertyStatus;
	images: PropertyImage[];
	totalUnits: number;
	occupiedUnits: number;
	availableUnits: number;
	maintenanceUnits: number;
	occupancyRate: number;
	monthlyRevenue: number;
	units: DesignUnit[];
}

export interface PortfolioSummary {
	totalProperties: number;
	totalUnits: number;
	occupiedUnits: number;
	availableUnits: number;
	maintenanceUnits: number;
	overallOccupancyRate: number;
	totalMonthlyRevenue: number;
}

export type PropertiesSummary = PortfolioSummary;

export interface PropertyItem {
	id: string;
	name: string;
	addressLine1: string;
	addressLine2: string | null;
	city: string;
	state: string;
	postalCode: string;
	propertyType: DesignPropertyType;
	status: PropertyStatus;
	imageUrl: string | undefined;
	totalUnits: number;
	occupiedUnits: number;
	availableUnits: number;
	maintenanceUnits: number;
	occupancyRate: number;
	monthlyRevenue: number;
}

export interface PropertiesProps {
	properties: PropertyItem[];
	summary: PortfolioSummary;
	filter?: "all" | "occupied" | "available" | "maintenance";
	isLoading?: boolean;
	onPropertyClick?: (id: string) => void;
	onPropertyEdit?: (id: string) => void;
	onPropertyDelete?: (id: string) => void;
	onAddProperty?: () => void;
	onFilterChange?: (
		filter: "all" | "occupied" | "available" | "maintenance",
	) => void;
}

export interface PropertiesListProps {
	properties: DesignProperty[];
	summary: PortfolioSummary;
	filter?: "all" | "occupied" | "available" | "maintenance";
	isLoading?: boolean;
	onPropertyClick?: (id: string) => void;
	onPropertyEdit?: (id: string) => void;
	onPropertyDelete?: (id: string) => void;
	onAddProperty?: () => void;
	onFilterChange?: (
		filter: "all" | "occupied" | "available" | "maintenance",
	) => void;
}

export interface PropertyDetailProps {
	property: DesignProperty;
	isLoading?: boolean;
	onPropertyEdit?: () => void;
	onPropertyDelete?: () => void;
	onAddUnit?: () => void;
	onUnitClick?: (unitId: string) => void;
	onUnitEdit?: (unitId: string) => void;
	onUnitDelete?: (unitId: string) => void;
	onBack?: () => void;
}

export interface AddPropertyModalProps {
	isOpen: boolean;
	isSubmitting?: boolean;
	onClose: () => void;
	onSubmit: (data: PropertyFormData) => void;
}

export interface AddUnitPanelProps {
	isOpen: boolean;
	propertyId: string;
	isSubmitting?: boolean;
	onClose: () => void;
	onSubmit: (data: UnitFormData) => void;
}

export interface PropertyFormData {
	name: string;
	addressLine1: string;
	addressLine2?: string;
	city: string;
	state: string;
	postalCode: string;
	propertyType: DesignPropertyType;
	image?: File;
}

export interface UnitFormData {
	unitNumber: string;
	bedrooms: number;
	bathrooms: number;
	sqft: number;
	rentAmount: number;
	status: "available" | "maintenance";
}
