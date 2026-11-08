package com.jeri.docflow.service;

import com.jeri.docflow.dto.CreateReviewCommentRequest;
import com.jeri.docflow.dto.ReviewCommentResponse;
import com.jeri.docflow.entity.Document;
import com.jeri.docflow.entity.ReviewComment;
import com.jeri.docflow.entity.User;
import com.jeri.docflow.exception.BusinessException;
import com.jeri.docflow.repository.DocumentRepository;
import com.jeri.docflow.repository.ReviewCommentRepository;
import com.jeri.docflow.repository.UserRepository;
import com.jeri.docflow.enumtype.UserRole;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class ReviewCommentService {

    private final ReviewCommentRepository reviewCommentRepository;
    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final DocumentService documentService;

    public ReviewCommentService(ReviewCommentRepository reviewCommentRepository,
                                DocumentRepository documentRepository,
                                UserRepository userRepository,
                                DocumentService documentService) {
        this.reviewCommentRepository = reviewCommentRepository;
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.documentService = documentService;
    }

    @Transactional
    public ReviewCommentResponse createComment(Long documentId, CreateReviewCommentRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("Document not found"));

        String currentUsername = getCurrentUsername();

        User reviewer = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));

        if (reviewer.getRole() != UserRole.REVIEWER && reviewer.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Only REVIEWER or ADMIN can add review comments");
        }

        if (reviewer.getRole() == UserRole.REVIEWER) {
            boolean isAssignedReviewer = document.getReviewer() != null
                    && document.getReviewer().getId().equals(reviewer.getId());

            if (!isAssignedReviewer) {
                throw new BusinessException("REVIEWER can only comment on documents assigned to them");
            }
        }

        ReviewComment comment = new ReviewComment();
        comment.setDocument(document);
        comment.setReviewer(reviewer);
        comment.setContent(request.getContent());
        comment.setCreatedAt(LocalDateTime.now());

        ReviewComment savedComment = reviewCommentRepository.save(comment);
        return toResponse(savedComment);
    }

    public List<ReviewCommentResponse> getCommentsByDocumentId(Long documentId) {
        // Apply the same authenticated data scope as document details and history.
        documentService.getDocumentById(documentId);

        return reviewCommentRepository.findByDocumentIdOrderByCreatedAtAsc(documentId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ReviewCommentResponse toResponse(ReviewComment comment) {
        ReviewCommentResponse response = new ReviewCommentResponse();
        response.setId(comment.getId());
        response.setDocumentId(comment.getDocument().getId());
        response.setReviewerId(comment.getReviewer().getId());
        response.setContent(comment.getContent());
        response.setCreatedAt(comment.getCreatedAt());
        return response;
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new BusinessException("No authenticated user found");
        }

        return authentication.getName();
    }
}
