import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Users, TrendingUp, CheckCircle2, XCircle } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { SyncStatus } from "@/components/sync-status";
import { AddLeadDialog } from "@/components/add-lead-dialog";
import { LeadCard } from "@/components/lead-card";
import { StatsCard } from "@/components/stats-card";
import { FilterTabs } from "@/components/filter-tabs";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import type { Lead, InsertLead, LeadStage } from "@shared/schema";

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const addLeadMutation = useMutation({
    mutationFn: async (lead: InsertLead) => {
      return apiRequest("POST", "/api/leads", lead);
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

  const filteredLeads = leads.filter(lead => {
    if (activeFilter === "all") return true;
    if (activeFilter === "active") return lead.currentStage !== "Closed/Bound" && lead.currentStage !== "Lost";
    if (activeFilter === "closed") return lead.currentStage === "Closed/Bound";
    if (activeFilter === "lost") return lead.currentStage === "Lost";
    return true;
  });

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
