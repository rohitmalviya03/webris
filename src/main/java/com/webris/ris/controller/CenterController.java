package com.webris.ris.controller;

import com.webris.ris.entity.Center;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.CenterRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/centers")
@RequiredArgsConstructor
public class CenterController {

    private final CenterRepository centerRepository;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<Center>> getCenters() {
        return ResponseEntity.ok(centerRepository.findByIsActiveTrue());
    }

    @PostMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Center> createCenter(@RequestBody Center center) {
        return ResponseEntity.ok(centerRepository.save(center));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Center> getCenter(@PathVariable Long id) {
        return ResponseEntity.ok(centerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Center", "id", id)));
    }
}
