"use client";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell
} from "recharts";

const checkoutData = [
    { name: "Mon", value: 12 },
    { name: "Tue", value: 18 },
    { name: "Wed", value: 15 },
    { name: "Thu", value: 25 },
    { name: "Fri", value: 32 },
    { name: "Sat", value: 40 },
    { name: "Sun", value: 20 },
];

const popularBooks = [
    { title: "Clean Code", checkouts: 45 },
    { title: "Refactoring", checkouts: 38 },
    { title: "Next.js Pro", checkouts: 32 },
    { title: "The Hobbit", checkouts: 30 },
    { title: "TypeScript In Depth", checkouts: 28 },
];

const genreData = [
    { name: "Fiction", value: 400 },
    { name: "Technology", value: 300 },
    { name: "Science", value: 200 },
    { name: "History", value: 100 },
];

const COLORS = ["#4F46E5", "#10B981", "#F59E0B", "#F43F5E"];

export default function ReportsPage() {
    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl font-bold tracking-tight">Reports & Analytics</h1>
                    <p className="text-muted-foreground">Insights into library usage and collection performance.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Checkout Trends (Last 7 Days)</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={checkoutData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#4F46E5"
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 6 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Popular Books</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={popularBooks} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="title" type="category" width={100} fontSize={12} />
                                    <Tooltip />
                                    <Bar dataKey="checkouts" fill="#10B981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Collection by Genre</CardTitle>
                        </CardHeader>
                        <CardContent className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={genreData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {genreData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Inventory Summary</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="flex flex-col gap-2 text-center bg-muted/50 p-3 rounded-lg sm:flex-row sm:items-center sm:justify-between sm:text-left">
                                <span className="text-sm font-medium">Total Collection Value</span>
                                <span className="font-bold text-lg">$14,250.00</span>
                            </div>
                            <div className="flex flex-col gap-2 text-center bg-muted/50 p-3 rounded-lg sm:flex-row sm:items-center sm:justify-between sm:text-left">
                                <span className="text-sm font-medium">Lost Replacement Fund</span>
                                <span className="font-bold text-lg text-rose-600">$500.00</span>
                            </div>
                            <div className="flex flex-col gap-2 text-center bg-muted/50 p-3 rounded-lg sm:flex-row sm:items-center sm:justify-between sm:text-left">
                                <span className="text-sm font-medium">Outstanding Fines</span>
                                <span className="font-bold text-lg text-amber-600">$125.40</span>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
