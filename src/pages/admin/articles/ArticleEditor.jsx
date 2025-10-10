// src/pages/admin/articles/ArticleEditor.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  EditorModal,
  StatusBadge,
  PreviewModal
} from '../../../components/admin';
import { generateSlug, sanitizeData } from '../../../utils';
import { useFormValidation } from './hooks/useFormValidation';
import { useAutoSave } from './hooks/useAutoSave';
import { articleOperations } from './services/ArticleOperations';
import { useToast } from '../../../components/ui/Toast';
import Icon from '../../../components/AdminIcon';
import Button from '../../../components/ui/Button';

// Import tab components
import ContentTab from './editor-tabs/ContentTab';
import MediaTab from './editor-tabs/MediaTab';
import SEOTab from './editor-tabs/SEOTab';
import SettingsTab from './editor-tabs/SettingsTab';
import AnalyticsTab from './editor-tabs/AnalyticsTab';

const ArticleEditor = ({
  article = null,
  userProfile,
  isOpen,
  onClose,
  onSave
}) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('content');
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [authors, setAuthors] = useState([]);
  
  // Initialize form data - UPDATED with missing fields
  const initialData = {
    title: article?.title || '',
    slug: article?.slug || '',
    excerpt: article?.excerpt || '',
    content: article?.content || null,
    featured_image: article?.featured_image || '',
    featured_image_alt: article?.featured_image_alt || '',
    featured_video: article?.featured_video || '',
    gallery_images: article?.gallery_images || [],
    author_id: article?.author_id || userProfile?.id || '',
    co_authors: article?.co_authors || [],
    category_id: article?.category_id || '',
    tags: article?.tags || [],
    status: article?.status || 'draft',
    published_at: article?.published_at || '',  // ADDED
    scheduled_at: article?.scheduled_at || '',
    is_featured: article?.is_featured || false,
    enable_comments: article?.enable_comments || false,
    enable_reactions: article?.enable_reactions !== false,
    meta_title: article?.meta_title || '',
    meta_description: article?.meta_description || '',
    meta_keywords: article?.meta_keywords || [],
    og_title: article?.og_title || '',
    og_description: article?.og_description || '',
    og_image: article?.og_image || '',
    twitter_card: article?.twitter_card || 'summary_large_image',
    canonical_url: article?.canonical_url || '',
    internal_notes: article?.internal_notes || '',
    read_time: article?.read_time || null,
    sort_order: article?.sort_order || 0,  // ADDED
    version: article?.version || 1,  // ADDED
    view_count: article?.view_count || 0,
    unique_view_count: article?.unique_view_count || 0,  // ADDED
    like_count: article?.like_count || 0,
    share_count: article?.share_count || 0,
    bookmark_count: article?.bookmark_count || 0,
    average_read_depth: article?.average_read_depth || null,  // ADDED
    average_time_on_page: article?.average_time_on_page || null,  // ADDED
    id: article?.id || null,  // ADDED for reference
    created_at: article?.created_at || null,  // ADDED
    updated_at: article?.updated_at || null  // ADDED
  };

  const [formData, setFormData] = useState(initialData);
  const [isDirty, setIsDirty] = useState(false);

  // Form validation
  const { errors, validateForm, clearError, getTabErrors } = useFormValidation();

  // Auto-save functionality (only for existing articles) - UPDATED callback
  const { saveStatus, triggerAutoSave } = useAutoSave(
    formData, 
    article?.id,
    article?.id ? () => handleSave(true) : null  // UPDATED: pass auto-save flag
  );

  // Fetch related data (categories and authors)
  useEffect(() => {
    fetchRelatedData();
  }, []);

  const fetchRelatedData = async () => {
    try {
      // Fetch categories
      const { data: categoriesData, error: catError } = await supabase
        .from('categories')
        .select('*')
        .eq('type', 'article')
        .eq('is_active', true)
        .order('name');
      
      if (catError) throw catError;
      
      // Fetch authors (contributors and admins)
      const { data: authorsData, error: authError } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('role', ['admin', 'contributor'])
        .eq('is_active', true)
        .order('full_name');
      
      if (authError) throw authError;
      
      setCategories(categoriesData || []);
      setAuthors(authorsData || []);
    } catch (error) {
      console.error('Error fetching related data:', error);
      toast.error('Failed to load categories and authors');
    }
  };

  // Track dirty state
  useEffect(() => {
    setIsDirty(JSON.stringify(formData) !== JSON.stringify(initialData));
  }, [formData]);

  // Auto-save trigger for existing articles
  useEffect(() => {
    if (article?.id && isDirty) {
      const timer = setTimeout(() => {
        triggerAutoSave();
      }, 3000); // Auto-save after 3 seconds of no changes
      
      return () => clearTimeout(timer);
    }
  }, [formData, article?.id, isDirty, triggerAutoSave]);

  // Handle field changes
  const handleFieldChange = useCallback((field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      
      // Auto-generate slug from title for new articles
      if (field === 'title' && !article && !prev.slug) {
        updated.slug = generateSlug(value);
      }
      
      // Auto-generate meta title if empty
      if (field === 'title' && !prev.meta_title) {
        updated.meta_title = value.substring(0, 60);
      }
      
      // Auto-generate meta description from excerpt
      if (field === 'excerpt' && !prev.meta_description) {
        updated.meta_description = value.substring(0, 160);
      }
      
      // Calculate read time when content changes
      if (field === 'content' && value?.wordCount) {
        updated.read_time = Math.ceil(value.wordCount / 200);
      }
      
      return updated;
    });
    
    clearError(field);
  }, [clearError, article]);

  // Handle save - UPDATED to support auto-save flag
  const handleSave = async (autoSave = false) => {
    setSaving(true);
    
    // Skip validation for auto-save
    if (!autoSave) {
      // Validate form
      const validationErrors = validateForm(formData);
      if (Object.keys(validationErrors).length > 0) {
        // Find the first tab with errors and switch to it
        const tabsWithErrors = getTabsWithErrors(validationErrors);
        if (tabsWithErrors.length > 0) {
          setActiveTab(tabsWithErrors[0]);
        }
        
        toast.error('Validation failed', 'Please fix the errors before saving');
        setSaving(false);
        return false;
      }
    }

    const sanitized = sanitizeData({
      ...formData,
      auto_save: autoSave  // ADDED: Pass auto-save flag to operations
    });
    
    // Ensure author_id is set
    if (!sanitized.author_id) {
      sanitized.author_id = userProfile?.id;
    }
    
    // Auto-generate canonical URL if not provided
    if (!sanitized.canonical_url && sanitized.slug) {
      sanitized.canonical_url = `https://www.rule27design.com/articles/${sanitized.slug}`;
    }
    
    let result;
    if (article?.id) {
      result = await articleOperations.update(article.id, sanitized, userProfile);
    } else {
      result = await articleOperations.create(sanitized, userProfile);
    }

    if (result.success) {
      if (!autoSave) {  // Only show toast for manual saves
        toast.success(
          article ? 'Article updated' : 'Article created',
          `"${formData.title}" has been saved successfully`
        );
      }
      
      if (onSave) {
        await onSave(result.data);
      }
      setSaving(false);
      return true;
    } else {
      if (!autoSave) {  // Only show error for manual saves
        toast.error('Save failed', result.error);
      }
      setSaving(false);
      return false;
    }
  };

  // Handle save with status change - UPDATED for publish date
  const handleSaveWithStatus = async (status) => {
    setFormData(prev => {
      const updated = { ...prev, status };
      
      // Set published_at when publishing
      if (status === 'published' && !prev.published_at) {
        updated.published_at = new Date().toISOString();
      }
      
      return updated;
    });
    // Use setTimeout to ensure state updates before saving
    setTimeout(() => handleSave(), 100);
  };

  // ADDED: Handle scheduling
  const handleSchedule = async (scheduledDate) => {
    setFormData(prev => ({
      ...prev,
      scheduled_at: scheduledDate,
      status: 'scheduled'
    }));
    setTimeout(() => handleSave(), 100);
  };

  // Tab configuration with error indicators
  const getTabsWithErrors = (currentErrors = errors) => {
    const tabErrors = {
      content: ['title', 'slug', 'excerpt', 'content', 'category_id', 'tags'],
      media: ['featured_image', 'featured_image_alt', 'featured_video', 'gallery_images'],
      seo: ['meta_title', 'meta_description', 'meta_keywords', 'og_title', 'og_description', 'og_image', 'canonical_url'],
      settings: ['status', 'scheduled_at', 'internal_notes']
    };
    
    const tabsWithErrors = [];
    Object.entries(tabErrors).forEach(([tab, fields]) => {
      if (fields.some(field => currentErrors[field])) {
        tabsWithErrors.push(tab);
      }
    });
    
    return tabsWithErrors;
  };

  const tabs = [
    { 
      id: 'content', 
      label: 'Content',
      icon: 'FileText',
      hasErrors: getTabsWithErrors().includes('content')
    },
    { 
      id: 'media', 
      label: 'Media',
      icon: 'Image',
      hasErrors: getTabsWithErrors().includes('media')
    },
    { 
      id: 'seo', 
      label: 'SEO',
      icon: 'Search',
      hasErrors: getTabsWithErrors().includes('seo')
    },
    { 
      id: 'settings', 
      label: 'Settings',
      icon: 'Settings',
      hasErrors: getTabsWithErrors().includes('settings')
    }
  ];

  // Add analytics tab only for existing articles
  if (article?.id) {
    tabs.push({
      id: 'analytics',
      label: 'Analytics',
      icon: 'BarChart',
      hasErrors: false
    });
  }

  // Render preview
  const renderPreview = () => (
    <div className="prose prose-lg max-w-none">
      {formData.featured_image && (
        <img 
          src={formData.featured_image} 
          alt={formData.featured_image_alt || formData.title}
          className="w-full rounded-lg mb-6"
        />
      )}
      
      <h1 className="text-4xl font-bold mb-4">
        {formData.title || 'Untitled Article'}
      </h1>
      
      <div className="flex items-center space-x-4 text-gray-500 mb-6">
        <span>By {userProfile?.full_name || 'Author'}</span>
        <span>•</span>
        <span>{formData.read_time || 1} min read</span>
      </div>
      
      {formData.excerpt && (
        <p className="lead text-xl text-gray-600 mb-6">
          {formData.excerpt}
        </p>
      )}
      
      {formData.content?.html ? (
        <div dangerouslySetInnerHTML={{ __html: formData.content.html }} />
      ) : (
        <p className="text-gray-400 italic">No content yet...</p>
      )}
      
      {/* Gallery Images */}
      {formData.gallery_images && formData.gallery_images.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Gallery</h2>
          <div className="grid grid-cols-2 gap-4">
            {formData.gallery_images.map((image, index) => (
              <figure key={index} className="mb-4">
                <img
                  src={image.url}
                  alt={image.alt || `Gallery image ${index + 1}`}
                  className="w-full rounded-lg"
                />
                {image.caption && (
                  <figcaption className="text-sm text-gray-600 mt-2 text-center">
                    {image.caption}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        </div>
      )}
      
      {formData.tags && formData.tags.length > 0 && (
        <div className="mt-8 pt-8 border-t">
          <div className="flex flex-wrap gap-2">
            {formData.tags.map((tag, index) => (
              <span key={index} className="px-3 py-1 bg-gray-100 rounded-full text-sm">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Modal actions
  const modalActions = [
    {
      label: 'Preview',
      icon: 'Eye',
      onClick: () => setShowPreview(true),
      variant: 'ghost'
    }
  ];

  // ADDED: Add schedule action for draft articles
  if (formData.status === 'draft') {
    modalActions.push({
      label: 'Schedule',
      icon: 'Calendar',
      onClick: () => {
        const scheduledDate = prompt('Enter scheduled date (YYYY-MM-DD HH:MM):');
        if (scheduledDate) {
          handleSchedule(scheduledDate);
        }
      },
      variant: 'ghost'
    });
  }

  // Add publish action for admins
  if (userProfile?.role === 'admin' && formData.status !== 'published') {
    modalActions.push({
      label: 'Save & Publish',
      icon: 'Send',
      onClick: () => handleSaveWithStatus('published'),
      variant: 'success'
    });
  }

  return (
    <>
      <EditorModal
        isOpen={isOpen}
        onClose={onClose}
        onSave={handleSave}
        title={article ? `Edit: ${article.title}` : 'New Article'}
        subtitle={
          <>
            {saveStatus === 'saving' && 'Auto-saving...'}
            {saveStatus === 'saved' && 'All changes saved'}
            {formData.version > 1 && ` • Version ${formData.version}`}
          </>
        }
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isDirty={isDirty}
        isSaving={saving}
        actions={modalActions}
      >
        {activeTab === 'content' && (
          <ContentTab
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
            userProfile={userProfile}
            categories={categories}
            authors={authors}
          />
        )}
        
        {activeTab === 'media' && (
          <MediaTab
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
          />
        )}
        
        {activeTab === 'seo' && (
          <SEOTab
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
          />
        )}
        
        {activeTab === 'settings' && (
          <SettingsTab
            formData={formData}
            errors={errors}
            onChange={handleFieldChange}
          />
        )}
        
        {activeTab === 'analytics' && article?.id && (
          <AnalyticsTab
            articleId={article.id}
          />
        )}
      </EditorModal>

      {/* Preview Modal */}
      {showPreview && (
        <PreviewModal
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title="Article Preview"
          subtitle={`Preview of: ${formData.title || 'Untitled'}`}
        >
          {renderPreview()}
        </PreviewModal>
      )}
    </>
  );
};

export default ArticleEditor;