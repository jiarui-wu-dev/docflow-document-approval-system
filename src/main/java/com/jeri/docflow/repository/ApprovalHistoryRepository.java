package com.jeri.docflow.repository;

import com.jeri.docflow.entity.ApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, Long> {

    List<ApprovalHistory> findByDocumentIdOrderByCreatedAtAsc(Long documentId);
}