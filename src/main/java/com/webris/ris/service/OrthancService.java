package com.webris.ris.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import org.springframework.core.ParameterizedTypeReference;

import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Slf4j
public class OrthancService {

    private final WebClient webClient;

    public OrthancService(
            @Value("${orthanc.url}") String orthancUrl,
            @Value("${orthanc.username}") String username,
            @Value("${orthanc.password}") String password) {

        String credentials = Base64.getEncoder()
                .encodeToString((username + ":" + password).getBytes());

        this.webClient = WebClient.builder()
                .baseUrl(orthancUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + credentials)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }

    /**
     * Search Orthanc for a study by accession number using Expand:true.
     * Returns a map with keys: orthancStudyId, studyInstanceUid
     */
    @SuppressWarnings("unchecked")
    public Optional<Map<String, String>> findStudyByAccessionNumber(String accessionNumber) {
        try {
            // POST /tools/find with Expand:true → returns full study objects in one call
            List<Map<String, Object>> studies = webClient.post()
                    .uri("/tools/find")
                    .bodyValue(Map.of(
                            "Level",  "Study",
                            "Query",  Map.of("AccessionNumber", accessionNumber),
                            "Expand", true
                    ))
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();

            if (studies == null || studies.isEmpty()) {
                log.warn("No Orthanc study found for accession: {}", accessionNumber);
                return Optional.empty();
            }

            Map<String, Object> study = studies.get(0);
            String orthancStudyId   = (String) study.get("ID");
            Map<String, String> tags = (Map<String, String>) study.get("MainDicomTags");
            String studyInstanceUid  = tags != null ? tags.get("StudyInstanceUID") : null;

            log.info("Found Orthanc study — ID: {}  UID: {}", orthancStudyId, studyInstanceUid);

            return Optional.of(Map.of(
                    "orthancStudyId",   orthancStudyId   != null ? orthancStudyId   : "",
                    "studyInstanceUid", studyInstanceUid != null ? studyInstanceUid : ""
            ));

        } catch (Exception e) {
            log.error("Error querying Orthanc for accession {}: {}", accessionNumber, e.getMessage());
            return Optional.empty();
        }
    }
}
