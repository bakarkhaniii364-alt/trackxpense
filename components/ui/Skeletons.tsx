import React from 'react';

export const SkeletonPulse = ({ className }: { className: string }) => (
    <div className={`animate-pulse bg-surface/50 ${className}`} />
);

export const AppSkeleton = () => (
    <div className="h-full w-full bg-dark p-5 pt-safe space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-3">
                <SkeletonPulse className="w-10 h-10 rounded-full" />
                <div className="space-y-2">
                    <SkeletonPulse className="w-20 h-3 rounded" />
                    <SkeletonPulse className="w-32 h-5 rounded" />
                </div>
            </div>
             <SkeletonPulse className="w-24 h-8 rounded-full" />
        </div>
        <SkeletonPulse className="w-full h-48 rounded-md" />
        <div className="flex gap-4">
             <SkeletonPulse className="flex-1 h-20 rounded-sm" />
             <SkeletonPulse className="flex-1 h-20 rounded-sm" />
        </div>
        <div className="space-y-4">
            <SkeletonPulse className="w-32 h-4 rounded" />
            <SkeletonPulse className="w-full h-16 rounded-sm" />
            <SkeletonPulse className="w-full h-16 rounded-sm" />
            <SkeletonPulse className="w-full h-16 rounded-sm" />
        </div>
    </div>
);
