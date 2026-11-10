import type { PropertyStatus } from "#types/core";

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
	/**
	 * properties.property_type as stored (free text): shown through
	 * propertyTypeLabel and matched through toPropertyType, so a value outside
	 * the form's set reads as written and never as another type.
	 */
	propertyType: string;
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

export interface AddUnitPanelProps {
	isOpen: boolean;
	propertyId: string;
	isSubmitting?: boolean;
	onClose: () => void;
	onSubmit: (data: UnitFormData) => void;
}

export interface UnitFormData {
	unitNumber: string;
	bedrooms: number;
	bathrooms: number;
	sqft: number;
	rentAmount: number;
	status: "available" | "maintenance";
}
