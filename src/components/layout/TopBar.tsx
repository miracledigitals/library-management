"use client";

import { Bell, Search, User, Settings, LogOut, UserCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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

export function TopBar() {
    const { user, profile, logout } = useAuth();

    return (
        <header className="flex h-16 items-center justify-between border-b bg-background px-6">
            <div className="relative w-96">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Global search (Ctrl+K)..."
                    className="w-full bg-muted pl-8 md:w-[300px] lg:w-[400px]"
                />
            </div>

            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    <span className="absolute right-2 top-2 flex h-2 w-2 rounded-full bg-destructive" />
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-accent rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={(user as any)?.user_metadata?.avatar_url || ""} />
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
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <Link href="/profile">
                            <DropdownMenuItem className="cursor-pointer">
                                <UserCircle className="mr-2 h-4 w-4" />
                                <span>Profile</span>
                            </DropdownMenuItem>
                        </Link>
                        <Link href="/settings">
                            <DropdownMenuItem className="cursor-pointer">
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Settings</span>
                            </DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => logout()} className="text-destructive cursor-pointer">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
