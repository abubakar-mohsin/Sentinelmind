package com.sentinelmind.model;

import java.util.ArrayList;
import java.util.Collections;
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
    private final String anomalySummary;
    private final double threatIntelScore;
    private final String threatIntelSummary;
    private final String threatIntelResult;
    private final double classifierScore;
    private final List<String> mitreIds;
    private final List<String> mitreNames;
    private final double confidenceScore;
    private final String severity;
    private final String reason;
    private final List<String> responseActions;
    private final long detectedAt;

    private IncidentReport(Builder builder) {
        this.incidentId         = builder.incidentId;
        this.triggeringEvent    = builder.triggeringEvent;
        this.anomalyScore       = builder.anomalyScore;
        this.anomalySummary     = builder.anomalySummary;
        this.threatIntelScore   = builder.threatIntelScore;
        this.threatIntelSummary = builder.threatIntelSummary;
        this.threatIntelResult  = builder.threatIntelResult;
        this.classifierScore    = builder.classifierScore;
        this.mitreIds           = Collections.unmodifiableList(builder.mitreIds);
        this.mitreNames         = Collections.unmodifiableList(builder.mitreNames);
        this.confidenceScore    = builder.confidenceScore;
        this.severity           = builder.severity;
        this.reason             = builder.reason;
        this.responseActions    = Collections.unmodifiableList(builder.responseActions);
        this.detectedAt         = builder.detectedAt;
    }

    public String getIncidentId()            { return incidentId; }
    public SecurityEvent getTriggeringEvent() { return triggeringEvent; }
    public double getAnomalyScore()          { return anomalyScore; }
    public String getAnomalySummary()        { return anomalySummary; }
    public double getThreatIntelScore()      { return threatIntelScore; }
    public String getThreatIntelSummary()    { return threatIntelSummary; }
    public String getThreatIntelResult()     { return threatIntelResult; }
    public double getClassifierScore()       { return classifierScore; }
    public List<String> getMitreIds()        { return mitreIds; }
    public List<String> getMitreNames()      { return mitreNames; }
    public double getConfidenceScore()       { return confidenceScore; }
    public String getSeverity()              { return severity; }
    public String getReason()                { return reason; }
    public List<String> getResponseActions() { return responseActions; }
    public long getDetectedAt()              { return detectedAt; }

    public static Builder builder() {
        return new Builder();
    }

    /**
     * The Builder — assembles the IncidentReport piece by piece.
     * The Orchestrator creates one Builder per incident and populates it
     * as each agent reports back.
     */
    public static class Builder {

        private String incidentId;
        private SecurityEvent triggeringEvent;
        private double anomalyScore;
        private String anomalySummary;
        private double threatIntelScore;
        private String threatIntelSummary;
        private String threatIntelResult;
        private double classifierScore;
        private List<String> mitreIds     = new ArrayList<>();
        private List<String> mitreNames   = new ArrayList<>();
        private double confidenceScore;
        private String severity;
        private String reason;
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

        public Builder anomalySummary(String summary) {
            this.anomalySummary = summary;
            return this;
        }

        public Builder threatIntelScore(double score) {
            this.threatIntelScore = score;
            return this;
        }

        public Builder threatIntelSummary(String summary) {
            this.threatIntelSummary = summary;
            return this;
        }

        public Builder threatIntelResult(String result) {
            this.threatIntelResult = result;
            return this;
        }

        public Builder classifierScore(double score) {
            this.classifierScore = score;
            return this;
        }

        public Builder mitreIds(List<String> ids) {
            this.mitreIds = new ArrayList<>(ids);
            return this;
        }

        public Builder mitreNames(List<String> names) {
            this.mitreNames = new ArrayList<>(names);
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

        public Builder reason(String reason) {
            this.reason = reason;
            return this;
        }

        public Builder addResponseAction(String action) {
            this.responseActions.add(action);
            return this;
        }

        public Builder responseActions(List<String> actions) {
            this.responseActions = new ArrayList<>(actions);
            return this;
        }

        /**
         * Composes a human-readable explanation of why this incident was classified
         * at this severity. Called automatically by build() if no reason was set.
         */
        private String composeReason() {
            StringBuilder r = new StringBuilder();

            if (anomalyScore > 0) {
                double zScore = anomalyScore;
                r.append(String.format(
                    "Anomaly detection flagged a %.1fσ deviation from behavioral baseline",
                    zScore));
                if (triggeringEvent != null) {
                    if (triggeringEvent.getCountry() != null) {
                        r.append(String.format(" (login from %s", triggeringEvent.getCountry()));
                    }
                    if (triggeringEvent.getHour() > 0) {
                        r.append(String.format(" at %02d:00", triggeringEvent.getHour()));
                    }
                    if (triggeringEvent.getCountry() != null || triggeringEvent.getHour() > 0) {
                        r.append(")");
                    }
                }
                r.append(". ");
            }

            if (threatIntelResult != null && !threatIntelResult.isEmpty()) {
                r.append("Threat intelligence: ").append(threatIntelResult).append(". ");
            }

            if (mitreIds != null && !mitreIds.isEmpty()) {
                r.append("Classified as MITRE ATT&CK ");
                for (int i = 0; i < mitreIds.size(); i++) {
                    r.append(mitreIds.get(i));
                    if (mitreNames != null && i < mitreNames.size()) {
                        r.append(" (").append(mitreNames.get(i)).append(")");
                    }
                    if (i < mitreIds.size() - 1) r.append(" + ");
                }
                r.append(". ");
            }

            r.append(String.format(
                "Combined confidence: %.1f%% (threshold: 92.0%%).",
                confidenceScore * 100));

            return r.toString();
        }

        public IncidentReport build() {
            if (incidentId == null)      throw new IllegalStateException("incidentId is required");
            if (triggeringEvent == null) throw new IllegalStateException("triggeringEvent is required");
            if (this.reason == null || this.reason.isEmpty()) {
                this.reason = composeReason();
            }
            return new IncidentReport(this);
        }
    }
}
