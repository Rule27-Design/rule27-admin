// src/pages/admin/settings/components/IntegrationManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../../lib/supabase';
import Icon from '../../../../components/AdminIcon';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import { useToast } from '../../../../components/ui/Toast';

const IntegrationManager = ({ userProfile }) => {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState(null);
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [importLogs, setImportLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Dropdown data
  const [categories, setCategories] = useState([]);
  const [profiles, setProfiles] = useState([]);

  // ---- Load everything ----
  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      // Load import rules
      const { data: configRow, error: configError } = await supabase
        .from('site_config')
        .select('*')
        .eq('config_key', 'article_import_rules')
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;
      setConfig(configRow?.config_value || getDefaultConfig());

      // Load webhook secret
      const { data: secretRow } = await supabase
        .from('site_config')
        .select('config_value')
        .eq('config_key', 'webhook_secrets')
        .single();

      setWebhookSecret(secretRow?.config_value?.article_import || '');

      // Load categories for dropdowns
      const { data: cats } = await supabase
        .from('categories')
        .select('id, name, slug')
        .eq('type', 'article')
        .eq('is_active', true)
        .order('name');
      setCategories(cats || []);

      // Load profiles for author assignment
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name, display_name, role')
        .eq('is_active', true)
        .in('role', ['admin', 'contributor'])
        .order('full_name');
      setProfiles(profs || []);

    } catch (err) {
      console.error('Error loading integration config:', err);
      toast.error('Failed to load integration settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadImportLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const { data } = await supabase
        .from('article_import_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      setImportLogs(data || []);
    } catch (err) {
      console.error('Error loading import logs:', err);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
    loadImportLogs();
  }, [loadConfig, loadImportLogs]);

  // ---- Save config ----
  const saveConfig = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_config')
        .upsert({
          config_key: 'article_import_rules',
          config_value: config,
          description: 'Rules for auto-importing articles from external sources.',
          updated_by: userProfile?.id || null
        }, { onConflict: 'config_key' });

      if (error) throw error;
      toast.success('Import rules saved');
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Failed to save import rules');
    } finally {
      setSaving(false);
    }
  };

  // ---- Regenerate webhook secret ----
  const regenerateSecret = async () => {
    if (!confirm('Regenerating the secret will invalidate the current webhook URL. Continue?')) return;
    
    try {
      const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('site_config')
        .upsert({
          config_key: 'webhook_secrets',
          config_value: { article_import: newSecret },
          updated_by: userProfile?.id || null
        }, { onConflict: 'config_key' });

      if (error) throw error;
      setWebhookSecret(newSecret);
      toast.success('Webhook secret regenerated');
    } catch (err) {
      toast.error('Failed to regenerate secret');
    }
  };

  // ---- Config helpers ----
  const updateConfig = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const getDefaultConfig = () => ({
    webhook_enabled: true,
    default_status: 'draft',
    default_author_id: null,
    default_category_id: null,
    category_author_map: [],
    auto_tag_rules: [],
    auto_category_rules: [],
    strip_promotional_section: true,
    strip_recommended_links: true
  });

  // ---- Category-Author Mapping ----
  const addCategoryAuthorMapping = () => {
    updateConfig('category_author_map', [
      ...(config.category_author_map || []),
      { category_id: '', author_id: '', label: '' }
    ]);
  };

  const updateMapping = (index, field, value) => {
    const updated = [...(config.category_author_map || [])];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-generate label
    if (field === 'category_id' || field === 'author_id') {
      const cat = categories.find(c => c.id === (field === 'category_id' ? value : updated[index].category_id));
      const prof = profiles.find(p => p.id === (field === 'author_id' ? value : updated[index].author_id));
      updated[index].label = `${cat?.name || '?'} → ${prof?.full_name || prof?.display_name || '?'}`;
    }

    updateConfig('category_author_map', updated);
  };

  const removeMapping = (index) => {
    const updated = [...(config.category_author_map || [])];
    updated.splice(index, 1);
    updateConfig('category_author_map', updated);
  };

  // ---- Auto-Category Rules ----
  const addCategoryRule = () => {
    updateConfig('auto_category_rules', [
      ...(config.auto_category_rules || []),
      { keywords: [], category_id: '' }
    ]);
  };

  const updateCategoryRule = (index, field, value) => {
    const updated = [...(config.auto_category_rules || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig('auto_category_rules', updated);
  };

  const removeCategoryRule = (index) => {
    const updated = [...(config.auto_category_rules || [])];
    updated.splice(index, 1);
    updateConfig('auto_category_rules', updated);
  };

  // ---- Auto-Tag Rules ----
  const addTagRule = () => {
    updateConfig('auto_tag_rules', [
      ...(config.auto_tag_rules || []),
      { keywords: [], tag: '' }
    ]);
  };

  const updateTagRule = (index, field, value) => {
    const updated = [...(config.auto_tag_rules || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateConfig('auto_tag_rules', updated);
  };

  const removeTagRule = (index) => {
    const updated = [...(config.auto_tag_rules || [])];
    updated.splice(index, 1);
    updateConfig('auto_tag_rules', updated);
  };

  // ---- Webhook URL ----
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
  const webhookUrl = `${supabaseUrl}/functions/v1/article-import`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading-bold uppercase">Article Import Integration</h2>
          <p className="text-sm text-gray-500 mt-1">
            Configure how articles from Baby Love Growth and other sources are imported.
          </p>
        </div>
        <Button
          onClick={saveConfig}
          loading={saving}
          disabled={saving}
          iconName="Save"
        >
          Save Rules
        </Button>
      </div>

      {/* Webhook Endpoint */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <Icon name="Webhook" size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-medium">Webhook Endpoint</h3>
              <p className="text-sm text-gray-500">Send article data to this URL</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.webhook_enabled}
              onChange={(e) => updateConfig('webhook_enabled', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500" />
          </label>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono break-all">
                {webhookUrl}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('URL copied'); }}
                title="Copy URL"
              >
                <Icon name="Copy" size={16} />
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
            <div className="flex items-center space-x-2">
              <code className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono break-all">
                {showSecret ? webhookSecret : '••••••••••••••••••••••••••••••••'}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowSecret(!showSecret)}
                title={showSecret ? 'Hide' : 'Show'}
              >
                <Icon name={showSecret ? 'EyeOff' : 'Eye'} size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { navigator.clipboard.writeText(webhookSecret); toast.success('Secret copied'); }}
                title="Copy secret"
              >
                <Icon name="Copy" size={16} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={regenerateSecret}
                className="text-red-600"
              >
                <Icon name="RefreshCw" size={14} className="mr-1" />
                Regenerate
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Pass this as the <code className="bg-gray-100 px-1 rounded">x-webhook-secret</code> header.
            </p>
          </div>
        </div>

        {/* Usage example */}
        <details className="mt-4">
          <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900">
            Usage Examples
          </summary>
          <div className="mt-3 space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">JSON Payload:</p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
{`curl -X POST ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: YOUR_SECRET" \\
  -d '{
    "markdown": "# Article Title\\n\\nContent here...",
    "schema_markup": { "headline": "...", "image": {...} },
    "external_id": "167982"
  }'`}
              </pre>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Multipart (file upload):</p>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-3 text-xs overflow-x-auto">
{`curl -X POST ${webhookUrl} \\
  -H "x-webhook-secret: YOUR_SECRET" \\
  -F "markdown=@article.md" \\
  -F "schema=@schema-markup.json"`}
              </pre>
            </div>
          </div>
        </details>
      </section>

      {/* Default Settings */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <h3 className="font-medium flex items-center space-x-2">
          <Icon name="Settings" size={18} />
          <span>Default Import Settings</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Status</label>
            <select
              value={config.default_status}
              onChange={(e) => updateConfig('default_status', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="draft">Draft (review before publishing)</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="published">Published (auto-publish)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Author</label>
            <select
              value={config.default_author_id || ''}
              onChange={(e) => updateConfig('default_author_id', e.target.value || null)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">— Select default author —</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>
                  {p.full_name || p.display_name} ({p.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Default Category</label>
            <select
              value={config.default_category_id || ''}
              onChange={(e) => updateConfig('default_category_id', e.target.value || null)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="">— No default category —</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col justify-end space-y-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.strip_promotional_section}
                onChange={(e) => updateConfig('strip_promotional_section', e.target.checked)}
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              <span className="text-sm">Strip promotional CTA sections</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.strip_recommended_links}
                onChange={(e) => updateConfig('strip_recommended_links', e.target.checked)}
                className="rounded border-gray-300 text-accent focus:ring-accent"
              />
              <span className="text-sm">Strip "Recommended" links section</span>
            </label>
          </div>
        </div>
      </section>

      {/* Category → Author Mapping */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center space-x-2">
            <Icon name="GitBranch" size={18} />
            <span>Category → Author Mapping</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={addCategoryAuthorMapping}>
            <Icon name="Plus" size={14} className="mr-1" />
            Add Rule
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Override the default author based on which category the article matches. 
          Matching is based on auto-detected tags.
        </p>

        {(!config.category_author_map || config.category_author_map.length === 0) ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Icon name="GitBranch" size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">No category-author mappings configured.</p>
            <p className="text-gray-400 text-xs mt-1">All imports will use the default author above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {config.category_author_map.map((mapping, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <select
                  value={mapping.category_id}
                  onChange={(e) => updateMapping(index, 'category_id', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                
                <Icon name="ArrowRight" size={16} className="text-gray-400 flex-shrink-0" />
                
                <select
                  value={mapping.author_id}
                  onChange={(e) => updateMapping(index, 'author_id', e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent"
                >
                  <option value="">Select author...</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.full_name || p.display_name}
                    </option>
                  ))}
                </select>

                <Button variant="ghost" size="icon" onClick={() => removeMapping(index)}>
                  <Icon name="X" size={16} className="text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Auto-Category Rules */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center space-x-2">
            <Icon name="Folder" size={18} />
            <span>Auto-Category Rules</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={addCategoryRule}>
            <Icon name="Plus" size={14} className="mr-1" />
            Add Rule
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Automatically assign a category based on keyword matches. First match wins, 
          then falls back to the default category above.
        </p>

        {(!config.auto_category_rules || config.auto_category_rules.length === 0) ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Icon name="Folder" size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">No auto-category rules configured.</p>
            <p className="text-gray-400 text-xs mt-1">All imports will use the default category.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.auto_category_rules.map((rule, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Category</label>
                    <select
                      value={rule.category_id}
                      onChange={(e) => updateCategoryRule(index, 'category_id', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-accent focus:border-accent"
                    >
                      <option value="">Select category...</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCategoryRule(index)}
                    className="mt-5"
                  >
                    <Icon name="Trash2" size={16} className="text-red-500" />
                  </Button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Keywords (comma-separated) — if any match, this category is assigned
                  </label>
                  <Input
                    value={(rule.keywords || []).join(', ')}
                    onChange={(e) => {
                      const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                      updateCategoryRule(index, 'keywords', keywords);
                    }}
                    placeholder="e.g. content systems, CMS, digital content"
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Auto-Tag Rules */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center space-x-2">
            <Icon name="Tag" size={18} />
            <span>Auto-Tag Rules</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={addTagRule}>
            <Icon name="Plus" size={14} className="mr-1" />
            Add Rule
          </Button>
        </div>

        <p className="text-sm text-gray-500">
          Automatically tag imported articles based on keyword matches in the content.
        </p>

        {(!config.auto_tag_rules || config.auto_tag_rules.length === 0) ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Icon name="Tag" size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">No auto-tag rules configured.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {config.auto_tag_rules.map((rule, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Tag Name</label>
                    <Input
                      value={rule.tag}
                      onChange={(e) => updateTagRule(index, 'tag', e.target.value)}
                      placeholder="e.g. SaaS"
                      className="text-sm"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeTagRule(index)}
                    className="mt-5"
                  >
                    <Icon name="Trash2" size={16} className="text-red-500" />
                  </Button>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Keywords (comma-separated) — if any match, the tag is applied
                  </label>
                  <Input
                    value={(rule.keywords || []).join(', ')}
                    onChange={(e) => {
                      const keywords = e.target.value.split(',').map(k => k.trim()).filter(Boolean);
                      updateTagRule(index, 'keywords', keywords);
                    }}
                    placeholder="e.g. SaaS, B2B, subscription, MRR, ARR"
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Import Log */}
      <section className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium flex items-center space-x-2">
            <Icon name="History" size={18} />
            <span>Recent Imports</span>
          </h3>
          <Button variant="ghost" size="sm" onClick={loadImportLogs} loading={logsLoading}>
            <Icon name="RefreshCw" size={14} className="mr-1" />
            Refresh
          </Button>
        </div>

        {importLogs.length === 0 ? (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Icon name="Inbox" size={32} className="mx-auto text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm">No articles imported yet.</p>
            <p className="text-gray-400 text-xs mt-1">
              Articles will appear here once the webhook receives data.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-2 font-medium text-gray-600">Title</th>
                  <th className="pb-2 font-medium text-gray-600">Source</th>
                  <th className="pb-2 font-medium text-gray-600">Status</th>
                  <th className="pb-2 font-medium text-gray-600">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {importLogs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-2 pr-4">
                      <div className="flex items-center space-x-2">
                        {log.article_id ? (
                          <a
                            href={`/articles?id=${log.article_id}`}
                            className="text-accent hover:underline font-medium"
                          >
                            {log.title}
                          </a>
                        ) : (
                          <span className="text-gray-700">{log.title}</span>
                        )}
                        {log.external_id && (
                          <span className="text-xs text-gray-400 font-mono">#{log.external_id}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-4 text-gray-500">{log.source}</td>
                    <td className="py-2 pr-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'success' ? 'bg-green-100 text-green-800' :
                        log.status === 'duplicate' ? 'bg-yellow-100 text-yellow-800' :
                        log.status === 'failed' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {log.status}
                      </span>
                      {log.error_message && (
                        <p className="text-xs text-red-500 mt-1">{log.error_message}</p>
                      )}
                    </td>
                    <td className="py-2 text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString()}{' '}
                      <span className="text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default IntegrationManager;
