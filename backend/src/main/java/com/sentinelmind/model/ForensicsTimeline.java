package com.sentinelmind.model;

import java.util.List;

/**
 * ForensicsTimeline — structured output from the Forensics Agent.
 * Represents a complete reconstruction of an attack from graph traversal.
 * Used by ForensicsAgent and returned via ScanController to the dashboard.
 */
public class ForensicsTimeline {

    private String incidentId;
    private String sourceIp;
    private String targetActor;
    private long reconstructedAt;
    private List<TimelineEvent> events;
    private List<String> affectedServices;
    private String blastRadius;
    private int totalHopsInGraph;
    private String patientZero;

    public static class TimelineEvent {
        private String timestamp;
        private String eventType;
        private String description;
        private String severity;
        private String sourceNode;
        private String targetNode;
        private String relationshipType;

        public String getTimestamp() { return timestamp; }
        public void setTimestamp(String timestamp) { this.timestamp = timestamp; }
        public String getEventType() { return eventType; }
        public void setEventType(String eventType) { this.eventType = eventType; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getSeverity() { return severity; }
        public void setSeverity(String severity) { this.severity = severity; }
        public String getSourceNode() { return sourceNode; }
        public void setSourceNode(String sourceNode) { this.sourceNode = sourceNode; }
        public String getTargetNode() { return targetNode; }
        public void setTargetNode(String targetNode) { this.targetNode = targetNode; }
        public String getRelationshipType() { return relationshipType; }
        public void setRelationshipType(String rel) { this.relationshipType = rel; }
    }

    public String getIncidentId() { return incidentId; }
    public void setIncidentId(String incidentId) { this.incidentId = incidentId; }
    public String getSourceIp() { return sourceIp; }
    public void setSourceIp(String sourceIp) { this.sourceIp = sourceIp; }
    public String getTargetActor() { return targetActor; }
    public void setTargetActor(String targetActor) { this.targetActor = targetActor; }
    public long getReconstructedAt() { return reconstructedAt; }
    public void setReconstructedAt(long reconstructedAt) { this.reconstructedAt = reconstructedAt; }
    public List<TimelineEvent> getEvents() { return events; }
    public void setEvents(List<TimelineEvent> events) { this.events = events; }
    public List<String> getAffectedServices() { return affectedServices; }
    public void setAffectedServices(List<String> services) { this.affectedServices = services; }
    public String getBlastRadius() { return blastRadius; }
    public void setBlastRadius(String blastRadius) { this.blastRadius = blastRadius; }
    public int getTotalHopsInGraph() { return totalHopsInGraph; }
    public void setTotalHopsInGraph(int hops) { this.totalHopsInGraph = hops; }
    public String getPatientZero() { return patientZero; }
    public void setPatientZero(String patientZero) { this.patientZero = patientZero; }
}
