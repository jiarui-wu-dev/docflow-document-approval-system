package com.jeri.docflow.service;

import com.jeri.docflow.dto.CreateDocumentRequest;
import com.jeri.docflow.dto.DocumentResponse;
import com.jeri.docflow.dto.UpdateDocumentStatusRequest;
import com.jeri.docflow.entity.ApprovalHistory;
import com.jeri.docflow.entity.Document;
import com.jeri.docflow.entity.User;
import com.jeri.docflow.enumtype.DocumentStatus;
import com.jeri.docflow.repository.ApprovalHistoryRepository;
import com.jeri.docflow.repository.DocumentRepository;
import com.jeri.docflow.repository.UserRepository;
import com.jeri.docflow.dto.ApprovalHistoryResponse;
import com.jeri.docflow.exception.BusinessException;
import com.jeri.docflow.dto.DocumentSearchRequest;
import com.jeri.docflow.specification.DocumentSpecification;
import com.jeri.docflow.enumtype.UserRole;
import org.springframework.data.jpa.domain.Specification;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.time.LocalDateTime;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final UserRepository userRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;

    public DocumentService(DocumentRepository documentRepository,
                           UserRepository userRepository,
                           ApprovalHistoryRepository approvalHistoryRepository) {
        this.documentRepository = documentRepository;
        this.userRepository = userRepository;
        this.approvalHistoryRepository = approvalHistoryRepository;
    }

    @Transactional
    public DocumentResponse createDocument(CreateDocumentRequest request) {
        String currentUsername = getCurrentUsername();

        User submitter = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));

        if (submitter.getRole() != UserRole.SUBMITTER && submitter.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Only SUBMITTER or ADMIN can create documents");
        }

        User reviewer = null;
        if (request.getReviewerId() != null) {
            reviewer = userRepository.findById(request.getReviewerId())
                    .orElseThrow(() -> new BusinessException("Reviewer not found"));

            if (reviewer.getRole() != UserRole.REVIEWER && reviewer.getRole() != UserRole.ADMIN) {
                throw new BusinessException("Assigned reviewer must have REVIEWER or ADMIN role");
            }
        }

        Document document = new Document();
        document.setTitle(request.getTitle());
        document.setDescription(request.getDescription());
        document.setStatus(DocumentStatus.DRAFT);
        document.setSubmitter(submitter);
        document.setReviewer(reviewer);
        document.setCreatedAt(LocalDateTime.now());
        document.setUpdatedAt(LocalDateTime.now());

        Document savedDocument = documentRepository.save(document);
        return toResponse(savedDocument);
    }

    @Transactional
    public DocumentResponse updateDocumentStatus(Long documentId, UpdateDocumentStatusRequest request) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("Document not found"));

        String currentUsername = getCurrentUsername();

        User changedBy = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));

        validateStatusUpdatePermission(changedBy, document, request.getStatus());

        DocumentStatus oldStatus = document.getStatus();
        DocumentStatus newStatus = request.getStatus();

        if (!isValidStatusTransition(oldStatus, newStatus)) {
            throw new BusinessException("Invalid status transition: " + oldStatus + " -> " + newStatus);
        }

        document.setStatus(newStatus);
        document.setUpdatedAt(LocalDateTime.now());

        Document savedDocument = documentRepository.save(document);

        ApprovalHistory history = new ApprovalHistory();
        history.setDocument(savedDocument);
        history.setChangedBy(changedBy);
        history.setOldStatus(oldStatus);
        history.setNewStatus(newStatus);
        history.setRemark(request.getRemark());
        history.setCreatedAt(LocalDateTime.now());

        approvalHistoryRepository.save(history);

        return toResponse(savedDocument);
    }

    public List<DocumentResponse> getAllDocuments(DocumentSearchRequest request) {
        String currentUsername = getCurrentUsername();

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));

        applyDataScope(request, currentUser);

        Specification<Document> specification = DocumentSpecification.withFilters(request);

        return documentRepository.findAll(specification)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    public DocumentResponse getDocumentById(Long id) {
        Document document = documentRepository.findById(id)
                .orElseThrow(() -> new BusinessException("Document not found"));

        String currentUsername = getCurrentUsername();

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));

        validateDocumentAccessPermission(currentUser, document);

        return toResponse(document);
    }

    public List<ApprovalHistoryResponse> getDocumentHistory(Long documentId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new BusinessException("Document not found"));

        String currentUsername = getCurrentUsername();

        User currentUser = userRepository.findByUsername(currentUsername)
                .orElseThrow(() -> new BusinessException("Authenticated user not found in database"));

        validateDocumentAccessPermission(currentUser, document);

        return approvalHistoryRepository.findByDocumentIdOrderByCreatedAtAsc(documentId)
                .stream()
                .map(this::toHistoryResponse)
                .toList();
    }

    private DocumentResponse toResponse(Document document) {
        DocumentResponse response = new DocumentResponse();
        response.setId(document.getId());
        response.setTitle(document.getTitle());
        response.setDescription(document.getDescription());
        response.setStatus(document.getStatus());
        response.setSubmitterId(document.getSubmitter().getId());
        response.setReviewerId(document.getReviewer() != null ? document.getReviewer().getId() : null);
        response.setCreatedAt(document.getCreatedAt());
        response.setUpdatedAt(document.getUpdatedAt());
        return response;
    }

    private String getCurrentUsername() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || authentication.getName() == null) {
            throw new BusinessException("No authenticated user found");
        }

        return authentication.getName();
    }

    private ApprovalHistoryResponse toHistoryResponse(ApprovalHistory history) {
        ApprovalHistoryResponse response = new ApprovalHistoryResponse();
        response.setId(history.getId());
        response.setDocumentId(history.getDocument().getId());
        response.setChangedByUserId(history.getChangedBy().getId());
        response.setOldStatus(history.getOldStatus());
        response.setNewStatus(history.getNewStatus());
        response.setRemark(history.getRemark());
        response.setCreatedAt(history.getCreatedAt());
        return response;
    }

    private boolean isValidStatusTransition(DocumentStatus oldStatus, DocumentStatus newStatus) {
        return switch (oldStatus) {
            case DRAFT -> newStatus == DocumentStatus.SUBMITTED;
            case SUBMITTED -> newStatus == DocumentStatus.IN_REVIEW;
            case IN_REVIEW -> newStatus == DocumentStatus.APPROVED || newStatus == DocumentStatus.REJECTED;
            case APPROVED, REJECTED -> false;
        };
    }

    private void applyDataScope(DocumentSearchRequest request, User currentUser) {
        UserRole role = currentUser.getRole();

        if (role == UserRole.ADMIN) {
            return;
        }

        if (role == UserRole.SUBMITTER) {
            request.setSubmitterId(currentUser.getId());
            request.setReviewerId(null);
            return;
        }

        if (role == UserRole.REVIEWER) {
            request.setReviewerId(currentUser.getId());
            request.setSubmitterId(null);
            return;
        }

        throw new BusinessException("User role is not allowed to view documents");
    }

    private void validateDocumentAccessPermission(User currentUser, Document document) {
        UserRole role = currentUser.getRole();

        if (role == UserRole.ADMIN) {
            return;
        }

        if (role == UserRole.SUBMITTER) {
            boolean isOwnDocument = document.getSubmitter() != null
                    && document.getSubmitter().getId().equals(currentUser.getId());

            if (!isOwnDocument) {
                throw new BusinessException("SUBMITTER can only access their own documents");
            }
            return;
        }

        if (role == UserRole.REVIEWER) {
            boolean isAssignedReviewer = document.getReviewer() != null
                    && document.getReviewer().getId().equals(currentUser.getId());

            if (!isAssignedReviewer) {
                throw new BusinessException("REVIEWER can only access documents assigned to them");
            }
            return;
        }

        throw new BusinessException("User role is not allowed to access this document");
    }

    private void validateStatusUpdatePermission(User user, Document document, DocumentStatus newStatus) {
        UserRole role = user.getRole();
        DocumentStatus currentStatus = document.getStatus();

        if (role == UserRole.ADMIN) {
            return;
        }

        if (role == UserRole.SUBMITTER) {
            boolean isOwnDocument = document.getSubmitter().getId().equals(user.getId());
            boolean allowed = isOwnDocument
                    && currentStatus == DocumentStatus.DRAFT
                    && newStatus == DocumentStatus.SUBMITTED;

            if (!allowed) {
                throw new BusinessException("SUBMITTER can only submit their own document from DRAFT to SUBMITTED");
            }
            return;
        }

        if (role == UserRole.REVIEWER) {
            boolean isAssignedReviewer = document.getReviewer() != null
                    && document.getReviewer().getId().equals(user.getId());

            if (!isAssignedReviewer) {
                throw new BusinessException("REVIEWER can only update documents assigned to them");
            }

            boolean allowed =
                    (currentStatus == DocumentStatus.SUBMITTED && newStatus == DocumentStatus.IN_REVIEW)
                            || (currentStatus == DocumentStatus.IN_REVIEW
                            && (newStatus == DocumentStatus.APPROVED || newStatus == DocumentStatus.REJECTED));

            if (!allowed) {
                throw new BusinessException("REVIEWER can only move documents to IN_REVIEW, APPROVED, or REJECTED according to workflow");
            }
            return;
        }

        throw new BusinessException("User role is not allowed to update document status");
    }

}
