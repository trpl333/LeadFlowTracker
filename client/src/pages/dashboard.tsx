import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, TrendingUp, CheckCircle2, XCircle, Search, Calendar } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncStatus } from "@/components/sync-status";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadCard } from "@/components/lead-card";
import { StatsCard } from "@/components/stats-card";
import { FilterTabs } from "@/components/filter-tabs";
import { EmptyState } from "@/components/empty-state";
import { AnalyticsSection } from "@/components/analytics-section";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import type { Lead, InsertLead, LeadStage } from "@shared/schema";
import { format } from "date-fns";

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: InsertLead): Promise<void> => {
      await apiRequest("POST", "/api/leads", lead);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead added",
        description: "The lead has been added and synced to Google Sheets.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleMilestoneMutation = useMutation({
    mutationFn: async ({ leadId, milestone }: { leadId: string; milestone: LeadStage }) => {
      return apiRequest("POST", `/api/leads/${leadId}/milestone`, { milestone });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update milestone. Please try again.",
        variant: "destructive",
      });
    },
  });

  const markAsLostMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return apiRequest("POST", `/api/leads/${leadId}/mark-lost`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead marked as lost",
        description: "The lead has been updated and synced to Google Sheets.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark lead as lost. Please try again.",
        variant: "destructive",
      });
    },
  });

  const reactivateMutation = useMutation({
    mutationFn: async (leadId: string) => {
      return apiRequest("POST", `/api/leads/${leadId}/reactivate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      toast({
        title: "Lead reactivated",
        description: "The lead has been reactivated and synced to Google Sheets.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reactivate lead. Please try again.",
        variant: "destructive",
      });
    },
  });

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (activeFilter === "active" && (lead.currentStage === "Closed/Bound" || lead.currentStage === "Lost")) {
        return false;
      }
      if (activeFilter === "closed" && lead.currentStage !== "Closed/Bound") {
        return false;
      }
      if (activeFilter === "lost" && lead.currentStage !== "Lost") {
        return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          (lead.name || "").toLowerCase().includes(query) ||
          (lead.company || "").toLowerCase().includes(query) ||
          (lead.email || "").toLowerCase().includes(query) ||
          (lead.phone || "").includes(query);
        if (!matchesSearch) return false;
      }

      if (dateRange.from) {
        const leadDate = new Date(lead.createdAt);
        const fromDate = new Date(dateRange.from);
        fromDate.setHours(0, 0, 0, 0);
        if (leadDate < fromDate) return false;
      }

      if (dateRange.to) {
        const leadDate = new Date(lead.createdAt);
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (leadDate > toDate) return false;
      }

      return true;
    });
  }, [leads, activeFilter, searchQuery, dateRange]);

  const stats = {
    total: leads.length,
    active: leads.filter(l => l.currentStage !== "Closed/Bound" && l.currentStage !== "Lost").length,
    closed: leads.filter(l => l.currentStage === "Closed/Bound").length,
    lost: leads.filter(l => l.currentStage === "Lost").length,
  };

  const conversionRate = stats.total > 0 
    ? ((stats.closed / (stats.closed + stats.lost)) * 100 || 0).toFixed(1)
    : "0";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                <h1 className="text-xl font-bold" data-testid="text-app-title">Sales Lead Tracker</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <SyncStatus status="synced" />
              <AddLeadDialog
                onSubmit={(lead) => addLeadMutation.mutateAsync(lead)}
                isPending={addLeadMutation.isPending}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Total Leads"
              value={stats.total}
              icon={Users}
              description="All time"
            />
            <StatsCard
              title="Active Pipeline"
              value={stats.active}
              icon={TrendingUp}
              description="Currently in progress"
            />
            <StatsCard
              title="Closed/Bound"
              value={stats.closed}
              icon={CheckCircle2}
              description="Successfully closed"
            />
            <StatsCard
              title="Conversion Rate"
              value={`${conversionRate}%`}
              icon={CheckCircle2}
              description={`${stats.closed} closed, ${stats.lost} lost`}
            />
          </div>

          {leads.length > 0 && (
            <AnalyticsSection leads={leads} />
          )}

          <div className="space-y-4">
            <FilterTabs
              activeFilter={activeFilter}
              onFilterChange={setActiveFilter}
              counts={{
                all: stats.total,
                active: stats.active,
                closed: stats.closed,
                lost: stats.lost,
              }}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by name, company, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 min-w-[200px] justify-start" data-testid="button-date-filter">
                    <Calendar className="h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d, yyyy")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "Filter by date"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 space-y-3">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">From Date</label>
                      <CalendarComponent
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                        disabled={(date) => date > new Date()}
                        data-testid="calendar-from"
                      />
                    </div>
                    {dateRange.from && (
                      <div className="space-y-2">
                        <label className="text-sm font-medium">To Date</label>
                        <CalendarComponent
                          mode="single"
                          selected={dateRange.to}
                          onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                          disabled={(date) => date < dateRange.from! || date > new Date()}
                          data-testid="calendar-to"
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange({})}
                        className="flex-1"
                        data-testid="button-clear-dates"
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-48 rounded-lg bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : filteredLeads.length === 0 ? (
              activeFilter === "all" ? (
                <EmptyState onAddLead={() => setAddDialogOpen(true)} />
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No leads found in this category
                </div>
              )
            ) : (
              <div className="grid grid-cols-1 gap-4" data-testid="container-leads-list">
                {filteredLeads.map((lead) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    onMilestoneToggle={(leadId, milestone) =>
                      toggleMilestoneMutation.mutate({ leadId, milestone })
                    }
                    onMarkAsLost={(leadId) => markAsLostMutation.mutate(leadId)}
                    onReactivate={(leadId) => reactivateMutation.mutate(leadId)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
