// src/pages/admin/articles/services/ArticleOperations.js
import { supabase } from '../../../../lib/supabase';
import { generateSlug, sanitizeData, cleanTimestampField } from '../../../../utils/validation';

class ArticleOperationsService {
  // Create article
  async create(articleData, userProfile) {
    try {
        // Define all valid columns from your schema - ADDED: published_at, sort_order, version
        const validColumns = [
        'title', 'slug', 'excerpt', 'content',
        'featured_image', 'featured_image_alt', 'featured_video',
        'author_id', 'co_authors', 'category_id', 'tags',
        'status', 'published_at', 'scheduled_at', 'read_time',
        'is_featured', 'enable_comments', 'enable_reactions',
        'meta_title', 'meta_description', 'meta_keywords',
        'og_title', 'og_description', 'og_image', 'twitter_card', 'canonical_url',
        'schema_markup', 'internal_notes', 'sort_order', 'version',
        'created_by'
        ];

        // Create clean data with only valid columns
        const cleanData = {};
        validColumns.forEach(column => {
        if (articleData[column] !== undefined) {
            cleanData[column] = articleData[column];
        }
        });

        const sanitized = sanitizeData(cleanData);
        
        // Generate slug if not provided
        if (!sanitized.slug && sanitized.title) {
        sanitized.slug = generateSlug(sanitized.title);
        }

        // Auto-generate canonical URL if not provided
        if (!sanitized.canonical_url && sanitized.slug) {
        sanitized.canonical_url = `https://www.rule27design.com/articles/${sanitized.slug}`;
        }

        // Calculate read time if content exists
        if (sanitized.content && sanitized.content.wordCount) {
        sanitized.read_time = Math.ceil(sanitized.content.wordCount / 200);
        }

        // Clean timestamp fields
        if (sanitized.scheduled_at === '') {
        sanitized.scheduled_at = null;
        } else if (sanitized.scheduled_at) {
        sanitized.scheduled_at = cleanTimestampField(sanitized.scheduled_at);
        }

        // ADDED: Handle published_at field
        if (sanitized.published_at === '') {
        sanitized.published_at = null;
        } else if (sanitized.published_at) {
        sanitized.published_at = cleanTimestampField(sanitized.published_at);
        }

        // ADDED: Handle publishing logic
        if (sanitized.status === 'published' && !sanitized.published_at) {
        sanitized.published_at = new Date().toISOString();
        }

        // Set author and creator
        if (userProfile) {
        sanitized.author_id = sanitized.author_id || userProfile.id;
        sanitized.created_by = userProfile.id;
        }

        // ADDED: Initialize version
        sanitized.version = 1;

        // Remove any null or empty string values for array fields
        if (sanitized.tags) {
        sanitized.tags = sanitized.tags.filter(Boolean);
        }
        if (sanitized.meta_keywords) {
        sanitized.meta_keywords = sanitized.meta_keywords.filter(Boolean);
        }
        if (sanitized.co_authors) {
        sanitized.co_authors = sanitized.co_authors.filter(Boolean);
        }

        const { data, error } = await supabase
        .from('articles')
        .insert(sanitized)
        .select()
        .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error creating article:', error);
        return { success: false, error: error.message };
    }
    }

