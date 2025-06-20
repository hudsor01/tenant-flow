import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoginForm } from '@/components/login-form';
import { SignupForm } from '@/components/signup-form';
import { CurrentUserAvatar } from '@/components/current-user-avatar';
import PropertyFileUpload from '@/components/properties/PropertyFileUpload';
import TenantDocumentUpload from '@/components/tenants/TenantDocumentUpload';
import ProfileImageUpload from '@/components/profile/ProfileImageUpload';
import { useInfiniteQuery } from '@/hooks/use-infinite-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { User, Upload, FileText, Users, Camera, Settings, Palette } from 'lucide-react';

export default function ComponentDemo() {
  // Demo the infinite query hook with User table
  const {
    data: users,
    isLoading,
    hasMore,
    fetchNextPage,
  } = useInfiniteQuery({
    tableName: 'User',
    columns: 'id, name, email, createdAt',
    pageSize: 5,
  });

  return (
    <div className="container mx-auto py-8 space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-4"
      >
        <h1 className="text-4xl font-bold tracking-tight">
          Supabase UI Components Demo
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Explore the new Supabase UI components integrated into TenantFlow
        </p>
        <Badge variant="secondary" className="px-4 py-2">
          <Palette className="h-4 w-4 mr-2" />
          Built with shadcn/ui + Supabase
        </Badge>
      </motion.div>

      <Tabs defaultValue="auth" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="auth" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Authentication
          </TabsTrigger>
          <TabsTrigger value="uploads" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            File Uploads
          </TabsTrigger>
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="infinite" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Infinite Query
          </TabsTrigger>
          <TabsTrigger value="avatar" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            User Avatar
          </TabsTrigger>
        </TabsList>

        {/* Authentication Components */}
        <TabsContent value="auth" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Login Form</CardTitle>
                  <CardDescription>
                    Professional login form with Supabase integration
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <LoginForm />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Signup Form</CardTitle>
                  <CardDescription>
                    Complete registration with password confirmation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SignupForm />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* File Upload Components */}
        <TabsContent value="uploads" className="space-y-6">
          <div className="grid gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <PropertyFileUpload
                propertyId="demo-property"
                onUploadComplete={(urls) => {
                  console.log('Property files uploaded:', urls);
                }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <TenantDocumentUpload
                tenantId="demo-tenant"
                leaseId="demo-lease"
                onUploadComplete={(urls) => {
                  console.log('Tenant documents uploaded:', urls);
                }}
              />
            </motion.div>
          </div>
        </TabsContent>

        {/* Profile Components */}
        <TabsContent value="profile" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <ProfileImageUpload
              onUploadComplete={(url) => {
                console.log('Profile image uploaded:', url);
              }}
            />
          </motion.div>
        </TabsContent>

        {/* Infinite Query Demo */}
        <TabsContent value="infinite" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Infinite Query Hook Demo</CardTitle>
                <CardDescription>
                  Demonstrates pagination with the useInfiniteQuery hook
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading && (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-muted-foreground">Loading users...</p>
                  </div>
                )}

                {users && users.length > 0 && (
                  <div className="space-y-3">
                    {users.map((user: any, index: number) => (
                      <motion.div
                        key={user.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{user.name || 'Unnamed User'}</h3>
                          <Badge variant="outline">{user.id.slice(0, 8)}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(user.createdAt).toLocaleDateString()}
                        </p>
                      </motion.div>
                    ))}

                    <Separator />

                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-4">
                        Showing {users.length} users
                      </p>
                      {hasMore && (
                        <Button onClick={fetchNextPage} variant="outline">
                          Load More Users
                        </Button>
                      )}
                      {!hasMore && users.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          No more users to load
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {users && users.length === 0 && !isLoading && (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        {/* Current User Avatar */}
        <TabsContent value="avatar" className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-6"
          >
            <Card className="max-w-sm mx-auto">
              <CardHeader>
                <CardTitle>Current User Avatar</CardTitle>
                <CardDescription>
                  Automatically displays current user's profile image with fallback initials
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <CurrentUserAvatar />
                  </div>
                  <div className="text-center text-sm text-muted-foreground">
                    Auto-synced with auth store
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Integration Benefits</CardTitle>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4 text-left">
                <div className="space-y-2">
                  <h4 className="font-medium">📁 File Upload</h4>
                  <p className="text-sm text-muted-foreground">
                    Drag & drop interface with progress tracking, multiple file support, and automatic Supabase Storage integration.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">🔐 Authentication</h4>
                  <p className="text-sm text-muted-foreground">
                    Pre-built forms with validation, error handling, and seamless integration with existing auth system.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">♾️ Infinite Queries</h4>
                  <p className="text-sm text-muted-foreground">
                    Efficient pagination with automatic deduplication and optimistic loading states.
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">👤 User Management</h4>
                  <p className="text-sm text-muted-foreground">
                    Automatic avatar generation with fallbacks and real-time sync with user profile data.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}