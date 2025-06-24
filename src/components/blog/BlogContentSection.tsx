import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { BlogArticle } from '@/hooks/useBlogArticleData';

interface BlogContentSectionProps {
  article: BlogArticle;
  processedContent: string;
  fadeInUp: {
    initial: { opacity: number; y: number };
    animate: { opacity: number; y: number };
    transition: { duration: number };
  };
}

/**
 * Blog article main content section with article body, tags, and call-to-action
 * Renders processed HTML content with styling and promotional components
 */
export default function BlogContentSection({ 
  article, 
  processedContent, 
  fadeInUp 
}: BlogContentSectionProps) {
  return (
    <motion.article {...fadeInUp} className="lg:col-span-3">
      {/* Article Content */}
      <div className="prose prose-lg max-w-none">
        <div 
          className="article-content"
          dangerouslySetInnerHTML={{ __html: processedContent }} 
        />
      </div>

      <Separator className="my-8" />

      {/* Tags */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm font-medium">Tags:</span>
        {article.tags.map((tag) => (
          <Badge key={tag} variant="outline">{tag}</Badge>
        ))}
      </div>

      {/* Call-to-Action */}
      <Card className="bg-gradient-to-r from-primary/10 to-accent/10">
        <CardHeader>
          <CardTitle>Ready to Streamline Your Property Management?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            TenantFlow helps you implement these best practices with automated workflows, 
            legal compliance tools, and professional communication features.
          </p>
          <div className="flex gap-4">
            <Link to="/pricing">
              <Button>Start Free Trial</Button>
            </Link>
            <Link to="/lease-generator">
              <Button variant="outline">Try Lease Generator</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.article>
  );
}