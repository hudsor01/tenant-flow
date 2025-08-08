import { Locale } from './config';

// Dictionary type for type safety
export type Dictionary = {
  common: {
    save: string;
    cancel: string;
    delete: string;
    edit: string;
    add: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    confirm: string;
    yes: string;
    no: string;
  };
  navigation: {
    dashboard: string;
    properties: string;
    tenants: string;
    maintenance: string;
    reports: string;
    settings: string;
  };
  properties: {
    title: string;
    addProperty: string;
    editProperty: string;
    propertyDetails: string;
    units: string;
    address: string;
    type: string;
    status: string;
    totalUnits: string;
    occupiedUnits: string;
    vacantUnits: string;
  };
  tenants: {
    title: string;
    addTenant: string;
    editTenant: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    leaseStart: string;
    leaseEnd: string;
    rentAmount: string;
    deposit: string;
  };
  maintenance: {
    title: string;
    newRequest: string;
    priority: string;
    status: string;
    description: string;
    assignedTo: string;
    createdAt: string;
    completedAt: string;
  };
  errors: {
    notFound: string;
    serverError: string;
    unauthorized: string;
    validation: string;
    network: string;
  };
};

// English dictionary (default)
const enDict: Dictionary = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    confirm: 'Confirm',
    yes: 'Yes',
    no: 'No',
  },
  navigation: {
    dashboard: 'Dashboard',
    properties: 'Properties',
    tenants: 'Tenants',
    maintenance: 'Maintenance',
    reports: 'Reports',
    settings: 'Settings',
  },
  properties: {
    title: 'Properties',
    addProperty: 'Add Property',
    editProperty: 'Edit Property',
    propertyDetails: 'Property Details',
    units: 'Units',
    address: 'Address',
    type: 'Type',
    status: 'Status',
    totalUnits: 'Total Units',
    occupiedUnits: 'Occupied Units',
    vacantUnits: 'Vacant Units',
  },
  tenants: {
    title: 'Tenants',
    addTenant: 'Add Tenant',
    editTenant: 'Edit Tenant',
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    leaseStart: 'Lease Start',
    leaseEnd: 'Lease End',
    rentAmount: 'Rent Amount',
    deposit: 'Security Deposit',
  },
  maintenance: {
    title: 'Maintenance',
    newRequest: 'New Request',
    priority: 'Priority',
    status: 'Status',
    description: 'Description',
    assignedTo: 'Assigned To',
    createdAt: 'Created At',
    completedAt: 'Completed At',
  },
  errors: {
    notFound: 'Resource not found',
    serverError: 'Internal server error',
    unauthorized: 'Unauthorized access',
    validation: 'Validation error',
    network: 'Network error',
  },
};

// Spanish dictionary
const esDict: Dictionary = {
  common: {
    save: 'Guardar',
    cancel: 'Cancelar',
    delete: 'Eliminar',
    edit: 'Editar',
    add: 'Agregar',
    search: 'Buscar',
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    confirm: 'Confirmar',
    yes: 'Sí',
    no: 'No',
  },
  navigation: {
    dashboard: 'Tablero',
    properties: 'Propiedades',
    tenants: 'Inquilinos',
    maintenance: 'Mantenimiento',
    reports: 'Informes',
    settings: 'Configuración',
  },
  properties: {
    title: 'Propiedades',
    addProperty: 'Agregar Propiedad',
    editProperty: 'Editar Propiedad',
    propertyDetails: 'Detalles de la Propiedad',
    units: 'Unidades',
    address: 'Dirección',
    type: 'Tipo',
    status: 'Estado',
    totalUnits: 'Total de Unidades',
    occupiedUnits: 'Unidades Ocupadas',
    vacantUnits: 'Unidades Vacantes',
  },
  tenants: {
    title: 'Inquilinos',
    addTenant: 'Agregar Inquilino',
    editTenant: 'Editar Inquilino',
    firstName: 'Nombre',
    lastName: 'Apellido',
    email: 'Correo Electrónico',
    phone: 'Teléfono',
    leaseStart: 'Inicio del Contrato',
    leaseEnd: 'Fin del Contrato',
    rentAmount: 'Monto de Renta',
    deposit: 'Depósito de Seguridad',
  },
  maintenance: {
    title: 'Mantenimiento',
    newRequest: 'Nueva Solicitud',
    priority: 'Prioridad',
    status: 'Estado',
    description: 'Descripción',
    assignedTo: 'Asignado a',
    createdAt: 'Creado el',
    completedAt: 'Completado el',
  },
  errors: {
    notFound: 'Recurso no encontrado',
    serverError: 'Error interno del servidor',
    unauthorized: 'Acceso no autorizado',
    validation: 'Error de validación',
    network: 'Error de red',
  },
};

// Dictionary map
const dictionaries = {
  en: enDict,
  es: esDict,
  fr: enDict, // TODO: Add French translations
  de: enDict, // TODO: Add German translations
} as const;

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return dictionaries[locale] || dictionaries.en;
}