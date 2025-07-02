import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { SEO } from '@/components/seo/SEO';
import { useBlogArticleData } from '@/hooks/useBlogArticleData';
import { useBlogSEO } from '@/hooks/useBlogSEO';
import BlogHeaderSection from '@/components/blog/BlogHeaderSection';
import BlogContentSection from '@/components/blog/BlogContentSection';
import BlogSidebarSection from '@/components/blog/BlogSidebarSection';

/**
 * Blog article page component
 * Displays full blog articles with SEO optimization and structured layout
 */
export default function BlogArticle() {
  const { slug } = useParams<{ slug: string }>();
  
  // Get article data and validation
  const { article, isValidSlug, processedContent, fadeInUp } = useBlogArticleData({ slug });
  
  // Get SEO configuration (must be called before any early returns)
  const { seoConfig } = useBlogSEO({ article: article!, slug: slug! });
  
  // Handle invalid article slugs
  if (!isValidSlug) {
    return <Navigate to="/blog" replace />;
  }

  return (
    <>
      <SEO {...seoConfig} />

      <div className="min-h-screen bg-background">
        <BlogHeaderSection article={article!} fadeInUp={fadeInUp} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
            <div className="lg:col-span-2">
              <BlogContentSection 
                article={article!} 
                processedContent={processedContent} 
                fadeInUp={fadeInUp} 
              />
            </div>
            <div className="lg:col-span-1">
              <BlogSidebarSection currentSlug={slug!} fadeInUp={fadeInUp} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}