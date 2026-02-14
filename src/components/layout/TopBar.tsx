"use client";

import { Bell, Search, Settings, LogOut, UserCircle, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/Sidebar";
import { useRecentActivity } from "@/lib/api/activity";
import { useActiveCheckouts, usePatronCheckouts } from "@/lib/api/checkouts";
import { usePatronByEmail } from "@/lib/api/patrons";
import { format, formatDistanceToNow, isAfter } from "date-fns";

export function TopBar() {
    const { user, profile, logout } = useAuth();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const isAdmin = profile?.role === "admin" || profile?.role === "librarian";
    const patronEmail = profile?.email || user?.email || "";
    const { data: patron } = usePatronByEmail(patronEmail);
    const { data: patronCheckouts } = usePatronCheckouts(patron?.id);
    const { data: activeCheckouts } = useActiveCheckouts();
    const { data: activityLogs } = useRecentActivity(8, isAdmin ? undefined : user?.id);
    const metadata = user?.user_metadata;
    const avatarUrl =
        typeof metadata === "object" &&
        metadata !== null &&
        "avatar_url" in metadata
            ? String((metadata as Record<string, unknown>).avatar_url ?? "")
            : "";

    const language = profile?.language || "English";
    const translations: Record<string, Record<string, string>> = {
        English: {
            searchPlaceholder: "Global search (Ctrl+K)...",
            notifications: "Notifications",
            noNotifications: "No new notifications.",
            myAccount: "My Account",
            profile: "Profile",
            settings: "Settings",
            logout: "Log out",
            dueSoonPatron: 'Your book "{title}" is due on {date}',
            dueSoonAdmin: '{patron} has "{title}" due on {date}'
        },
        Yoruba: {
            searchPlaceholder: "Wa gbogbo (Ctrl+K)...",
            notifications: "Ìkìlọ̀",
            noNotifications: "Ko sí ìkìlọ̀ tuntun.",
            myAccount: "Akọọlẹ mi",
            profile: "Profaili",
            settings: "Eto",
            logout: "Jade",
            dueSoonPatron: 'Ìwé rẹ "{title}" yẹ kí o da padà ní {date}',
            dueSoonAdmin: '{patron} ní "{title}" tó yẹ kí ó da padà ní {date}'
        }
    };

    const t = (key: string) => translations[language]?.[key] || translations.English[key] || key;

    const dueSoonThresholdDays = 3;
    const dueSoonCheckouts = (isAdmin ? activeCheckouts : patronCheckouts)?.filter((checkout) => {
        const dueDate = new Date(checkout.dueDate);
        const now = new Date();
        if (isAfter(now, dueDate)) return false;
        const diffMs = dueDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        return diffDays <= dueSoonThresholdDays;
    }) || [];

    const dueSoonNotifications = dueSoonCheckouts.map((checkout) => ({
        id: `due-${checkout.id}`,
        type: "due_soon",
        description: isAdmin
            ? t("dueSoonAdmin")
                .replace("{patron}", checkout.patronName)
                .replace("{title}", checkout.bookTitle)
                .replace("{date}", format(new Date(checkout.dueDate), "MMM dd"))
            : t("dueSoonPatron")
                .replace("{title}", checkout.bookTitle)
                .replace("{date}", format(new Date(checkout.dueDate), "MMM dd")),
        timestamp: checkout.dueDate
    }));

    const activityNotifications = (activityLogs || []).map((log) => ({
        id: log.id,
        type: log.type,
        description: log.description,
        timestamp: log.timestamp
    }));

    const notifications = [...dueSoonNotifications, ...activityNotifications]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 6);

    return (
        <header className="flex items-center gap-3 border-b bg-background px-4 py-3 lg:h-16 lg:px-6 lg:py-0">
            <div className="flex items-center gap-2">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                    <SheetTrigger asChild>
                        <Button variant="ghost" size="icon" className="lg:hidden">
                            <Menu className="h-5 w-5" />
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="p-0">
                        <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                        <Sidebar className="w-full border-r-0" onNavigate={() => setMobileNavOpen(false)} />
                    </SheetContent>
                </Sheet>
            </div>

            <div className="relative flex-1 lg:flex-none lg:w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder={t("searchPlaceholder")}
                    className="w-full bg-muted pl-8 lg:w-[300px] xl:w-[400px]"
                />
            </div>

            <div className="flex items-center gap-3 lg:gap-4">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="relative">
                            <Bell className="h-5 w-5" />
                            {notifications.length > 0 && (
                                <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-destructive" />
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-80">
                        <DropdownMenuLabel>{t("notifications")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {notifications.length === 0 ? (
                            <div className="px-3 py-4 text-sm text-muted-foreground">
                                {t("noNotifications")}
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 py-2">
                                    <span className="text-sm font-medium">{notification.description}</span>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                                    </span>
                                </DropdownMenuItem>
                            ))
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-accent rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={avatarUrl} />
                                <AvatarFallback className="bg-primary text-primary-foreground">
                                    {user?.email?.substring(0, 2).toUpperCase() || "LMS"}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col items-start text-xs hidden sm:flex">
                                <span className="font-semibold">{profile?.displayName || user?.email}</span>
                                <span className="text-muted-foreground capitalize">{profile?.role}</span>
                            </div>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>{t("myAccount")}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/profile">
                            <DropdownMenuItem className="cursor-pointer">
                                <UserCircle className="mr-2 h-4 w-4" />
                                <span>{t("profile")}</span>
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>{t("settings")}</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t("logout")}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
