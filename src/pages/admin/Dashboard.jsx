// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Icon from '../../components/AdminIcon';
import Button from '../../components/ui/Button';

const Dashboard = () => {
  const { userProfile } = useOutletContext();
  const [stats, setStats] = useState({
    articles: { total: 0, draft: 0, published: 0, pending: 0 },
    caseStudies: { total: 0, published: 0 },
    leads: { total: 0, new: 0, hot: 0 },
    services: { total: 0, active: 0 },
    roles: { admin: 0, contributor: 0, standard: 0, totalWithAuth: 0 },
    loading: true
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [recentRoleChanges, setRecentRoleChanges] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats in parallel
      const [
        articlesRes,
        caseStudiesRes,
        leadsRes,
        servicesRes,
        pendingRes,
        profilesRes,
        auditLogsRes
      ] = await Promise.all([
        // Articles stats
        supabase.from('articles').select('status', { count: 'exact', head: true }),
        // Case studies stats
        supabase.from('case_studies').select('status', { count: 'exact', head: true }),
        // Leads stats
        supabase.from('contact_submissions').select('lead_status, lead_temperature', { count: 'exact' }),
        // Services stats
        supabase.from('services').select('is_active', { count: 'exact' }),
        // Pending approvals
        supabase
          .from('articles')
          .select('id, title, author_id, submitted_for_approval_at')
          .eq('status', 'pending_approval')
          .order('submitted_for_approval_at', { ascending: false })
          .limit(5),
        // User profiles with roles
        supabase
          .from('profiles')
          .select('role, auth_user_id'),
        // Recent role changes (from audit logs if they exist)
        supabase
          .from('audit_logs')
          .select(`
            *,
            performer:profiles!performed_by(full_name, email)
          `)
          .eq('action', 'role_change')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      // Calculate article stats
      const { count: totalArticles } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true });
      
      const { count: draftArticles } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');
      
      const { count: publishedArticles } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      
      const { count: pendingArticles } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_approval');

      // Calculate case study stats
      const { count: totalCaseStudies } = await supabase
        .from('case_studies')
        .select('*', { count: 'exact', head: true });
      
      const { count: publishedCaseStudies } = await supabase
        .from('case_studies')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

      // Calculate lead stats
      const { data: leadsData } = leadsRes;
      const newLeads = leadsData?.filter(l => l.lead_status === 'new').length || 0;
      const hotLeads = leadsData?.filter(l => l.lead_temperature === 'hot').length || 0;

      // Calculate service stats
      const { count: totalServices } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true });
      
      const { count: activeServices } = await supabase
        .from('services')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Calculate role distribution
      const { data: profilesData } = profilesRes;
      const authProfiles = profilesData?.filter(p => p.auth_user_id) || [];
      const roleDistribution = {
        admin: authProfiles.filter(p => p.role === 'admin').length || 0,
        contributor: authProfiles.filter(p => p.role === 'contributor').length || 0,
        standard: authProfiles.filter(p => p.role === 'standard').length || 0,
        totalWithAuth: authProfiles.length || 0
      };

      setStats({
        articles: {
          total: totalArticles || 0,
          draft: draftArticles || 0,
          published: publishedArticles || 0,
          pending: pendingArticles || 0
        },
        caseStudies: {
          total: totalCaseStudies || 0,
          published: publishedCaseStudies || 0
        },
        leads: {
          total: leadsData?.length || 0,
          new: newLeads,
          hot: hotLeads
        },
        services: {
          total: totalServices || 0,
          active: activeServices || 0
        },
        roles: roleDistribution,
        loading: false
      });

      setPendingApprovals(pendingRes.data || []);
      setRecentRoleChanges(auditLogsRes.data || []);

      // Fetch recent activity
      const { data: recentArticles } = await supabase
        .from('articles')
        .select('id, title, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(5);

      setRecentActivity(recentArticles || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const statCards = [
    {
      title: 'Total Articles',
      value: stats.articles.total,
      icon: 'FileText',
      color: 'bg-blue-500',
      link: '/articles',
      detail: `${stats.articles.published} published`
    },
    {
      title: 'Case Studies',
      value: stats.caseStudies.total,
      icon: 'Briefcase',
      color: 'bg-green-500',
      link: '/case-studies',
      detail: `${stats.caseStudies.published} published`
    },
    {
      title: 'Leads',
      value: stats.leads.total,
      icon: 'UserCheck',
      color: 'bg-purple-500',
      link: '/leads',
      detail: `${stats.leads.new} new, ${stats.leads.hot} hot`
    },
    {
      title: 'Services',
      value: stats.services.total,
      icon: 'Zap',
      color: 'bg-orange-500',
      link: '/services',
      detail: `${stats.services.active} active`
    }
  ];

  const quickActions = [
    { label: 'New Article', icon: 'FileText', link: '/articles?action=new' },
    { label: 'New Case Study', icon: 'Briefcase', link: '/case-studies?action=new' },
    { label: 'Add Service', icon: 'Plus', link: '/services?action=new' },
    { label: 'View Analytics', icon: 'TrendingUp', link: '/analytics' }
  ];

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading-bold uppercase">
              Welcome back, {userProfile?.full_name?.split(' ')[0] || 'Admin'}!
            </h1>
            <p className="text-gray-600 mt-1">
              Here's what's happening with Rule27 Design today.
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Role: <span className="font-medium uppercase">{userProfile?.role}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <Link
            key={stat.title}
            to={stat.link}
            className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.title}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.detail}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg text-white`}>
                <Icon name={stat.icon} size={24} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-heading-bold uppercase mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.link}
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon name={action.icon} size={24} className="text-accent mb-2" />
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Role Distribution - NEW SECTION */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading-bold uppercase">User Role Distribution</h2>
          <Link to="/profiles" className="text-accent text-sm hover:underline">
            Manage Users →
          </Link>
        </div>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-3xl font-bold text-purple-600">{stats.roles.admin}</div>
            <div className="text-sm text-purple-800 mt-1 font-medium">Admins</div>
            <div className="text-xs text-purple-600 mt-2">Full system access</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600">{stats.roles.contributor}</div>
            <div className="text-sm text-blue-800 mt-1 font-medium">Contributors</div>
            <div className="text-xs text-blue-600 mt-2">Content creators</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-600">{stats.roles.standard}</div>
            <div className="text-sm text-gray-800 mt-1 font-medium">Standard Users</div>
            <div className="text-xs text-gray-600 mt-2">No admin access</div>
          </div>
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">
            Total users with login access: <span className="font-medium">{stats.roles.totalWithAuth}</span>
          </p>
        </div>
        
        {stats.roles.standard > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="AlertCircle" size={16} className="text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-yellow-800">
                  <strong>Review Needed:</strong> You have {stats.roles.standard} user{stats.roles.standard !== 1 ? 's' : ''} with standard role. 
                  These users can log in but have no admin access. Review them in the <Link to="/profiles" className="underline font-medium">Profiles section</Link> to 
                  see if any need elevated permissions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        {userProfile?.role === 'admin' && pendingApprovals.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading-bold uppercase">Pending Approvals</h2>
              <Link to="/articles?filter=pending_approval" className="text-accent text-sm hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-3">
              {pendingApprovals.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Submitted {new Date(item.submitted_for_approval_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = `/articles?id=${item.id}&action=review`}
                  >
                    Review
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-heading-bold uppercase">Recent Activity</h2>
            <Link to="/articles" className="text-accent text-sm hover:underline">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                <Icon name="FileText" size={20} className="text-gray-400" />
                <div className="flex-1">
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-gray-500">
                    Status: <span className={`font-medium ${
                      item.status === 'published' ? 'text-green-600' :
                      item.status === 'pending_approval' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>{item.status}</span>
                    {' • '}
                    {new Date(item.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
            {recentActivity.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            )}
          </div>
        </div>

        {/* Recent Role Changes - NEW SECTION */}
        {userProfile?.role === 'admin' && recentRoleChanges.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-heading-bold uppercase">Recent Role Changes</h2>
              <Icon name="Shield" size={20} className="text-gray-400" />
            </div>
            <div className="space-y-3">
              {recentRoleChanges.map((change) => (
                <div key={change.id} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{change.new_value?.email || 'User'}</span>
                        {' '}changed from{' '}
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200">
                          {change.old_value?.role}
                        </span>
                        {' '}to{' '}
                        <span className={`px-2 py-0.5 text-xs rounded-full ${
                          change.new_value?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                          change.new_value?.role === 'contributor' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {change.new_value?.role}
                        </span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        By {change.performer?.full_name || 'System'} • {new Date(change.created_at).toLocaleDateString()}
                      </p>
                      {change.reason && (
                        <p className="text-xs text-gray-600 mt-1 italic">"{change.reason}"</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* System Health - Optional Addition */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-heading-bold uppercase mb-4">System Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Icon name="Database" size={24} className="text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-green-800">Database</p>
            <p className="text-xs text-green-600">Operational</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Icon name="Shield" size={24} className="text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-green-800">Auth Service</p>
            <p className="text-xs text-green-600">Operational</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Icon name="Mail" size={24} className="text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-green-800">Email Service</p>
            <p className="text-xs text-green-600">Operational</p>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <Icon name="Cloud" size={24} className="text-green-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-green-800">Storage</p>
            <p className="text-xs text-green-600">Operational</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;