  // Update article
  async update(articleId, articleData, userProfile) {
    try {
        // ADDED: Get current data for version tracking
        const { data: currentData } = await supabase
        .from('articles')
        .select('*')
        .eq('id', articleId)
        .single();

        // Define all valid columns from your schema - ADDED: published_at, sort_order, version
        const validColumns = [
        'title', 'slug', 'excerpt', 'content',
        'featured_image', 'featured_image_alt', 'featured_video',
        'gallery_images',
        'author_id', 'co_authors', 'category_id', 'tags',
        'status', 'submitted_for_approval_at', 'approved_by', 'approved_at',
        'published_at', 'scheduled_at', 'read_time',
        'is_featured', 'enable_comments', 'enable_reactions',
        'view_count', 'unique_view_count', 'like_count', 'share_count', 'bookmark_count',
        'average_read_depth', 'average_time_on_page',
        'meta_title', 'meta_description', 'meta_keywords',
        'og_title', 'og_description', 'og_image', 'twitter_card', 'canonical_url',
        'schema_markup', 'internal_notes', 'sort_order', 'version',
        'created_by', 'updated_by'
        ];

        // Create clean data with only valid columns
        const cleanData = {};
        validColumns.forEach(column => {
        if (articleData[column] !== undefined) {
            cleanData[column] = articleData[column];
        }
        });

        // Sanitize the data
        const sanitized = sanitizeData(cleanData);
        
        // Ensure author_id is set
        if (!sanitized.author_id && userProfile) {
        sanitized.author_id = userProfile.id;
        }
        
        // Calculate read time if content exists
        if (sanitized.content && sanitized.content.wordCount) {
        sanitized.read_time = Math.ceil(sanitized.content.wordCount / 200);
        }

        // Clean timestamp fields
        if (sanitized.scheduled_at === '') {
        sanitized.scheduled_at = null;
        } else if (sanitized.scheduled_at) {
        sanitized.scheduled_at = cleanTimestampField(sanitized.scheduled_at);
        }

        // ADDED: Handle published_at field
        if (sanitized.published_at === '') {
        sanitized.published_at = null;
        } else if (sanitized.published_at) {
        sanitized.published_at = cleanTimestampField(sanitized.published_at);
        }

        // ADDED: Handle status changes and publishing logic
        if (sanitized.status === 'published' && !sanitized.published_at) {
        sanitized.published_at = new Date().toISOString();
        }

        // ADDED: When changing from scheduled to published
        if (sanitized.status === 'published' && currentData?.status === 'scheduled') {
        sanitized.published_at = sanitized.scheduled_at || new Date().toISOString();
        sanitized.scheduled_at = null;
        }

        // ADDED: Handle approval workflow
        if (sanitized.status === 'pending_approval' && currentData?.status !== 'pending_approval') {
        sanitized.submitted_for_approval_at = new Date().toISOString();
        }

        if (sanitized.status === 'approved' && currentData?.status !== 'approved') {
        sanitized.approved_at = new Date().toISOString();
        if (userProfile) {
            sanitized.approved_by = userProfile.id;
        }
        }

        // ADDED: Increment version if not auto-saving
        if (!articleData.auto_save) {
        sanitized.version = (currentData?.version || 1) + 1;
        }

        // Add updated metadata
        sanitized.updated_at = new Date().toISOString();
        if (userProfile) {
        sanitized.updated_by = userProfile.id;
        }

        // Remove any null or empty string values for array fields
        if (sanitized.tags) {
        sanitized.tags = sanitized.tags.filter(Boolean);
        }
        if (sanitized.meta_keywords) {
        sanitized.meta_keywords = sanitized.meta_keywords.filter(Boolean);
        }
        if (sanitized.co_authors) {
        sanitized.co_authors = sanitized.co_authors.filter(Boolean);
        }

        const { data, error } = await supabase
        .from('articles')
        .update(sanitized)
        .eq('id', articleId)
        .select()
        .single();

        if (error) throw error;
        return { success: true, data };
    } catch (error) {
        console.error('Error updating article:', error);
        return { success: false, error: error.message };
    }
    }

