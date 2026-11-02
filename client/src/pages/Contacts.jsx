import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  Plus,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import { contactService } from '../services/contactService';
import { formatDateTime } from '../utils/formatters';

export default function Contacts() {
  const navigate = useNavigate();
  const location = useLocation();

  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 10, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [syncStatus, setSyncStatus] = useState('');
  const [successToast, setSuccessToast] = useState(location.state?.successMessage || '');

  // Delete modal state
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchContacts = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = {
        page,
        limit: 10,
        q: search,
      };
      if (syncStatus) params.syncStatus = syncStatus;

      const res = await contactService.getContacts(params);
      if (res?.data) {
        setContacts(res.data.contacts || []);
        if (res.data.pagination) {
          setPagination(res.data.pagination);
        }
      }
    } catch (err) {
      console.error('Error fetching contacts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts(1);
  }, [syncStatus]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchContacts(1);
  };

  const handleDeleteConfirm = async () => {
    if (!contactToDelete) return;
    setIsDeleting(true);
    try {
      await contactService.deleteContact(contactToDelete.id);
      setSuccessToast(`Contact "${contactToDelete.fullName}" was removed.`);
      setContactToDelete(null);
      fetchContacts(pagination.page);
    } catch (err) {
      console.error('Error deleting contact', err);
      alert('Failed to delete contact.');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Full Name',
      accessor: 'fullName',
      render: (row) => (
        <div
          onClick={() => navigate(`/contacts/${row.id}`)}
          style={{ cursor: 'pointer' }}
        >
          <span style={{ fontWeight: 700, color: '#2563eb' }}>{row.fullName}</span>
          {row.designation && (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.designation}</div>
          )}
        </div>
      ),
    },
    {
      header: 'Company',
      accessor: 'company',
      render: (row) => row.company?.name || '—',
    },
    {
      header: 'Phone Numbers',
      accessor: 'phone',
      render: (row) => (
        <div>
          <div style={{ fontWeight: 500 }}>{row.phone || '—'}</div>
          {row.alternatePhone && (
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Alt: {row.alternatePhone}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row) => row.email || '—',
    },
    {
      header: 'Google Sheets',
      accessor: 'sheetsSyncs',
      render: (row) => {
        const sync = row.sheetsSyncs?.[0];
        const status = sync?.status || 'PENDING';
        return (
          <span
            className={`badge ${
              status === 'SYNCED'
                ? 'badge-success'
                : status === 'FAILED'
                ? 'badge-danger'
                : 'badge-warning'
            }`}
          >
            {status}
          </span>
        );
      },
    },
    {
      header: 'Added On',
      accessor: 'createdAt',
      render: (row) => formatDateTime(row.createdAt),
    },
    {
      header: 'Actions',
      width: '120px',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => navigate(`/contacts/${row.id}`)}
            className="btn btn-secondary btn-sm"
            title="View Details"
            style={{ padding: '6px' }}
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => setContactToDelete(row)}
            className="btn btn-secondary btn-sm"
            title="Delete Contact"
            style={{ padding: '6px', color: '#ef4444' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="content-wrapper">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Contact Directory</h1>
          <p>Search, manage, and export digitized business contacts</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => contactService.downloadExport('csv')}
            className="btn btn-secondary btn-sm"
            title="Export full list as CSV spreadsheet"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => contactService.downloadExport('vcf')}
            className="btn btn-secondary btn-sm"
            title="Export as vCard (.vcf) for phone/Google Contacts import"
          >
            <Download size={15} />
            <span>Export VCF</span>
          </button>

          <button
            onClick={() => navigate('/scanner')}
            className="btn btn-primary btn-sm"
          >
            <Plus size={15} />
            <span>Scan New Card</span>
          </button>
        </div>
      </div>

      {/* Success Banner */}
      {successToast && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '10px',
            color: '#065f46',
            fontSize: '0.88rem',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast('')} style={{ color: '#065f46' }}>
            ×
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flex: '1',
            minWidth: '240px',
          }}
        >
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type="text"
              className="form-input"
              style={{ paddingLeft: '38px' }}
              placeholder="Search by name, company, email, or phone number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-sm">
            Search
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Filter size={16} style={{ color: '#64748b' }} />
          <select
            className="form-select"
            style={{ width: 'auto', padding: '8px 12px', fontSize: '0.85rem' }}
            value={syncStatus}
            onChange={(e) => setSyncStatus(e.target.value)}
          >
            <option value="">All Sync States</option>
            <option value="SYNCED">Google Sheets: SYNCED</option>
            <option value="PENDING">Google Sheets: PENDING</option>
            <option value="FAILED">Google Sheets: FAILED</option>
          </select>
        </div>
      </div>

      {/* Contacts Data Table */}
      <DataTable
        columns={columns}
        data={contacts}
        isLoading={isLoading}
        emptyMessage="No contacts match your query."
        pagination={pagination}
        onPageChange={(page) => fetchContacts(page)}
      />

      {/* Soft Delete Confirmation Modal */}
      {contactToDelete && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Confirm Delete Contact
              </h3>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.9rem', color: '#475569' }}>
                Are you sure you want to delete{' '}
                <strong>{contactToDelete.fullName}</strong>?
              </p>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '6px' }}>
                This record will be soft-deleted to preserve scan and audit history.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="btn btn-danger btn-sm"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Soft Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

