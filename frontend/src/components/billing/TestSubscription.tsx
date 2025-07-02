import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TestSubscription() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Test Subscription</CardTitle>
        </CardHeader>
        <CardContent>
          <p>This is a test subscription component.</p>
        </CardContent>
      </Card>
    </div>
  );
}