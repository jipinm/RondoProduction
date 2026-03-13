import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Save, X, Loader2, Upload, Image } from 'lucide-react';
import whyRondoService, { type WhyRondoItem } from '../services/whyRondoService';
import styles from './WhyRondoManager.module.css';

const FALLBACK_ICON = 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22 fill=%22%23ccc%22 viewBox=%220 0 16 16%22%3E%3Cpath d=%22M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z%22/%3E%3Cpath d=%22M2.002 1a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-12zm12 1a1 1 0 0 1 1 1v6.5l-3.777-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12V3a1 1 0 0 1 1-1h12z%22/%3E%3C/svg%3E';

const WhyRondoManager: React.FC = () => {
  const [items, setItems] = useState<WhyRondoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<WhyRondoItem>>({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const response = await whyRondoService.getAllItems();
      if (response.success) {
        setItems(response.data);
      } else {
        setError(response.error || 'Failed to fetch items');
      }
    } catch (err) {
      setError('An error occurred while fetching items');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: WhyRondoItem) => {
    setEditingId(item.id);
    setEditForm({ ...item });
    setIconFile(null);
    setIconPreview(item.icon_url || null);
    setShowAddForm(false);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
    setShowAddForm(false);
    setIconFile(null);
    setIconPreview(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIconFile(file);
    setIconPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!editForm.title || !editForm.description) {
      alert('Title and description are required');
      return;
    }
    // Require an icon: either an existing one (edit) or a new file (create)
    if (!editingId && !iconFile) {
      alert('Please upload an icon image');
      return;
    }

    setSaving(true);
    try {
      let itemId = editingId;

      if (editingId) {
        // Update text fields
        const res = await whyRondoService.updateItem(editingId, {
          title: editForm.title,
          description: editForm.description,
          position_order: editForm.position_order,
          status: editForm.status,
        });
        if (!res.success) {
          alert(res.error || 'Failed to update item');
          return;
        }
      } else {
        // Create the record first
        const res = await whyRondoService.createItem({
          title: editForm.title,
          description: editForm.description,
          position_order: editForm.position_order ?? items.length + 1,
          status: editForm.status ?? 'active',
        });
        if (!res.success) {
          alert(res.error || 'Failed to create item');
          return;
        }
        itemId = res.data.id;
      }

      // Upload the icon file if one was selected
      if (iconFile && itemId) {
        const uploadRes = await whyRondoService.uploadIcon(itemId, iconFile);
        if (!uploadRes.success) {
          alert('Item saved but icon upload failed: ' + uploadRes.error);
        }
      }

      await fetchItems();
      handleCancel();
    } catch (err) {
      alert('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const response = await whyRondoService.deleteItem(id);
      if (response.success) {
        setItems(prev => prev.filter(item => item.id !== id));
      } else {
        alert(response.error || 'Failed to delete item');
      }
    } catch (err) {
      alert('An error occurred while deleting');
    }
  };

  if (loading) {
    return <div className={styles.loading}><Loader2 className={styles.spinner} /> Loading Why Rondo Sports data...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Manage Why Rondo Sports Section</h3>
        {!showAddForm && !editingId && (
          <button className={styles.addButton} onClick={() => { setShowAddForm(true); setEditForm({ status: 'active', position_order: items.length + 1 }); setIconFile(null); setIconPreview(null); }}>
            <Plus size={18} /> Add New Item
          </button>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {(showAddForm || editingId) && (
        <div className={styles.formCard}>
          <h4>{editingId ? 'Edit Item' : 'Add New Item'}</h4>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label>Title *</label>
              <input name="title" value={editForm.title || ''} onChange={handleChange} placeholder="e.g. Official Reseller" />
            </div>
            <div className={styles.formGroup}>
              <label>Position Order</label>
              <input type="number" name="position_order" value={editForm.position_order || 0} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select name="status" value={editForm.status || 'active'} onChange={handleChange}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            {/* Icon Upload */}
            <div className={styles.formGroup}>
              <label>Icon Image {!editingId && '*'}</label>
              <div className={styles.uploadArea} onClick={() => fileInputRef.current?.click()}>
                {iconPreview ? (
                  <img src={iconPreview} alt="Icon preview" className={styles.uploadPreview} />
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <Upload size={24} />
                    <span>Click to upload</span>
                    <span className={styles.uploadHint}>JPEG, PNG, SVG, WebP, AVIF &mdash; max 5 MB</span>
                  </div>
                )}
                {iconPreview && (
                  <div className={styles.uploadOverlay}>
                    <Image size={16} /> Change image
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp,image/avif"
                onChange={handleFileChange}
                className={styles.hiddenInput}
              />
              {iconFile && <p className={styles.uploadFilename}>{iconFile.name}</p>}
            </div>
            <div className={styles.formGroupFull}>
              <label>Description *</label>
              <textarea name="description" value={editForm.description || ''} onChange={handleChange} rows={3} placeholder="Brief description of the feature..." />
            </div>
          </div>
          <div className={styles.formActions}>
            <button className={styles.saveButton} onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className={styles.spinner} size={16} /> : <Save size={16} />} Save
            </button>
            <button className={styles.cancelButton} onClick={handleCancel}>
              <X size={16} /> Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.itemsGrid}>
        {items.map(item => (
          <div key={item.id} className={`${styles.itemCard} ${item.status === 'inactive' ? styles.inactive : ''}`}>
            <div className={styles.itemHeader}>
              <div className={styles.iconPreview}>
                <img src={item.icon_url || FALLBACK_ICON} alt="" onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_ICON; }} />
              </div>
              <div className={styles.itemTitle}>
                {item.title}
                <span className={styles.badge}>{item.status}</span>
              </div>
              <div className={styles.itemActions}>
                <button onClick={() => handleEdit(item)} title="Edit"><Edit2 size={16} /></button>
                <button onClick={() => handleDelete(item.id)} title="Delete" className={styles.deleteBtn}><Trash2 size={16} /></button>
              </div>
            </div>
            <p className={styles.itemDesc}>{item.description}</p>
            <div className={styles.itemFooter}>
              <span>Order: {item.position_order}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && !showAddForm && <div className={styles.empty}>No items found. Create one to get started.</div>}
      </div>
    </div>
  );
};

export default WhyRondoManager;
