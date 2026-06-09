// Partner types and interfaces for admin application

export interface Partner {
  id: number;
  name: string;
  logo_url: string;
  link_url?: string;
  link_target: '_self' | '_blank';
  status: 'active' | 'inactive';
  position_order: number;
  created_by?: number;
  updated_by?: number;
  created_by_name?: string;
  updated_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface PartnerCreate {
  name: string;
  logo_url?: string; // Made optional since it can be auto-generated from uploaded logo
  link_url?: string;
  link_target?: '_self' | '_blank';
  status?: 'active' | 'inactive';
  position_order?: number;
  logo?: File; // Optional file upload
}

export interface PartnerUpdate {
  name?: string;
  logo_url?: string;
  link_url?: string;
  link_target?: '_self' | '_blank';
  status?: 'active' | 'inactive';
  position_order?: number;
  logo?: File; // Optional file upload
}

export interface PartnersFilters {
  search?: string;
  status?: 'active' | 'inactive';
}

export interface PartnersPagination {
  current_page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface PartnersResponse {
  success: boolean;
  data: Partner[];
  pagination: PartnersPagination;
  filters_applied?: PartnersFilters;
}

export interface PartnerResponse {
  success: boolean;
  data: Partner;
  message?: string;
}

export interface PartnerDeleteResponse {
  success: boolean;
  message: string;
}

export interface PartnerUploadResponse {
  success: boolean;
  data: {
    filename: string;
    url: string;
  };
  message?: string;
}

// Public partner types (for frontend display)
export interface PublicPartner {
  id: number;
  name: string;
  logo_url: string;
  link_url?: string;
  link_target: '_self' | '_blank';
  position_order: number;
}

export interface PublicPartnersResponse {
  success: boolean;
  data: PublicPartner[];
}

// Error types
export interface PartnerFieldError {
  field: string;
  message: string;
}

export interface PartnerError {
  success: false;
  error: string;
  field_errors?: PartnerFieldError[];
}

// Form validation types
export interface PartnerFormData {
  name: string;
  logo_url: string;
  link_url: string;
  link_target: '_self' | '_blank';
  position_order: number;
  status: 'active' | 'inactive';
}

export interface PartnerFormErrors {
  name?: string;
  logo_url?: string;
  link_url?: string;
  link_target?: string;
  position_order?: string;
  status?: string;
  file?: string;
}

// Constants for select options
export const PARTNER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' }
] as const;

export const LINK_TARGETS = [
  { value: '_self', label: 'Same Window / Current Tab' },
  { value: '_blank', label: 'New Window / New Tab' }
] as const;

// Utility types
export type PartnerStatus = Partner['status'];
export type LinkTarget = Partner['link_target'];
