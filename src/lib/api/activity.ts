import { useQuery } from "@tanstack/react-query";
import {
    getDocs,
    query,
    orderBy,
    limit
} from "firebase/firestore";
import { activityLogsRef } from "../firestore";
import { ActivityLog } from "../../types";

import { where } from "firebase/firestore";

export function useRecentActivity(count: number = 10, userId?: string) {
    return useQuery({
        queryKey: ["activity_logs", count, userId],
        queryFn: async () => {
            let q = query(activityLogsRef, orderBy("timestamp", "desc"), limit(count));

            if (userId) {
                q = query(activityLogsRef, where("userId", "==", userId), orderBy("timestamp", "desc"), limit(count));
            }

            const querySnapshot = await getDocs(q);
            return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ActivityLog));
        },
    });
}