  // Delete article
  async delete(articleId) {
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', articleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting article:', error);
      return { success: false, error: error.message };
    }
  }

  // Duplicate an article - UPDATED to include version reset
  async duplicate(article, userProfile) {
    try {
      const duplicatedData = {
        ...article,
        id: undefined, // Remove ID to create new
        title: `${article.title} (Copy)`,
        slug: `${article.slug}-copy-${Date.now()}`,
        status: 'draft',
        view_count: 0,
        unique_view_count: 0,
        like_count: 0,
        comment_count: 0,
        share_count: 0,
        bookmark_count: 0,
        published_at: null,
        scheduled_at: null,
        approved_at: null,
        approved_by: null,
        submitted_for_approval_at: null,
        version: 1, // ADDED: Reset version for duplicated article
        created_at: undefined,
        updated_at: undefined,
        created_by: userProfile.id,
        updated_by: userProfile.id,
        author_id: userProfile.id
      };

      // Remove any system fields
      delete duplicatedData.author;
      delete duplicatedData.category;
      delete duplicatedData.co_authors_data;

      const { data, error } = await supabase
        .from('articles')
        .insert(duplicatedData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error duplicating article:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk publish articles
  async bulkPublish(articleIds) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString()
        })
        .in('id', articleIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk publishing:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk update status
  async bulkUpdateStatus(articleIds, newStatus, userProfile) {
    try {
      const updateData = { 
        status: newStatus,
        updated_by: userProfile?.id
      };

      if (newStatus === 'published') {
        updateData.published_at = new Date().toISOString();
      } else if (newStatus === 'pending_approval') {
        updateData.submitted_for_approval_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('articles')
        .update(updateData)
        .in('id', articleIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk updating status:', error);
      return { success: false, error: error.message };
    }
  }

  // All your existing methods remain exactly the same from here...
  // Bulk archive articles
  async bulkArchive(articleIds) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({ 
          status: 'archived',
          archived_at: new Date().toISOString()
        })
        .in('id', articleIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk archiving:', error);
      return { success: false, error: error.message };
    }
  }

  // Bulk delete articles
  async bulkDelete(articleIds) {
    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .in('id', articleIds);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error bulk deleting:', error);
      return { success: false, error: error.message };
    }
  }

  // Schedule article for publishing
  async scheduleArticle(articleId, scheduledDate, userProfile) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          scheduled_at: scheduledDate,
          status: 'scheduled',
          updated_by: userProfile?.id
        })
        .eq('id', articleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error scheduling article:', error);
      return { success: false, error: error.message };
    }
  }

  // Generate and update article slug
  async updateSlug(articleId, title, userProfile) {
    try {
      const newSlug = generateSlug(title);
      
      // Check if slug already exists
      const { data: existingArticle } = await supabase
        .from('articles')
        .select('id')
        .eq('slug', newSlug)
        .neq('id', articleId)
        .single();

      const finalSlug = existingArticle ? `${newSlug}-${Date.now()}` : newSlug;

      const { error } = await supabase
        .from('articles')
        .update({
          slug: finalSlug,
          updated_by: userProfile?.id
        })
        .eq('id', articleId);

      if (error) throw error;
      return { success: true, slug: finalSlug };
    } catch (error) {
      console.error('Error updating slug:', error);
      return { success: false, error: error.message };
    }
  }

  // Toggle article featured status
  async toggleFeatured(articleId, currentStatus, userProfile) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          is_featured: !currentStatus,
          updated_by: userProfile?.id
        })
        .eq('id', articleId);

      if (error) throw error;
      return { success: true, featured: !currentStatus };
    } catch (error) {
      console.error('Error toggling featured status:', error);
      return { success: false, error: error.message };
    }
  }

  // Update article view count
  async incrementViewCount(articleId) {
    try {
      // Get current view count
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('view_count')
        .eq('id', articleId)
        .single();

      if (fetchError) throw fetchError;

      // Increment view count
      const { error } = await supabase
        .from('articles')
        .update({
          view_count: (article.view_count || 0) + 1
        })
        .eq('id', articleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error incrementing view count:', error);
      // Don't return error for background operation
      return { success: false, error: error.message };
    }
  }

  // Update article like count
  async incrementLikeCount(articleId) {
    try {
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('like_count')
        .eq('id', articleId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('articles')
        .update({
          like_count: (article.like_count || 0) + 1
        })
        .eq('id', articleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error incrementing like count:', error);
      return { success: false, error: error.message };
    }
  }

  // Update article share count
  async incrementShareCount(articleId) {
    try {
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('share_count')
        .eq('id', articleId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('articles')
        .update({
          share_count: (article.share_count || 0) + 1
        })
        .eq('id', articleId);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error incrementing share count:', error);
      return { success: false, error: error.message };
    }
  }

  // Export articles
  async exportArticles(articleIds = null, format = 'csv') {
    try {
      let query = supabase
        .from('articles')
        .select(`
          *,
          author:profiles!articles_author_id_fkey(id, full_name, email),
          category:categories!articles_category_id_fkey(id, name, slug)
        `);

      if (articleIds) {
        query = query.in('id', articleIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      let exportData;
      let filename;
      let mimeType;

      switch (format) {
        case 'csv':
          exportData = this.convertToCSV(data);
          filename = `articles-export-${Date.now()}.csv`;
          mimeType = 'text/csv';
          break;
          
        case 'json':
          exportData = JSON.stringify(data, null, 2);
          filename = `articles-export-${Date.now()}.json`;
          mimeType = 'application/json';
          break;

        case 'markdown':
          exportData = this.convertToMarkdown(data);
          filename = `articles-export-${Date.now()}.md`;
          mimeType = 'text/markdown';
          break;

        default:
          throw new Error('Unsupported export format');
      }

      // Create and download file
      const blob = new Blob([exportData], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error exporting articles:', error);
      return { success: false, error: error.message };
    }
  }

  // Convert to CSV format
  convertToCSV(data) {
    if (!data || data.length === 0) return '';
    
    // Define CSV headers
    const headers = [
      'Title',
      'Slug',
      'Status',
      'Author',
      'Category',
      'Tags',
      'Featured',
      'Views',
      'Likes',
      'Comments',
      'Shares',
      'Read Time',
      'Created',
      'Updated',
      'Published'
    ];
    
    const csvHeaders = headers.join(',');
    
    const csvRows = data.map(article => {
      const row = [
        this.escapeCSV(article.title),
        this.escapeCSV(article.slug),
        article.status,
        this.escapeCSV(article.author?.full_name || 'Unknown'),
        this.escapeCSV(article.category?.name || 'None'),
        this.escapeCSV((article.tags || []).join('; ')),
        article.is_featured ? 'Yes' : 'No',
        article.view_count || 0,
        article.like_count || 0,
        article.comment_count || 0,
        article.share_count || 0,
        article.read_time ? `${article.read_time} min` : 'N/A',
        new Date(article.created_at).toLocaleDateString(),
        new Date(article.updated_at).toLocaleDateString(),
        article.published_at ? new Date(article.published_at).toLocaleDateString() : 'Not published'
      ];
      
      return row.join(',');
    });
    
    return [csvHeaders, ...csvRows].join('\n');
  }

  // Convert to Markdown format
  convertToMarkdown(data) {
    if (!data || data.length === 0) return '';
    
    let markdown = '# Articles Export\n\n';
    markdown += `*Exported on ${new Date().toLocaleString()}*\n\n`;
    markdown += `**Total Articles:** ${data.length}\n\n`;
    markdown += '---\n\n';
    
    data.forEach((article, index) => {
      markdown += `## ${index + 1}. ${article.title}\n\n`;
      markdown += `- **Status:** ${article.status}\n`;
      markdown += `- **Author:** ${article.author?.full_name || 'Unknown'}\n`;
      markdown += `- **Category:** ${article.category?.name || 'None'}\n`;
      markdown += `- **Tags:** ${(article.tags || []).join(', ') || 'None'}\n`;
      markdown += `- **Featured:** ${article.is_featured ? 'Yes' : 'No'}\n`;
      markdown += `- **Views:** ${article.view_count || 0}\n`;
      markdown += `- **Likes:** ${article.like_count || 0}\n`;
      markdown += `- **Read Time:** ${article.read_time ? `${article.read_time} minutes` : 'N/A'}\n`;
      markdown += `- **Created:** ${new Date(article.created_at).toLocaleDateString()}\n`;
      
      if (article.published_at) {
        markdown += `- **Published:** ${new Date(article.published_at).toLocaleDateString()}\n`;
      }
      
      if (article.excerpt) {
        markdown += `\n**Excerpt:**\n> ${article.excerpt}\n`;
      }
      
      if (article.content && article.content.text) {
        const preview = article.content.text.substring(0, 200);
        markdown += `\n**Content Preview:**\n${preview}${article.content.text.length > 200 ? '...' : ''}\n`;
      }
      
      markdown += '\n---\n\n';
    });
    
    return markdown;
  }

  // Escape CSV values
  escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    
    // Escape quotes and wrap in quotes if contains comma, newline, or quotes
    if (stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('"')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  }

  // Import articles from CSV
  async importFromCSV(csvData, userProfile) {
    try {
      const lines = csvData.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const articles = [];
      
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        
        const values = this.parseCSVLine(lines[i]);
        const article = {};
        
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          
          switch (header.toLowerCase()) {
            case 'title':
              article.title = value;
              break;
            case 'slug':
              article.slug = value || generateSlug(article.title);
              break;
            case 'status':
              article.status = value || 'draft';
              break;
            case 'excerpt':
              article.excerpt = value;
              break;
            case 'content':
              article.content = value ? { html: value, text: value.replace(/<[^>]*>/g, '') } : null;
              break;
            case 'tags':
              article.tags = value ? value.split(';').map(t => t.trim()) : [];
              break;
            case 'featured':
              article.is_featured = value?.toLowerCase() === 'yes';
              break;
          }
        });
        
        // Add metadata
        article.author_id = userProfile.id;
        article.created_by = userProfile.id;
        article.updated_by = userProfile.id;
        article.version = 1; // ADDED: Set initial version for imported articles
        
        articles.push(article);
      }
      
      // Bulk insert
      const { data, error } = await supabase
        .from('articles')
        .insert(articles)
        .select();
      
      if (error) throw error;
      
      return { success: true, imported: data.length };
    } catch (error) {
      console.error('Error importing articles:', error);
      return { success: false, error: error.message };
    }
  }

  // Parse CSV line handling quoted values
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current);
    return result;
  }

  // Get article statistics
  async getStatistics(dateRange = null) {
    try {
      let query = supabase
        .from('articles')
        .select('*', { count: 'exact' });
      
      if (dateRange) {
        if (dateRange.start) {
          query = query.gte('created_at', dateRange.start);
        }
        if (dateRange.end) {
          query = query.lte('created_at', dateRange.end);
        }
      }
      
      const { data, error, count } = await query;
      if (error) throw error;
      
      const stats = {
        total: count || 0,
        byStatus: {},
        byCategory: {},
        byAuthor: {},
        featured: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        avgReadTime: 0,
        avgWordCount: 0
      };
      
      data.forEach(article => {
        // Status breakdown
        stats.byStatus[article.status] = (stats.byStatus[article.status] || 0) + 1;
        
        // Category breakdown
        if (article.category_id) {
          stats.byCategory[article.category_id] = (stats.byCategory[article.category_id] || 0) + 1;
        }
        
        // Author breakdown
        stats.byAuthor[article.author_id] = (stats.byAuthor[article.author_id] || 0) + 1;
        
        // Featured count
        if (article.is_featured) stats.featured++;
        
        // Engagement metrics
        stats.totalViews += article.view_count || 0;
        stats.totalLikes += article.like_count || 0;
        stats.totalComments += article.comment_count || 0;
        
        // Content metrics
        if (article.read_time) {
          stats.avgReadTime += article.read_time;
        }
        if (article.content && article.content.wordCount) {
          stats.avgWordCount += article.content.wordCount;
        }
      });
      
      // Calculate averages
      if (data.length > 0) {
        stats.avgReadTime = Math.round(stats.avgReadTime / data.length);
        stats.avgWordCount = Math.round(stats.avgWordCount / data.length);
      }
      
      return { success: true, stats };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return { success: false, error: error.message };
    }
  }
}

export const articleOperations = new ArticleOperationsService();