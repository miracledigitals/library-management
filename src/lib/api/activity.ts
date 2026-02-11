import { useQuery } from "@tanstack/react-query";
import { supabase, assertSupabaseConfigured } from "../supabase";
import { ActivityLog } from "../../types";

export function useRecentActivity(count: number = 10, userId?: string) {
    return useQuery({
        queryKey: ["activity_logs", count, userId],
        queryFn: async () => {
            assertSupabaseConfigured();

            let query = supabase
                .from('activity_logs')
                .select('*')
                .order('timestamp', { ascending: false })
                .limit(count);

            if (userId) {
                query = query.eq('user_id', userId);
            }

            const { data, error } = await query;
            if (error) throw error;

            return (data || []).map(log => ({
                id: log.id,
                type: log.type,
                description: log.description,
                userId: log.user_id,
                targetId: log.target_id,
                metadata: log.metadata,
                timestamp: log.timestamp,
            })) as ActivityLog[];
        },
    });
}
