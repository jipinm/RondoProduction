import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  RefreshCw, 
  Search,
  ToggleLeft,
  ToggleRight,
  X,
  Loader2,
  ExternalLink,
  Upload
} from 'lucide-react';
import Button from '../components/Button';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ToastContainer';
import { partnersService } from '../services/partnersService';
import type { Partner, PartnerCreate, PartnerUpdate } from '../types/partners';
import styles from './PartnersManagement.module.css';

const PartnersManagement: React.FC = () => {
  // State
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Filters and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState<PartnerCreate>({
    name: '',
    logo_url: '',
    link_url: '',
    link_target: '_blank',
    status: 'active',
    position_order: 0
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');

  const { toasts, closeToast, success, error } = useToast();

  // Fetch partners
  const fetchPartners = useCallback(async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (searchTerm) filters.search = searchTerm;
      if (statusFilter) filters.status = statusFilter;

      const response = await partnersService.getPartners(filters, currentPage, 50);
      setPartners(response.data);
      setTotalPages(response.pagination.total_pages);
    } catch (err) {
      console.error('Failed to fetch partners:', err);
      error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, currentPage, error]);

  useEffect(() => {
    fetchPartners();
  }, [fetchPartners]);

  // Handle search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setCurrentPage(1);
      fetchPartners();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      logo_url: '',
      link_url: '',
      link_target: '_blank',
      status: 'active',
      position_order: 0
    });
    setLogoFile(null);
    setLogoPreview('');
    setEditingPartner(null);
  };

  // Open modal for create
  const openCreateModal = () => {
    resetForm();
    setShowModal(true);
  };

  // Open modal for edit
  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      logo_url: partner.logo_url,
      link_url: partner.link_url || '',
      link_target: partner.link_target,
      status: partner.status,
      position_order: partner.position_order
    });
    setLogoPreview(partnersService.generatePreviewUrl(partner.logo_url));
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  // Handle form input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : Number(value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Handle logo file selection
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!formData.name.trim()) {
      error('Partner name is required');
      return;
    }

    setSaving(true);

    try {
      if (editingPartner) {
        // Update existing partner
        const updateData: PartnerUpdate = {
          ...formData,
          logo: logoFile || undefined
        };
        await partnersService.updatePartner(editingPartner.id, updateData);
        success(`Partner "${formData.name}" updated successfully`);
      } else {
        // Create new partner
        const createData: PartnerCreate = {
          ...formData,
          logo: logoFile || undefined
        };
        await partnersService.createPartner(createData);
        success(`Partner "${formData.name}" created successfully`);
      }

      closeModal();
      fetchPartners();
    } catch (err: any) {
      console.error('Failed to save partner:', err);
      error(err.message || 'Failed to save partner');
    } finally {
      setSaving(false);
    }
  };

  // Handle delete
  const handleDelete = async (partner: Partner) => {
    if (!confirm(`Are you sure you want to delete "${partner.name}"?`)) {
      return;
    }

    try {
      await partnersService.deletePartner(partner.id);
      success(`Partner "${partner.name}" deleted successfully`);
      fetchPartners();
    } catch (err: any) {
      console.error('Failed to delete partner:', err);
      error(err.message || 'Failed to delete partner');
    }
  };

  // Handle toggle active/inactive status
  const handleToggleStatus = async (partner: Partner) => {
    try {
      const newStatus = partner.status === 'active' ? 'inactive' : 'active';
      await partnersService.updatePartner(partner.id, { status: newStatus });
      success(`Partner "${partner.name}" is now ${newStatus}`);
      fetchPartners();
    } catch (err: any) {
      console.error('Failed to toggle partner status:', err);
      error(err.message || 'Failed to toggle partner status');
    }
  };

  return (
    <div className={styles.container}>
      <ToastContainer toasts={toasts} onClose={closeToast} />

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>
          <Users size={28} />
          Partners Management
        </h1>
        <p className={styles.subtitle}>
          Manage partner logos and links displayed on the website
        </p>
      </div>

      {/* Actions Bar */}
      <div className={styles.actionsBar}>
        <div className={styles.searchGroup}>
          <div className={styles.searchInputWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={fetchPartners}
            disabled={loading}
            leftIcon={<RefreshCw size={18} />}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            onClick={openCreateModal}
            leftIcon={<Plus size={18} />}
          >
            Add Partner
          </Button>
        </div>
      </div>

      {/* Partners List */}
      {loading ? (
        <div className={styles.loadingState}>
          <Loader2 className={styles.spinner} size={48} />
          <p>Loading partners...</p>
        </div>
      ) : partners.length === 0 ? (
        <div className={styles.emptyState}>
          <Users size={64} className={styles.emptyIcon} />
          <h3>No Partners Found</h3>
          <p>Start by adding your first partner</p>
          <Button variant="primary" onClick={openCreateModal} leftIcon={<Plus size={18} />}>
            Add Partner
          </Button>
        </div>
      ) : (
        <div className={styles.partnersGrid}>
          {partners.map((partner) => (
            <div key={partner.id} className={styles.partnerCard}>
              <div className={styles.cardHeader}>
                <div className={styles.logoWrapper}>
                  <img 
                    src={partnersService.generatePreviewUrl(partner.logo_url)} 
                    alt={partner.name}
                    className={styles.partnerLogo}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/placeholder-partner.png';
                    }}
                  />
                </div>
                <div className={styles.statusBadge} data-status={partner.status}>
                  {partner.status === 'active' ? 'Active' : 'Inactive'}
                </div>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.partnerName}>{partner.name}</h3>
                {partner.link_url && (
                  <div className={styles.partnerLink}>
                    <ExternalLink size={14} />
                    <span className={styles.linkText}>{partner.link_url}</span>
                    <span className={styles.linkTarget}>({partner.link_target === '_blank' ? 'New Tab' : 'Current Tab'})</span>
                  </div>
                )}
                <div className={styles.partnerMeta}>
                  <span>Position: {partner.position_order}</span>
                  {partner.created_by_name && <span>By: {partner.created_by_name}</span>}
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  onClick={() => handleToggleStatus(partner)}
                  className={styles.iconButton}
                  title={partner.status === 'active' ? 'Deactivate' : 'Activate'}
                >
                  {partner.status === 'active' ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                </button>
                <button
                  onClick={() => openEditModal(partner)}
                  className={styles.iconButton}
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => handleDelete(partner)}
                  className={styles.iconButton}
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="secondary"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingPartner ? 'Edit Partner' : 'Add Partner'}</h2>
              <button onClick={closeModal} className={styles.closeButton}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.modalForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name" className={styles.label}>
                  Partner Name <span className={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Partner Logo</label>
                <div className={styles.logoUploadWrapper}>
                  {logoPreview ? (
                    <div className={styles.logoPreviewContainer}>
                      <img src={logoPreview} alt="Logo preview" className={styles.logoPreviewImage} />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview('');
                          setFormData(prev => ({ ...prev, logo_url: '' }));
                        }}
                        className={styles.removeLogoButton}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ) : (
                    <label className={styles.logoUploadLabel}>
                      <Upload size={32} />
                      <span>Click to upload logo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className={styles.fileInput}
                      />
                    </label>
                  )}
                </div>
                <div className={styles.hints}>
                  <p className={styles.hint}>
                    <strong>Recommended Dimensions:</strong> 512 × 512 px
                  </p>
                  <p className={styles.hint}>Supported formats: JPEG, PNG, SVG, WebP, AVIF (Max 5MB)</p>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="link_url" className={styles.label}>
                  Link URL
                </label>
                <input
                  type="url"
                  id="link_url"
                  name="link_url"
                  value={formData.link_url}
                  onChange={handleInputChange}
                  className={styles.input}
                  placeholder="https://partner-website.com"
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="link_target" className={styles.label}>
                  Open In
                </label>
                <select
                  id="link_target"
                  name="link_target"
                  value={formData.link_target}
                  onChange={handleInputChange}
                  className={styles.select}
                >
                  <option value="_blank">New Tab</option>
                  <option value="_self">Current Tab</option>
                </select>
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label htmlFor="status" className={styles.label}>
                    Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className={styles.select}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="position_order" className={styles.label}>
                    Display Order
                  </label>
                  <input
                    type="number"
                    id="position_order"
                    name="position_order"
                    value={formData.position_order}
                    onChange={handleInputChange}
                    className={styles.input}
                    min="0"
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={saving}
                  leftIcon={saving ? <Loader2 className={styles.spinner} size={18} /> : undefined}
                >
                  {saving ? 'Saving...' : editingPartner ? 'Update Partner' : 'Create Partner'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnersManagement;
