import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { CheckCircle, DollarSign, Calendar } from 'lucide-react';
import { formatCurrency, calculateAveragePayment } from '@/hooks/usePaymentAnalyticsData';

interface CollectionAnalysisSectionProps {
  analytics: {
    totalAmount: number;
    totalPayments: number;
    currentYearAmount: number;
  };
  collectionEfficiency: number;
}

/**
 * Collection analysis section displaying collection performance metrics
 * Shows collection rate, average payment amount, and year-to-date totals
 */
export default function CollectionAnalysisSection({
  analytics,
  collectionEfficiency,
}: CollectionAnalysisSectionProps) {
  const averagePayment = calculateAveragePayment(analytics.totalAmount, analytics.totalPayments);

  return (
    <TabsContent value="collection" className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Collection Efficiency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Collection Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold text-green-600 mb-2">
                  {collectionEfficiency}%
                </div>
                <p className="text-sm text-muted-foreground">On-time collections</p>
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all duration-1000"
                      style={{ width: `${collectionEfficiency}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Average Payment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Average Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {formatCurrency(averagePayment)}
                </div>
                <p className="text-sm text-muted-foreground">Per transaction</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Year to Date */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Year to Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <div className="text-4xl font-bold mb-2">
                  {formatCurrency(analytics.currentYearAmount)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {new Date().getFullYear()} total
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </TabsContent>
  );
}