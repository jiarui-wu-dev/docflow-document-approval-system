package com.jeri.docflow.repository;

import com.jeri.docflow.entity.ReviewComment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ReviewCommentRepository extends JpaRepository<ReviewComment, Long> {

    List<ReviewComment> findByDocumentIdOrderByCreatedAtAsc(Long documentId);
}