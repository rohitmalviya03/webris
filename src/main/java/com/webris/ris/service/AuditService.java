package com.webris.ris.service;

import com.webris.ris.entity.AuditLog;
import com.webris.ris.entity.User;
import com.webris.ris.repository.AuditLogRepository;
import com.webris.ris.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditLogRepository auditLogRepository;
    private final UserRepository userRepository;

    public void log(Long userId, String action, String entityType, Long entityId, String details) {
        User user = userId != null ? userRepository.findById(userId).orElse(null) : null;
        AuditLog log = AuditLog.builder()
                .user(user)
                .action(action)
                .entityType(entityType)
                .entityId(entityId)
                .details(details)
                .build();
        auditLogRepository.save(log);
    }
}
