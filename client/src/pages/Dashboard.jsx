import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Scan,
  AlertTriangle,
  FileSpreadsheet,
  Download,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import StatCard from '../components/StatCard';
import DataTable from '../components/DataTable';
import { integrationService } from '../services/companyService';
import { contactService } from '../services/contactService';
import { formatDate, formatDateTime } from '../utils/formatters';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await integrationService.getDashboardStats();
        if (res?.data) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Error loading dashboard stats', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  const stats = data?.stats || {};
  const syncStatus = stats.syncStatus || {};

  const scanColumns = [
    {
      header: 'Scanned Card / Contact',
      accessor: 'contact',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>
            {row.contact?.fullName || 'Processed Card'}
          </span>
          {row.contact?.company?.name && (
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              {row.contact.company.name}
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'OCR Status',
      accessor: 'status',
      render: (row) => (
        <span
          className={`badge ${
            row.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: 'Date & Time',
      accessor: 'createdAt',
      render: (row) => formatDateTime(row.createdAt),
    },
  ];

  const contactColumns = [
    {
      header: 'Contact Name',
      accessor: 'fullName',
      render: (row) => (
        <div>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{row.fullName}</span>
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
      header: 'Phone / Email',
      accessor: 'phone',
      render: (row) => (
        <div>
          <div>{row.phone || '—'}</div>
          <div style={{ fontSize: '0.78rem', color: '#64748b' }}>{row.email || '—'}</div>
        </div>
      ),
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
  ];

  return (
    <div className="content-wrapper">
      {/* Page Header */}
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Admin Control Center</h1>
          <p>Real-time overview of visiting card scans, OCR extraction, and CRM contacts</p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => contactService.downloadExport('csv')}
            className="btn btn-secondary btn-sm"
          >
            <Download size={15} />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => navigate('/scanner')}
            className="btn btn-primary btn-sm"
          >
            <Scan size={15} />
            <span>Scan New Card</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Contacts"
          value={stats.totalContacts}
          subtitle="Saved in PostgreSQL database"
          icon={Users}
          variant="blue"
          onClick={() => navigate('/contacts')}
        />
        <StatCard
          title="Companies"
          value={stats.totalCompanies}
          subtitle="Registered company profiles"
          icon={Building2}
          variant="purple"
          onClick={() => navigate('/companies')}
        />
        <StatCard
          title="Cards Scanned Today"
          value={stats.cardsScannedToday}
          subtitle="Today's scan activity"
          icon={Scan}
          variant="green"
        />
        <StatCard
          title="Failed Scans / OCR"
          value={stats.failedOcrCount}
          subtitle="Requires review or retry"
          icon={AlertTriangle}
          variant="amber"
        />
      </div>

      {/* Google Sheets Sync Highlight Banner */}
      <div className="action-banner">
        <div className="action-banner-text">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <FileSpreadsheet size={22} style={{ color: '#38bdf8' }} />
            <h3 style={{ margin: 0 }}>Google Sheets Contact Register</h3>
          </div>
          <p>
            Contacts are automatically synchronized to your central Google Spreadsheet.
            Synced: <strong style={{ color: '#4ade80' }}>{syncStatus.synced || 0}</strong> ·
            Pending: <strong style={{ color: '#fbbf24' }}>{syncStatus.pending || 0}</strong> ·
            Failed: <strong style={{ color: '#f87171' }}>{syncStatus.failed || 0}</strong>
          </p>
        </div>

        <div className="action-buttons-group">
          <button
            onClick={() => navigate('/settings')}
            className="btn btn-secondary btn-sm"
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}
          >
            <span>View Integration Status</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Recent Activity Sections */}
      <div className="dashboard-sections">
        {/* Recent Contacts */}
        <div>
          <div className="section-header">
            <h3 className="section-title">Recently Saved Contacts</h3>
            <button
              onClick={() => navigate('/contacts')}
              className="btn btn-secondary btn-sm"
            >
              <span>View All</span>
              <ArrowRight size={14} />
            </button>
          </div>
          <DataTable
            columns={contactColumns}
            data={data?.recentContacts || []}
            isLoading={isLoading}
            emptyMessage="No contacts created yet. Click 'Scan New Card' to begin!"
          />
        </div>

        {/* Recent Scans */}
        <div>
          <div className="section-header">
            <h3 className="section-title">Recent Scans</h3>
            <button
              onClick={() => navigate('/scanner')}
              className="btn btn-secondary btn-sm"
            >
              <span>New Scan</span>
            </button>
          </div>
          <DataTable
            columns={scanColumns}
            data={data?.recentScans || []}
            isLoading={isLoading}
            emptyMessage="No scans recorded yet"
          />
        </div>
      </div>
    </div>
  );
}

