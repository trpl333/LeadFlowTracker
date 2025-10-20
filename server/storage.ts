import { type Lead, type InsertLead, leadStages, type LeadStage } from "@shared/schema";
import { randomUUID } from "crypto";
import { syncLeadToSheet, syncAllLeadsToSheet } from "./sheetService";

export interface IStorage {
  getAllLeads(): Promise<Lead[]>;
  getLeadById(id: string): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, updates: Partial<Lead>): Promise<Lead>;
  toggleMilestone(id: string, milestone: LeadStage): Promise<Lead>;
  markAsLost(id: string): Promise<Lead>;
  reactivateLead(id: string): Promise<Lead>;
}

export class MemStorage implements IStorage {
  private leads: Map<string, Lead>;

  constructor() {
    this.leads = new Map();
  }

  async getAllLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getLeadById(id: string): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const id = randomUUID();
    const now = new Date();
    
    const lead: Lead = {
      ...insertLead,
      id,
      currentStage: "First Contact",
      completedMilestones: [],
      notes: insertLead.notes || "",
      createdAt: now,
      updatedAt: now,
      stageEnteredAt: now,
    };
    
    this.leads.set(id, lead);
    
    try {
      await syncLeadToSheet(lead);
    } catch (error) {
      console.error("Failed to sync lead to sheet:", error);
    }
    
    return lead;
  }

  async updateLead(id: string, updates: Partial<Lead>): Promise<Lead> {
    const existingLead = this.leads.get(id);
    if (!existingLead) {
      throw new Error("Lead not found");
    }

    const updatedLead: Lead = {
      ...existingLead,
      ...updates,
      updatedAt: new Date(),
    };

    this.leads.set(id, updatedLead);
    
    try {
      await syncLeadToSheet(updatedLead);
    } catch (error) {
      console.error("Failed to sync lead to sheet:", error);
    }
    
    return updatedLead;
  }

  async toggleMilestone(id: string, milestone: LeadStage): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    if (milestone === "Lost") {
      return this.markAsLost(id);
    }

    const completedMilestones = lead.completedMilestones || [];
    const milestoneIndex = leadStages.indexOf(milestone);
    
    const isCompleted = completedMilestones.includes(milestone);

    let newCompletedMilestones: string[];
    let newCurrentStage: string;

    if (isCompleted) {
      newCompletedMilestones = completedMilestones.filter(m => m !== milestone);
      
      const progressMilestones = leadStages.filter(s => s !== "Lost");
      const previousMilestones = progressMilestones.slice(0, milestoneIndex);
      const lastCompleted = previousMilestones.reverse().find(m => 
        newCompletedMilestones.includes(m)
      );
      newCurrentStage = lastCompleted || leadStages[0];
    } else {
      newCompletedMilestones = [...completedMilestones, milestone];
      
      const progressMilestones = leadStages.filter(s => s !== "Lost");
      const nextMilestoneIndex = progressMilestones.indexOf(milestone) + 1;
      if (nextMilestoneIndex < progressMilestones.length) {
        newCurrentStage = progressMilestones[nextMilestoneIndex];
      } else {
        newCurrentStage = milestone;
      }
    }

    return this.updateLead(id, {
      completedMilestones: newCompletedMilestones,
      currentStage: newCurrentStage,
      stageEnteredAt: newCurrentStage !== lead.currentStage ? new Date() : lead.stageEnteredAt,
    });
  }

  async markAsLost(id: string): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    return this.updateLead(id, {
      currentStage: "Lost",
      stageEnteredAt: new Date(),
    });
  }

  async reactivateLead(id: string): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.currentStage !== "Lost") {
      return lead;
    }

    const completedMilestones = lead.completedMilestones || [];
    const progressMilestones = leadStages.filter(s => s !== "Lost");
    
    const lastCompleted = [...progressMilestones].reverse().find(m => 
      completedMilestones.includes(m)
    );
    
    if (lastCompleted) {
      const lastCompletedIndex = progressMilestones.indexOf(lastCompleted);
      const nextIndex = lastCompletedIndex + 1;
      const newCurrentStage = nextIndex < progressMilestones.length 
        ? progressMilestones[nextIndex]
        : lastCompleted;
      
      return this.updateLead(id, {
        currentStage: newCurrentStage,
        stageEnteredAt: new Date(),
      });
    }
    
    return this.updateLead(id, {
      currentStage: leadStages[0],
      stageEnteredAt: new Date(),
    });
  }
}

export const storage = new MemStorage();
