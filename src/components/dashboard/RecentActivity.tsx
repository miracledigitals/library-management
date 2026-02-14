"use client";

import { useRecentActivity } from "@/lib/api/activity";
import { formatDistanceToNow } from "date-fns";
import {
    BookOpen,
    RotateCcw,
    UserPlus,
    AlertTriangle,
    Info,
    Bell
} from "lucide-react";

export function RecentActivity({ userId }: { userId?: string }) {
    const { data: logs, isLoading } = useRecentActivity(6, userId);

    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="h-10 w-10 rounded-full bg-muted" />
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 w-3/4 bg-muted rounded" />
                            <div className="h-3 w-1/2 bg-muted rounded" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!logs || logs.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground italic">
                No recent activity logged.
            </div>
        );
    }

    const getIcon = (type: string) => {
        switch (type) {
            case "checkout": return <BookOpen className="h-5 w-5 text-blue-500" />;
            case "return": return <RotateCcw className="h-5 w-5 text-emerald-500" />;
            case "borrow_request": return <BookOpen className="h-5 w-5 text-indigo-500" />;
            case "request_approved": return <BookOpen className="h-5 w-5 text-emerald-500" />;
            case "request_denied": return <BookOpen className="h-5 w-5 text-rose-500" />;
            case "return_request": return <RotateCcw className="h-5 w-5 text-indigo-500" />;
            case "return_approved": return <RotateCcw className="h-5 w-5 text-emerald-500" />;
            case "return_denied": return <RotateCcw className="h-5 w-5 text-rose-500" />;
            case "due_soon": return <Bell className="h-5 w-5 text-amber-500" />;
            case "register": return <UserPlus className="h-5 w-5 text-indigo-500" />;
            case "fine": return <AlertTriangle className="h-5 w-5 text-amber-500" />;
            default: return <Info className="h-5 w-5 text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-4">
            {logs.map((log) => (
                <div key={log.id} className="flex gap-4 group">
                    <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center shrink-0">
                        {getIcon(log.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">
                            {log.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
}
