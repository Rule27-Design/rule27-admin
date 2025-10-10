// src/pages/admin/articles/editor-tabs/SettingsTab.jsx
import React from 'react';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { QualityCheck } from '../../../../components/admin';

const SettingsTab = ({ formData, errors, onChange }) => {
  return (
    <div className="space-y-6">
      {/* Quality Check - Shows content optimization score */}
      <QualityCheck 
        data={formData} 
        config="article"
        onScoreChange={(score) => {
          if (score !== formData.qualityScore) {
            onChange('qualityScore', score);
          }
        }}
      />
      
      {/* Publishing Settings */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Publishing Settings</h3>
        
        <div className="space-y-4">
          <Select
            label="Status"
            value={formData.status}
            onChange={(value) => onChange('status', value)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'pending_approval', label: 'Pending Approval' },
              { value: 'approved', label: 'Approved' },
              { value: 'published', label: 'Published' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'archived', label: 'Archived' }
            ]}
            error={errors.status}
          />

          {/* Publish Date - Show for published articles or when setting to published */}
          {(formData.status === 'published' || formData.published_at) && (
            <Input
              type="datetime-local"
              label="Publish Date"
              value={formData.published_at ? 
                new Date(formData.published_at).toISOString().slice(0, 16) : 
                new Date().toISOString().slice(0, 16)
              }
              onChange={(e) => onChange('published_at', e.target.value)}
              error={errors.published_at}
              helperText="Set the official publish date for this article"
            />
          )}

          {/* Schedule Date - Show for scheduled articles */}
          {formData.status === 'scheduled' && (
            <Input
              type="datetime-local"
              label="Schedule Publication"
              value={formData.scheduled_at ? 
                new Date(formData.scheduled_at).toISOString().slice(0, 16) : ''
              }
              onChange={(e) => onChange('scheduled_at', e.target.value)}
              error={errors.scheduled_at}
              required
              helperText="Article will be automatically published at this time"
            />
          )}

          {/* Sort Order */}
          <Input
            type="number"
            label="Sort Order"
            value={formData.sort_order || 0}
            onChange={(e) => onChange('sort_order', parseInt(e.target.value))}
            error={errors.sort_order}
            helperText="Lower numbers appear first"
          />

          <div className="space-y-3">
            <Checkbox
              checked={formData.is_featured}
              onCheckedChange={(checked) => onChange('is_featured', checked)}
              label="Featured Article"
              description="Display this article prominently on the homepage"
            />
            
            <Checkbox
              checked={formData.enable_comments}
              onCheckedChange={(checked) => onChange('enable_comments', checked)}
              label="Enable Comments"
              description="Allow readers to comment on this article"
            />
            
            <Checkbox
              checked={formData.enable_reactions}
              onCheckedChange={(checked) => onChange('enable_reactions', checked)}
              label="Enable Reactions"
              description="Allow readers to like and share this article"
            />
          </div>
        </div>
      </div>

      {/* Internal Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Internal Notes
        </label>
        <textarea
          value={formData.internal_notes || ''}
          onChange={(e) => onChange('internal_notes', e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
          rows={4}
          placeholder="Notes for the editorial team (not visible to readers)..."
        />
      </div>

      {/* Article Statistics - Only show for existing articles */}
      {formData.id && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Article Information</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Article ID:</dt>
              <dd className="text-gray-900 font-mono text-xs">
                {formData.id}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Version:</dt>
              <dd className="text-gray-900">
                {formData.version || 1}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Created:</dt>
              <dd className="text-gray-900">
                {formData.created_at ? 
                  new Date(formData.created_at).toLocaleString() : 'N/A'}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Last Updated:</dt>
              <dd className="text-gray-900">
                {formData.updated_at ? 
                  new Date(formData.updated_at).toLocaleString() : 'N/A'}
              </dd>
            </div>
            {formData.published_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Published:</dt>
                <dd className="text-gray-900">
                  {new Date(formData.published_at).toLocaleString()}
                </dd>
              </div>
            )}
            {formData.scheduled_at && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Scheduled:</dt>
                <dd className="text-gray-900">
                  {new Date(formData.scheduled_at).toLocaleString()}
                </dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Views:</dt>
              <dd className="text-gray-900">{formData.view_count || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Unique Views:</dt>
              <dd className="text-gray-900">{formData.unique_view_count || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Likes:</dt>
              <dd className="text-gray-900">{formData.like_count || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Shares:</dt>
              <dd className="text-gray-900">{formData.share_count || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Bookmarks:</dt>
              <dd className="text-gray-900">{formData.bookmark_count || 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Read Time:</dt>
              <dd className="text-gray-900">
                {formData.read_time ? `${formData.read_time} min` : 'N/A'}
              </dd>
            </div>
            {formData.average_read_depth && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Avg Read Depth:</dt>
                <dd className="text-gray-900">{formData.average_read_depth}%</dd>
              </div>
            )}
            {formData.average_time_on_page && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Avg Time on Page:</dt>
                <dd className="text-gray-900">
                  {Math.floor(formData.average_time_on_page / 60)}m {formData.average_time_on_page % 60}s
                </dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Publishing Guidelines */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Publishing Guidelines</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Aim for a quality score of 60% or higher before publishing</li>
          <li>• Schedule posts for optimal engagement times (10am or 2pm)</li>
          <li>• Featured articles appear on the homepage carousel</li>
          <li>• Published date affects SEO and content freshness</li>
          <li>• Use scheduling to maintain consistent content flow</li>
          <li>• Internal notes are only visible to editors and admins</li>
        </ul>
      </div>
    </div>
  );
};

export default SettingsTab;