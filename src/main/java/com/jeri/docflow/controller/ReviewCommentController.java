package com.jeri.docflow.controller;

import com.jeri.docflow.dto.CreateReviewCommentRequest;
import com.jeri.docflow.dto.ReviewCommentResponse;
import com.jeri.docflow.service.ReviewCommentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "Review Comments", description = "APIs for adding and retrieving review comments")
@SecurityRequirement(name = "basicAuth")
@RestController
@RequestMapping("/api/documents/{documentId}/comments")
public class ReviewCommentController {

    private final ReviewCommentService reviewCommentService;

    public ReviewCommentController(ReviewCommentService reviewCommentService) {
        this.reviewCommentService = reviewCommentService;
    }

    @Operation(summary = "Add a comment to a document")
    @PostMapping
    public ReviewCommentResponse createComment(@PathVariable Long documentId,
                                               @Valid @RequestBody CreateReviewCommentRequest request) {
        return reviewCommentService.createComment(documentId, request);
    }

    @Operation(summary = "Get all comments for a document")
    @GetMapping
    public List<ReviewCommentResponse> getComments(@PathVariable Long documentId) {
        return reviewCommentService.getCommentsByDocumentId(documentId);
    }
}