import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isSupabaseConfigured } from "../supabase";
import { UserProfile } from "../../types";

export function useUpdateProfile() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, displayName }: { id: string; displayName: string }) => {
            if (!isSupabaseConfigured) {
                // Mock update for demo mode
                console.log("Mock profile update for:", id, "New name:", displayName);
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .update({ display_name: displayName, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            // Invalidate profile queries if any exist, or just rely on AuthContext refresh
            // Since AuthContext listens to auth state, we might need to manually trigger a refresh
            // for the profile state in AuthContext if it doesn't auto-update.
            // But for now, invalidating common queries is good practice.
            queryClient.invalidateQueries({ queryKey: ["profile"] });
        },
    });
}
