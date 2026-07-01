package com.webris.ris.service;

import com.lowagie.text.Chunk;
import com.lowagie.text.Document;
import com.lowagie.text.DocumentException;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Rectangle;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import com.lowagie.text.pdf.draw.LineSeparator;
import com.webris.ris.entity.Report;
import com.webris.ris.exception.ResourceNotFoundException;
import com.webris.ris.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class PdfReportService {

    private final ReportRepository reportRepository;

    public byte[] generateReportPdf(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new ResourceNotFoundException("Report", "id", reportId));

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 50, 50, 50, 50);
            PdfWriter.getInstance(document, baos);
            document.open();

            Font titleFont = new Font(Font.HELVETICA, 18, Font.BOLD, Color.DARK_GRAY);
            Font headerFont = new Font(Font.HELVETICA, 11, Font.BOLD);
            Font labelFont = new Font(Font.HELVETICA, 10, Font.BOLD);
            Font valueFont = new Font(Font.HELVETICA, 10, Font.NORMAL);
            Font sectionFont = new Font(Font.HELVETICA, 12, Font.BOLD, new Color(0, 102, 204));

            // Header
            Paragraph centerName = new Paragraph(
                    report.getStudy().getCenter().getName(), titleFont);
            centerName.setAlignment(Element.ALIGN_CENTER);
            document.add(centerName);

            if (report.getStudy().getCenter().getAddress() != null) {
                Paragraph centerAddr = new Paragraph(
                        report.getStudy().getCenter().getAddress(),
                        new Font(Font.HELVETICA, 9, Font.NORMAL, Color.GRAY));
                centerAddr.setAlignment(Element.ALIGN_CENTER);
                document.add(centerAddr);
            }

            document.add(new Paragraph(" "));
            addLineSeparator(document);
            document.add(new Paragraph(" "));

            // Title
            Paragraph title = new Paragraph("RADIOLOGY REPORT", headerFont);
            title.setAlignment(Element.ALIGN_CENTER);
            document.add(title);
            document.add(new Paragraph(" "));

            // Patient details table
            PdfPTable patientTable = new PdfPTable(4);
            patientTable.setWidthPercentage(100);
            addCell(patientTable, "Patient Name:", labelFont, true);
            addCell(patientTable, report.getStudy().getPatient().getFullName(), valueFont, false);
            addCell(patientTable, "Patient ID:", labelFont, true);
            addCell(patientTable, report.getStudy().getPatient().getPatientCode(), valueFont, false);

            addCell(patientTable, "Age/Gender:", labelFont, true);
            String ageGender = (report.getStudy().getPatient().getAge() != null ?
                    report.getStudy().getPatient().getAge() + " Yrs" : "") +
                    (report.getStudy().getPatient().getGender() != null ?
                    " / " + report.getStudy().getPatient().getGender() : "");
            addCell(patientTable, ageGender, valueFont, false);
            addCell(patientTable, "Ref. Doctor:", labelFont, true);
            addCell(patientTable, nvl(report.getStudy().getReferringDoctor()), valueFont, false);

            addCell(patientTable, "Lab No:", labelFont, true);
            addCell(patientTable, report.getStudy().getLabNo(), valueFont, false);
            addCell(patientTable, "Study:", labelFont, true);
            addCell(patientTable, report.getStudy().getStudyDescription(), valueFont, false);

            addCell(patientTable, "Modality:", labelFont, true);
            addCell(patientTable, report.getStudy().getModality().name(), valueFont, false);
            addCell(patientTable, "Report Date:", labelFont, true);
            String reportDate = report.getApprovedAt() != null ?
                    report.getApprovedAt().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm")) :
                    report.getCreatedAt().format(DateTimeFormatter.ofPattern("dd-MM-yyyy HH:mm"));
            addCell(patientTable, reportDate, valueFont, false);

            document.add(patientTable);
            document.add(new Paragraph(" "));
            addLineSeparator(document);
            document.add(new Paragraph(" "));

            // Clinical history
            if (report.getClinicalHistory() != null && !report.getClinicalHistory().isBlank()) {
                document.add(new Paragraph("CLINICAL HISTORY", sectionFont));
                document.add(new Paragraph(report.getClinicalHistory(), valueFont));
                document.add(new Paragraph(" "));
            }

            // Findings
            if (report.getFindings() != null && !report.getFindings().isBlank()) {
                document.add(new Paragraph("FINDINGS", sectionFont));
                document.add(new Paragraph(report.getFindings(), valueFont));
                document.add(new Paragraph(" "));
            }

            // Impression
            if (report.getImpression() != null && !report.getImpression().isBlank()) {
                document.add(new Paragraph("IMPRESSION", sectionFont));
                document.add(new Paragraph(report.getImpression(), valueFont));
                document.add(new Paragraph(" "));
            }

            // Conclusion
            if (report.getConclusion() != null && !report.getConclusion().isBlank()) {
                document.add(new Paragraph("CONCLUSION", sectionFont));
                document.add(new Paragraph(report.getConclusion(), valueFont));
                document.add(new Paragraph(" "));
            }

            // Recommendations
            if (report.getRecommendations() != null && !report.getRecommendations().isBlank()) {
                document.add(new Paragraph("RECOMMENDATIONS", sectionFont));
                document.add(new Paragraph(report.getRecommendations(), valueFont));
                document.add(new Paragraph(" "));
            }

            addLineSeparator(document);
            document.add(new Paragraph(" "));

            // Signature
            PdfPTable sigTable = new PdfPTable(2);
            sigTable.setWidthPercentage(100);
            PdfPCell sigCell = new PdfPCell();
            sigCell.setBorder(Rectangle.NO_BORDER);
            sigCell.addElement(new Paragraph(" "));
            sigTable.addCell(sigCell);

            PdfPCell drCell = new PdfPCell();
            drCell.setBorder(Rectangle.NO_BORDER);
            drCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            drCell.addElement(new Paragraph(report.getDoctor().getName(), labelFont));
            drCell.addElement(new Paragraph(nvl(report.getDoctor().getQualification()), valueFont));
            drCell.addElement(new Paragraph("Radiologist", valueFont));
            sigTable.addCell(drCell);
            document.add(sigTable);

            document.close();
            return baos.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate PDF: " + e.getMessage(), e);
        }
    }

    private void addLineSeparator(Document document) throws DocumentException {
        LineSeparator ls = new LineSeparator();
        ls.setLineColor(new Color(200, 200, 200));
        document.add(new Chunk(ls));
    }

    private void addCell(PdfPTable table, String text, Font font, boolean isLabel) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(4);
        if (isLabel) {
            cell.setBackgroundColor(new Color(245, 245, 245));
        }
        table.addCell(cell);
    }

    private String nvl(String val) {
        return val != null ? val : "";
    }
}
