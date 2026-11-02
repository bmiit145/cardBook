import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Users, Search, Plus, Globe, MapPin, X, ArrowRight } from 'lucide-react';
import DataTable from '../components/DataTable';
import { companyService } from '../services/companyService';

export default function Companies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Add Company Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    website: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
  });
  const [modalError, setModalError] = useState('');

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const res = await companyService.getCompanies(search);
      if (res?.data?.companies) {
        setCompanies(res.data.companies);
      }
    } catch (err) {
      console.error('Error fetching companies', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [search]);

  const handleCreateCompany = async (e) => {
    e.preventDefault();
    setModalError('');
    try {
      await companyService.createCompany(newCompany);
      setIsAddModalOpen(false);
      setNewCompany({ name: '', website: '', address: '', city: '', state: '', country: 'India' });
      fetchCompanies();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to create company');
    }
  };

  const columns = [
    {
      header: 'Company Name',
      accessor: 'name',
      render: (row) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Building2 size={16} />
          </div>
          <div>
            <span style={{ fontWeight: 700, color: '#0f172a' }}>{row.name}</span>
            {row.website && (
              <div style={{ fontSize: '0.78rem', color: '#2563eb' }}>{row.website}</div>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Location / City',
      accessor: 'city',
      render: (row) => (
        <span>
          {[row.city, row.state, row.country].filter(Boolean).join(', ') || '—'}
        </span>
      ),
    },
    {
      header: 'Associated Contacts',
      accessor: '_count',
      render: (row) => {
        const count = row._count?.contacts || 0;
        return (
          <span className="badge badge-neutral">
            <Users size={12} />
            <span>{count} contact{count === 1 ? '' : 's'}</span>
          </span>
        );
      },
    },
    {
      header: 'Actions',
      width: '140px',
      render: (row) => (
        <button
          onClick={() => navigate(`/contacts?companyId=${row.id}`)}
          className="btn btn-secondary btn-sm"
        >
          <span>View Contacts</span>
          <ArrowRight size={14} />
        </button>
      ),
    },
  ];

  return (
    <div className="content-wrapper">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Company Directory</h1>
          <p>Organize contacts by company, enterprise, or institution</p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="btn btn-primary btn-sm"
        >
          <Plus size={15} />
          <span>Add Company</span>
        </button>
      </div>

      {/* Search */}
      <div className="card" style={{ padding: '16px 20px', marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '38px' }}
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50)',
              color: '#94a3b8',
            }}
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={companies}
        isLoading={isLoading}
        emptyMessage="No companies registered yet"
      />

      {/* Add Company Modal */}
      {isAddModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Add New Company</h3>
              <button onClick={() => setIsAddModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCompany}>
              <div className="modal-body">
                {modalError && (
                  <div style={{ color: '#ef4444', fontSize: '0.85rem', marginBottom: '14px' }}>
                    {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">
                    Company Name <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    placeholder="e.g. Acme Technologies Pvt Ltd"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCompany.website}
                    onChange={(e) => setNewCompany({ ...newCompany, website: e.target.value })}
                    placeholder="e.g. https://www.acme.com"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Street Address</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                    placeholder="e.g. Infocity, Tower 1"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newCompany.city}
                      onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                      placeholder="City"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={newCompany.state}
                      onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value })}
                      placeholder="State"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Company
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

