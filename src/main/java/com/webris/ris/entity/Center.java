package com.webris.ris.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.webris.ris.enums.CenterPlan;
import com.webris.ris.enums.SubscriptionStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "centers")
@JsonIgnoreProperties({"hibernateLazyInitializer", "handlerType"})
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Center {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String address;
    private String phone;
    private String email;
    private String website;

    @Column(name = "contact_person")
    private String contactPerson;

    private String city;
    private String state;
    private String pincode;

    @Column(name = "logo_url")
    private String logoUrl;

    @Column(name = "is_active")
    @Builder.Default
    private Boolean isActive = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "plan")
    @Builder.Default
    private CenterPlan plan = CenterPlan.TRIAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "subscription_status")
    @Builder.Default
    private SubscriptionStatus subscriptionStatus = SubscriptionStatus.TRIAL;

    @Column(name = "plan_start_date")
    private LocalDateTime planStartDate;

    @Column(name = "plan_end_date")
    private LocalDateTime planEndDate;

    @Column(name = "max_studies_per_month")
    @Builder.Default
    private Integer maxStudiesPerMonth = 100;

    private String notes;

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
