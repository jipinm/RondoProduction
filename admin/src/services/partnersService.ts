/**
 * Partners API Service
 * Handles all partner-related API operations for the admin panel
 */

import { apiClient } from './api-client';
import type {
  Partner,
  PartnerCreate,
  PartnerUpdate,
  PartnersFilters,
  PartnersResponse,
  PartnerUploadResponse,
  PublicPartnersResponse,
  PartnerError
} from '../types/partners';

export class PartnersService {
  private baseUrl = '/admin/partners';

  /**
   * Get all partners with filtering and pagination
   */
  async getPartners(
    filters: PartnersFilters = {},
    page = 1,
    perPage = 20
  ): Promise<PartnersResponse> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        per_page: perPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '')
        )
      });

      console.log('🔍 Fetching partners with params:', params.toString());

      const response = await apiClient.get<PartnersResponse>(`${this.baseUrl}?${params}`);
      
      if (!response.success) {
        throw new Error('Failed to fetch partners');
      }

      console.log('✅ Partners fetched successfully:', {
        count: response.data?.length || 0,
        total: response.pagination?.total || 0,
        filters: response.filters_applied
      });

      return response;
    } catch (error: any) {
      console.error('❌ Error fetching partners:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get a single partner by ID
   */
  async getPartner(id: number): Promise<Partner> {
    try {
      console.log('🔍 Fetching partner with ID:', id);

      const response = await apiClient.get<{ success: boolean; data: Partner; error?: string }>(`${this.baseUrl}/${id}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch partner');
      }

      console.log('✅ Partner fetched successfully:', response.data.name);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching partner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Create a new partner
   */
  async createPartner(partnerData: PartnerCreate): Promise<Partner> {
    try {
      console.log('🔨 Creating partner:', partnerData.name);

      // Extract the file for separate upload
      const logoFile = partnerData.logo;
      
      // Create partner data without the file
      const cleanData = { ...partnerData };
      if ('logo' in cleanData) {
        delete (cleanData as any).logo; // Remove file object
      }

      // Set default logo URL if not provided
      if (!cleanData.logo_url) {
        cleanData.logo_url = '/images/partners/placeholder.png';
      }

      // Create the partner first
      const response = await apiClient.post<{ success: boolean; data: Partner; error?: string }>(this.baseUrl, cleanData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to create partner');
      }

      console.log('✅ Partner created successfully:', response.data.id);
      
      // If there's a logo file, upload it
      if (logoFile && logoFile instanceof File) {
        try {
          console.log('📤 Uploading logo for partner:', response.data.id);
          await this.uploadPartnerLogo(response.data.id, logoFile);
          console.log('✅ Logo uploaded successfully');
          
          // Return the updated partner with the new logo
          return await this.getPartner(response.data.id);
        } catch (uploadError: any) {
          console.warn('⚠️ Partner created but logo upload failed:', uploadError.message);
          // Return the partner even if logo upload fails
          return response.data;
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Error creating partner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Update an existing partner
   */
  async updatePartner(id: number, partnerData: PartnerUpdate): Promise<Partner> {
    try {
      console.log('🔧 Updating partner:', id);

      // Extract the file for separate upload
      const logoFile = partnerData.logo;
      
      // Create update data without the file
      const cleanData = { ...partnerData };
      if ('logo' in cleanData) {
        delete (cleanData as any).logo; // Remove file object
      }

      // Update the partner first
      const response = await apiClient.put<{ success: boolean; data: Partner; error?: string }>(`${this.baseUrl}/${id}`, cleanData);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update partner');
      }

      console.log('✅ Partner updated successfully:', response.data.name);
      
      // If there's a logo file, upload it
      if (logoFile && logoFile instanceof File) {
        try {
          console.log('📤 Uploading new logo for partner:', id);
          await this.uploadPartnerLogo(id, logoFile);
          console.log('✅ Logo uploaded successfully');
          
          // Return the updated partner with the new logo
          return await this.getPartner(id);
        } catch (uploadError: any) {
          console.warn('⚠️ Partner updated but logo upload failed:', uploadError.message);
          // Return the partner even if logo upload fails
          return response.data;
        }
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Error updating partner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Delete a partner
   */
  async deletePartner(id: number): Promise<void> {
    try {
      console.log('🗑️ Deleting partner:', id);

      const response = await apiClient.delete<{ success: boolean; message?: string; error?: string }>(`${this.baseUrl}/${id}`);
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete partner');
      }

      console.log('✅ Partner deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting partner:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Upload partner logo
   */
  async uploadPartnerLogo(
    partnerId: number,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    try {
      console.log('📤 Uploading logo for partner:', partnerId, 'File:', file.name);

      // Validate file before upload
      this.validateImageFile(file);

      const formData = new FormData();
      formData.append('logo', file);

      // Use postFormData method from API client
      const response = await apiClient.postFormData<PartnerUploadResponse>(
        `${this.baseUrl}/${partnerId}/upload-logo`,
        formData
      );

      if (!response.success) {
        const errorMsg = 'error' in response ? String(response.error) : 'Failed to upload partner logo';
        throw new Error(errorMsg);
      }

      console.log('✅ Partner logo uploaded successfully:', response.data.filename);
      if (onProgress) {
        onProgress(100);
      }
    } catch (error: any) {
      console.error('❌ Error uploading partner logo:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get public partners (for frontend preview)
   */
  async getPublicPartners(limit = 50): Promise<PublicPartnersResponse> {
    try {
      console.log('🌐 Fetching public partners');

      const response = await apiClient.get<PublicPartnersResponse>(`/api/v1/partners?limit=${limit}`);
      
      if (!response.success) {
        const errorMsg = 'error' in response ? String(response.error) : 'Failed to fetch public partners';
        throw new Error(errorMsg);
      }

      console.log('✅ Public partners fetched successfully:', response.data.length);
      return response;
    } catch (error: any) {
      console.error('❌ Error fetching public partners:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Validate image file before upload
   */
  private validateImageFile(file: File): void {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/svg+xml',
      'image/webp',
      'image/avif'
    ];

    if (file.size > maxSize) {
      throw new Error('File size exceeded. Maximum allowed size is 5MB');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file format. Allowed formats: JPEG, JPG, PNG, SVG, WebP, AVIF');
    }

    // Check file extension as additional validation
    const extension = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'svg', 'webp', 'avif'];
    
    if (!extension || !allowedExtensions.includes(extension)) {
      throw new Error('Invalid file extension. Allowed extensions: .jpg, .jpeg, .png, .svg, .webp, .avif');
    }
  }

  /**
   * Handle API errors with proper error formatting
   */
  private handleError(error: any): Error {
    if (error.response?.data) {
      const errorData = error.response.data as PartnerError;
      
      if (errorData.field_errors && errorData.field_errors.length > 0) {
        // Create validation error with field details
        const fieldMessages = errorData.field_errors
          .map(fe => `${fe.field}: ${fe.message}`)
          .join(', ');
        
        const validationError = new Error(`Validation failed: ${fieldMessages}`) as any;
        validationError.fieldErrors = Object.fromEntries(
          errorData.field_errors.map(fe => [fe.field, fe.message])
        );
        validationError.isValidationError = true;
        
        return validationError;
      }
      
      return new Error(errorData.error || 'An error occurred');
    }

    if (error.message) {
      return new Error(error.message);
    }

    return new Error('An unexpected error occurred');
  }

  /**
   * Generate preview URL for partner logo
   */
  generatePreviewUrl(logoUrl: string): string {
    if (logoUrl.startsWith('http')) {
      return logoUrl;
    }
    
    // Assume relative URLs are from our API
    return `${import.meta.env.VITE_API_URL}${logoUrl}`;
  }

  /**
   * Get available partner statuses for dropdown
   */
  getPartnerStatuses() {
    return [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' }
    ];
  }

  /**
   * Get link target options for dropdown
   */
  getLinkTargets() {
    return [
      { value: '_self', label: 'Same Window / Current Tab' },
      { value: '_blank', label: 'New Window / New Tab' }
    ];
  }
}

// Export singleton instance
export const partnersService = new PartnersService();
export default partnersService;
