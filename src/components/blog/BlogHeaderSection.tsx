import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  User,
  ArrowLeft,
  Share2,
  ChevronRight
} from 'lucide-react';
import type { BlogArticle } from '@/hooks/useBlogArticleData';
import { formatArticleDate } from '@/hooks/useBlogArticleData';

interface BlogHeaderSectionProps {
  article: BlogArticle;
  fadeInUp: {
    initial: { opacity: number; y: number };
    animate: { opacity: number; y: number };
    transition: { duration: number };
  };
}

/**
 * Blog article header section with breadcrumbs, title, metadata, and share button
 * Displays article category, title, author info, read time, and publication date
 */
export default function BlogHeaderSection({ article, fadeInUp }: BlogHeaderSectionProps) {
  return (
    <div className="border-b bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div {...fadeInUp}>
          {/* Breadcrumbs */}
          <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
            <Link to="/" className="hover:text-foreground">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/blog" className="hover:text-foreground">Blog</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground">{article.category}</span>
          </nav>

          {/* Title Section */}
          <div className="flex items-center gap-4 mb-6">
            <Link to="/blog">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <Badge variant="secondary" className="mb-2">{article.category}</Badge>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{article.title}</h1>
            </div>
          </div>

          {/* Metadata and Share */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {article.author}
              </span>
              <span className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {article.readTime}
              </span>
              <span>{formatArticleDate(article.publishedAt)}</span>
            </div>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}