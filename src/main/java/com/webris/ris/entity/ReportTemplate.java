package com.webris.ris.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Filter;
import java.time.LocalDateTime;

@Entity
@Table(name = "report_templates")
@Filter(name = "tenantFilter")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ReportTemplate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "center_id", nullable = false)
    private Center center;

    @Column(name = "template_name", nullable = false)
    private String templateName;

    // Matches against study_description (e.g. "CT Brain") — case-insensitive contains
    @Column(name = "study_description")
    private String studyDescription;

    // Fallback match by modality
    @Column(name = "modality")
    private String modality;

    @Column(name = "clinical_history_template", columnDefinition = "TEXT")
    private String clinicalHistoryTemplate;

    @Column(name = "findings_template", columnDefinition = "TEXT")
    private String findingsTemplate;

    @Column(name = "impression_template", columnDefinition = "TEXT")
    private String impressionTemplate;

    @Column(name = "conclusion_template", columnDefinition = "TEXT")
    private String conclusionTemplate;

    @Column(name = "recommendations_template", columnDefinition = "TEXT")
    private String recommendationsTemplate;

    /** Path to the uploaded Word (.docx) layout file for this template. Nullable. */
    @Column(name = "docx_template_url")
    private String docxTemplateUrl;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
