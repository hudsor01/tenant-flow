import type { LeaseRow } from '@/data/leases-schema'

export const leasesData: LeaseRow[] = [
	{
		id: 1,
		tenantName: 'Sophia Martinez',
		propertyName: 'Maple Grove Apartments',
		unitNumber: 'A-102',
		rentAmount: 1850,
		startDate: '2025-01-01T00:00:00Z',
		endDate: '2025-12-31T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 2,
		tenantName: 'Liam Johnson',
		propertyName: 'Cedar Park Townhomes',
		unitNumber: 'TH-5',
		rentAmount: 2400,
		startDate: '2024-10-01T00:00:00Z',
		endDate: '2025-09-30T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 3,
		tenantName: 'Ava Chen',
		propertyName: 'Oak Ridge Flats',
		unitNumber: '3B',
		rentAmount: 1600,
		startDate: '2024-09-15T00:00:00Z',
		endDate: '2025-09-14T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 4,
		tenantName: 'Noah Williams',
		propertyName: 'Lakeside Villas',
		unitNumber: '12',
		rentAmount: 2100,
		startDate: '2023-08-01T00:00:00Z',
		endDate: '2024-07-31T00:00:00Z',
		status: 'EXPIRED'
	},
	{
		id: 5,
		tenantName: 'Emma Davis',
		propertyName: 'Sunset Heights',
		unitNumber: '7C',
		rentAmount: 1750,
		startDate: '2024-04-01T00:00:00Z',
		endDate: '2025-03-31T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 6,
		tenantName: 'Oliver Brown',
		propertyName: 'Riverside Lofts',
		unitNumber: '5F',
		rentAmount: 1950,
		startDate: '2024-11-01T00:00:00Z',
		endDate: '2025-10-31T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 7,
		tenantName: 'Mia Patel',
		propertyName: 'Cedar Park Townhomes',
		unitNumber: 'TH-2',
		rentAmount: 2300,
		startDate: '2024-06-01T00:00:00Z',
		endDate: '2025-05-31T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 8,
		tenantName: 'James Thompson',
		propertyName: 'Maple Grove Apartments',
		unitNumber: 'C-301',
		rentAmount: 1650,
		startDate: '2023-07-01T00:00:00Z',
		endDate: '2024-06-30T00:00:00Z',
		status: 'TERMINATED'
	},
	{
		id: 9,
		tenantName: 'Isabella Garcia',
		propertyName: 'Oak Ridge Flats',
		unitNumber: '1A',
		rentAmount: 1550,
		startDate: '2024-02-01T00:00:00Z',
		endDate: '2025-01-31T00:00:00Z',
		status: 'ACTIVE'
	},
	{
		id: 10,
		tenantName: 'Ethan Nguyen',
		propertyName: 'Lakeside Villas',
		unitNumber: '9',
		rentAmount: 2050,
		startDate: '2023-12-01T00:00:00Z',
		endDate: '2024-11-30T00:00:00Z',
		status: 'EXPIRED'
	}
]
