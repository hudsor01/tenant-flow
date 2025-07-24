import { Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft } from 'lucide-react';

export function NotFoundPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 md:p-12">
                <div className="flex flex-col items-center text-center space-y-6">
                    <div className="relative">
                        <div className="text-[120px] md:text-[180px] font-bold text-slate-200 dark:text-slate-700 select-none">
                            404
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-20 w-20 md:h-24 md:w-24 text-slate-400 dark:text-slate-500" />
                        </div>
                    </div>
                    
                    <div className="space-y-3">
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                            Page Not Found
                        </h1>
                        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-md">
                            The page you're looking for doesn't exist or has been moved. 
                            Let's get you back on track.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                        <Link to="/">
                            <Button className="flex items-center gap-2">
                                <Home className="h-4 w-4" />
                                Go to Dashboard
                            </Button>
                        </Link>
                        <Button
                            onClick={() => window.history.back()}
                            variant="outline"
                            className="flex items-center gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Go Back
                        </Button>
                    </div>

                    <div className="pt-8 text-sm text-slate-500 dark:text-slate-400">
                        <p>Need help? Contact support at{' '}
                            <a 
                                href="mailto:support@tenantflow.com" 
                                className="text-primary hover:underline"
                            >
                                support@tenantflow.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}