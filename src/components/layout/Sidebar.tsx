"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    Book,
    ArrowRightLeft,
    RotateCcw,
    BarChart3,
    Settings,
    FileText,
    UserPlus
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["admin", "librarian", "patron"] },
    { name: "Books", href: "/books", icon: Book, roles: ["admin", "librarian", "patron"] },
    { name: "Checkout", href: "/checkout", icon: ArrowRightLeft, roles: ["admin", "librarian"] },
    { name: "Returns", href: "/returns", icon: RotateCcw, roles: ["admin", "librarian"] },
    { name: "Requests", href: "/requests", icon: FileText, roles: ["admin", "librarian"] },
    { name: "Admin Onboarding", href: "/patrons/manual", icon: UserPlus, roles: ["admin"] },
    { name: "Reports", href: "/reports", icon: BarChart3, roles: ["admin"] },
];

export function Sidebar({ className, onNavigate }: { className?: string; onNavigate?: () => void }) {
    const pathname = usePathname();
    const { profile } = useAuth();

    const filteredItems = navItems.filter(item =>
        profile && item.roles.includes(profile.role)
    );

    return (
        <div className={cn("flex h-full w-64 flex-col border-r bg-card text-card-foreground", className)}>
            <div className="flex h-16 items-center border-b px-6">
                <Link href="/" className="flex items-center gap-2 font-bold text-xl">
                    <Book className="h-6 w-6 text-primary" />
                    <span>LMS Pro</span>
                </Link>
            </div>
            <nav className="flex-1 space-y-1 p-4">
                {filteredItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-primary text-primary-foreground font-semibold"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
            <div className="border-t p-4">
                <Link
                    href="/settings"
                    onClick={onNavigate}
                    className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors",
                        pathname === "/settings" && "bg-accent text-accent-foreground"
                    )}
                >
                    <Settings className="h-5 w-5" />
                    Settings
                </Link>
            </div>
        </div>
    );
}
