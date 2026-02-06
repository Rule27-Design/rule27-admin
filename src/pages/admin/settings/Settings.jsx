// src/pages/admin/settings/Settings.jsx
import React, { useState, useEffect } from 'react';
import { useOutletContext, useSearchParams } from 'react-router-dom';
import Icon from '../../../components/AdminIcon';
import Button from '../../../components/ui/Button';
import { useSettings } from './hooks/useSettings';
import { useSettingsEvents } from './hooks/useSettingsEvents';

// Import managers
import CategoryManager from './components/CategoryManager';
import TagManager from './components/TagManager';
import TestimonialManager from './components/TestimonialManager';
import PartnershipManager from './components/PartnershipManager';
import AwardManager from './components/AwardManager';
import DepartmentManager from './components/DepartmentManager';
import IntegrationManager from './components/IntegrationManager';

const Settings = () => {
  const { userProfile } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'categories');
  const { data, loading, error, refresh } = useSettings();
  const { subscribeToEvents } = useSettingsEvents();

  // Subscribe to events
  useEffect(() => {
    const unsubscribe = subscribeToEvents('settings:updated', () => {
      refresh();
    });
    return unsubscribe;
  }, [subscribeToEvents, refresh]);

  // Sync tab to URL
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <Icon name="AlertCircle" size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-medium text-red-900 mb-2">Error Loading Settings</h2>
        <p className="text-red-700">{error}</p>
        <Button onClick={refresh} className="mt-4" variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  // Only admins can access settings
  if (userProfile?.role !== 'admin') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <Icon name="AlertCircle" size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-xl font-medium text-red-900 mb-2">Access Denied</h2>
        <p className="text-red-700">Only administrators can manage settings.</p>
      </div>
    );
  }

  const tabs = [
    { id: 'categories', label: 'Categories', count: data.categories?.length || 0, icon: 'Folder' },
    { id: 'tags', label: 'Tags', count: data.tags?.length || 0, icon: 'Tag' },
    { id: 'testimonials', label: 'Testimonials', count: data.testimonials?.length || 0, icon: 'MessageSquare' },
    { id: 'partnerships', label: 'Partnerships', count: data.partnerships?.length || 0, icon: 'Handshake' },
    { id: 'awards', label: 'Awards', count: data.awards?.length || 0, icon: 'Award' },
    { id: 'departments', label: 'Departments', count: data.departments?.length || 0, icon: 'Building' },
    { id: 'integrations', label: 'Integrations', count: null, icon: 'Plug' },
  ];

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex overflow-x-auto border-b">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent' 
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon name={tab.icon} size={16} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-gray-100">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="transition-all duration-200">
        {activeTab === 'categories' && (
          <CategoryManager 
            categories={data.categories || []} 
            userProfile={userProfile}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'tags' && (
          <TagManager 
            tags={data.tags || []} 
            userProfile={userProfile}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'testimonials' && (
          <TestimonialManager 
            testimonials={data.testimonials || []} 
            userProfile={userProfile}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'partnerships' && (
          <PartnershipManager 
            partnerships={data.partnerships || []} 
            userProfile={userProfile}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'awards' && (
          <AwardManager 
            awards={data.awards || []} 
            userProfile={userProfile}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'departments' && (
          <DepartmentManager 
            departments={data.departments || []} 
            userProfile={userProfile}
            onUpdate={refresh}
          />
        )}
        {activeTab === 'integrations' && (
          <IntegrationManager 
            userProfile={userProfile}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;
