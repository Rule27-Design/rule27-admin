// src/pages/admin/articles/editor-tabs/ContentTab.jsx - Updated with Author selection
import React from 'react';
import TiptapContentEditor from '../../../../components/ui/TiptapContentEditor';
import Input from '../../../../components/ui/Input';
import Select from '../../../../components/ui/Select';
import Button from '../../../../components/ui/Button';
import Icon from '../../../../components/AdminIcon';
import { generateSlug } from '../../../../utils';

const ContentTab = ({ formData, errors, onChange, userProfile, categories = [], authors = [] }) => {
  // Handle title change with auto-slug
  const handleTitleChange = (value) => {
    onChange('title', value);
    
    // Auto-generate slug if new article
    if (!formData.id && !formData.slug) {
      onChange('slug', generateSlug(value));
    }
  };

  // Tags management
  const addTag = () => {
    onChange('tags', [...(formData.tags || []), '']);
  };

  const updateTag = (index, value) => {
    const newTags = [...(formData.tags || [])];
    newTags[index] = value;
    onChange('tags', newTags);
  };

  const removeTag = (index) => {
    const newTags = [...(formData.tags || [])];
    newTags.splice(index, 1);
    onChange('tags', newTags);
  };

  // Co-authors management
  const addCoAuthor = (authorId) => {
    if (authorId && !formData.co_authors.includes(authorId)) {
      onChange('co_authors', [...(formData.co_authors || []), authorId]);
    }
  };

  const removeCoAuthor = (authorId) => {
    onChange('co_authors', formData.co_authors.filter(id => id !== authorId));
  };

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Title"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            required
            placeholder="Enter article title"
            error={errors.title}
          />
          
          <div className="relative">
            <Input
              label="Slug"
              value={formData.slug}
              onChange={(e) => onChange('slug', e.target.value)}
              placeholder="auto-generated-from-title"
              error={errors.slug}
            />
            {formData.id && (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onChange('slug', generateSlug(formData.title))}
                className="absolute right-2 top-8"
              >
                Regenerate
              </Button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Excerpt
          </label>
          <textarea
            value={formData.excerpt}
            onChange={(e) => onChange('excerpt', e.target.value)}
            placeholder="Brief description of the article"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-accent"
            rows={3}
            maxLength={300}
          />
          <div className="text-xs text-gray-500 mt-1">
            {formData.excerpt?.length || 0} / 300 characters
          </div>
        </div>

        {/* UPDATED: Author and Category row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Author"
            value={formData.author_id}
            onChange={(value) => onChange('author_id', value)}
            options={[
              { value: '', label: 'Select author...' },
              ...authors.map(author => ({ 
                value: author.id, 
                label: author.full_name 
              }))
            ]}
            error={errors.author_id}
            required
          />

          <Select
            label="Category"
            value={formData.category_id}
            onChange={(value) => onChange('category_id', value)}
            options={[
              { value: '', label: 'Select category...' },
              ...categories.map(cat => ({ value: cat.id, label: cat.name }))
            ]}
            error={errors.category_id}
            required
          />
        </div>

        {/* Co-Authors - UPDATED to exclude main author */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Co-Authors
          </label>
          <Select
            value=""
            onChange={(value) => addCoAuthor(value)}
            options={[
              { value: '', label: 'Add co-author...' },
              ...authors
                .filter(author => 
                  author.id !== formData.author_id &&  // UPDATED: Exclude main author
                  !formData.co_authors.includes(author.id)
                )
                .map(author => ({ value: author.id, label: author.full_name }))
            ]}
          />
          {formData.co_authors.length > 0 && (
            <div className="mt-2 space-y-1">
              {formData.co_authors.map(authorId => {
                const author = authors.find(a => a.id === authorId);
                return (
                  <div key={authorId} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <span className="text-sm">{author?.full_name || 'Unknown'}</span>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => removeCoAuthor(authorId)}
                    >
                      <Icon name="X" size={14} />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tags
          </label>
          {(formData.tags || []).map((tag, index) => (
            <div key={index} className="flex gap-2 mb-2">
              <Input
                value={tag}
                onChange={(e) => updateTag(index, e.target.value)}
                placeholder="Tag name"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeTag(index)}
              >
                <Icon name="X" size={16} />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addTag}
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Add Tag
          </Button>
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* Content Editor */}
      <div>
        <TiptapContentEditor
          value={formData.content}
          onChange={(content) => onChange('content', content)}
          label="Article Content"
          placeholder="Start writing your article..."
          minHeight="400px"
          error={errors.content}
        />
      </div>

      {/* Content Statistics */}
      {formData.content && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Content Statistics</h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Icon name="FileText" size={16} className="text-gray-400" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formData.content.wordCount || 0}
                  </div>
                  <div className="text-xs text-gray-500">Words</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Icon name="Type" size={16} className="text-gray-400" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formData.content.text?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Characters</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Icon name="Clock" size={16} className="text-gray-400" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.ceil((formData.content.wordCount || 0) / 200)}
                  </div>
                  <div className="text-xs text-gray-500">Min Read</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center space-x-2">
                <Icon name="BarChart" size={16} className="text-gray-400" />
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {Math.min(100, Math.round((formData.content.wordCount || 0) / 3))}
                  </div>
                  <div className="text-xs text-gray-500">SEO Score</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentTab;