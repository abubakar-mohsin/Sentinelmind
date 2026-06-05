package com.sentinelmind.model;

import java.util.ArrayList;
import java.util.List;

/**
 * IncidentReport — Builder Pattern (Lab 4)
 *
 * An incident report is assembled step by step as the Orchestrator
 * collects findings from each agent. We don't know all the details
 * upfront — they arrive one by one as agents complete their analysis.
 *
 * The Builder lets the Orchestrator add each piece as it arrives and call
 * build() at the end to get the final, immutable IncidentReport object.
 *
 * Compare to MealBuilder from Lab 4: prepareVegMeal() adds a VegBurger,
 * then a Coke, then returns the Meal. Our Builder adds agent findings
 * one by one and returns the final IncidentReport.
 */
public class IncidentReport {

    private final String incidentId;
    private final SecurityEvent triggeringEvent;
    private final double anomalyScore;
    private final String threatIntelResult;
    private final String mitreAttackId;
    private final String mitreTechniqueName;
    private final double confidenceScore;
    private final String severity;
    private final List<String> responseActions;
    private final long detectedAt;

    // Private constructor — you MUST use the Builder to create this object
    private IncidentReport(Builder builder) {
        this.incidentId        = builder.incidentId;
        this.triggeringEvent   = builder.triggeringEvent;
        this.anomalyScore      = builder.anomalyScore;
        this.threatIntelResult = builder.threatIntelResult;
        this.mitreAttackId     = builder.mitreAttackId;
        this.mitreTechniqueName = builder.mitreTechniqueName;
        this.confidenceScore   = builder.confidenceScore;
        this.severity          = builder.severity;
        this.responseActions   = builder.responseActions;
        this.detectedAt        = builder.detectedAt;
    }

    public String getIncidentId()       { return incidentId; }
    public SecurityEvent getTriggeringEvent() { return triggeringEvent; }
    public double getAnomalyScore()     { return anomalyScore; }
    public String getThreatIntelResult() { return threatIntelResult; }
    public String getMitreAttackId()    { return mitreAttackId; }
    public String getMitreTechniqueName() { return mitreTechniqueName; }
    public double getConfidenceScore()  { return confidenceScore; }
    public String getSeverity()         { return severity; }
    public List<String> getResponseActions() { return responseActions; }
    public long getDetectedAt()         { return detectedAt; }

    /**
     * The Builder — assembles the IncidentReport piece by piece.
     * The Orchestrator creates one Builder per incident and populates it
     * as each agent reports back.
     */
    public static class Builder {

        private String incidentId;
        private SecurityEvent triggeringEvent;
        private double anomalyScore;
        private String threatIntelResult;
        private String mitreAttackId;
        private String mitreTechniqueName;
        private double confidenceScore;
        private String severity;
        private List<String> responseActions = new ArrayList<>();
        private long detectedAt = System.currentTimeMillis();

        public Builder incidentId(String id) {
            this.incidentId = id;
            return this;
        }

        public Builder triggeringEvent(SecurityEvent event) {
            this.triggeringEvent = event;
            return this;
        }

        public Builder anomalyScore(double score) {
            this.anomalyScore = score;
            return this;
        }

        public Builder threatIntelResult(String result) {
            this.threatIntelResult = result;
            return this;
        }

        public Builder mitreMapping(String id, String name) {
            this.mitreAttackId = id;
            this.mitreTechniqueName = name;
            return this;
        }

        public Builder confidenceScore(double score) {
            this.confidenceScore = score;
            return this;
        }

        public Builder severity(String severity) {
            this.severity = severity;
            return this;
        }

        public Builder addResponseAction(String action) {
            this.responseActions.add(action);
            return this;
        }

        /** Final step — validates required fields and returns the immutable IncidentReport. */
        public IncidentReport build() {
            if (incidentId == null)      throw new IllegalStateException("incidentId is required");
            if (triggeringEvent == null) throw new IllegalStateException("triggeringEvent is required");
            return new IncidentReport(this);
        }
    }
}
