package com.jeri.docflow.controller;

import com.jeri.docflow.dto.ApprovalHistoryResponse;
import com.jeri.docflow.dto.CreateDocumentRequest;
import com.jeri.docflow.dto.DocumentResponse;
import com.jeri.docflow.dto.UpdateDocumentStatusRequest;
import com.jeri.docflow.service.DocumentService;
import com.jeri.docflow.dto.DocumentSearchRequest;
import com.jeri.docflow.enumtype.DocumentStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Documents", description = "APIs for document creation, retrieval, status updates, and history")
@SecurityRequirement(name = "basicAuth")
@RestController
@RequestMapping("/api/documents")
public class DocumentController {

    private final DocumentService documentService;

    public DocumentController(DocumentService documentService) {
        this.documentService = documentService;
    }

    @Operation(summary = "Create a new document")
    @PostMapping
    public DocumentResponse createDocument(@Valid @RequestBody CreateDocumentRequest request) {
        return documentService.createDocument(request);
    }

    @Operation(summary = "Get all documents with optional filters")
    @GetMapping
    public List<DocumentResponse> getAllDocuments(
            @RequestParam(required = false) DocumentStatus status,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) Long submitterId,
            @RequestParam(required = false) Long reviewerId
    ) {
        DocumentSearchRequest request = new DocumentSearchRequest();
        request.setStatus(status);
        request.setTitle(title);
        request.setSubmitterId(submitterId);
        request.setReviewerId(reviewerId);

        return documentService.getAllDocuments(request);
    }

    @Operation(summary = "Get document details by ID")
    @GetMapping("/{id}")
    public DocumentResponse getDocumentById(@PathVariable Long id) {
        return documentService.getDocumentById(id);
    }

    @Operation(summary = "Get approval history for a document")
    @GetMapping("/{id}/history")
    public List<ApprovalHistoryResponse> getDocumentHistory(@PathVariable Long id) {
        return documentService.getDocumentHistory(id);
    }

    @Operation(summary = "Update document status")
    @PutMapping("/{id}/status")
    public DocumentResponse updateDocumentStatus(@PathVariable Long id,
                                                 @Valid @RequestBody UpdateDocumentStatusRequest request) {
        return documentService.updateDocumentStatus(id, request);
    }
}