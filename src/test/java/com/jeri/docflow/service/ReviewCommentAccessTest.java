package com.jeri.docflow.service;

import com.jeri.docflow.dto.DocumentResponse;
import com.jeri.docflow.exception.BusinessException;
import com.jeri.docflow.repository.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class ReviewCommentAccessTest {
    @Test
    void deniesCommentsBeforeReadingRepositoryWhenDocumentIsInaccessible() {
        var comments = mock(ReviewCommentRepository.class);
        var documents = mock(DocumentService.class);
        when(documents.getDocumentById(9L)).thenThrow(new BusinessException("Document access denied"));
        var service = new ReviewCommentService(comments, mock(DocumentRepository.class), mock(UserRepository.class), documents);
        assertThatThrownBy(() -> service.getCommentsByDocumentId(9L)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(comments);
    }

    @Test
    void allowsCommentsAfterDocumentScopeCheck() {
        var comments = mock(ReviewCommentRepository.class);
        var documents = mock(DocumentService.class);
        when(documents.getDocumentById(9L)).thenReturn(new DocumentResponse());
        when(comments.findByDocumentIdOrderByCreatedAtAsc(9L)).thenReturn(List.of());
        var service = new ReviewCommentService(comments, mock(DocumentRepository.class), mock(UserRepository.class), documents);
        assertThat(service.getCommentsByDocumentId(9L)).isEmpty();
        var order = inOrder(documents, comments);
        order.verify(documents).getDocumentById(9L);
        order.verify(comments).findByDocumentIdOrderByCreatedAtAsc(9L);
    }
}
