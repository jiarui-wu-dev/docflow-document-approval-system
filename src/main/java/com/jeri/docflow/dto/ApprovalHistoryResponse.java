package com.jeri.docflow.dto;

import com.jeri.docflow.enumtype.DocumentStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ApprovalHistoryResponse {

    private Long id;
    private Long documentId;
    private Long changedByUserId;
    private DocumentStatus oldStatus;
    private DocumentStatus newStatus;
    private String remark;
    private LocalDateTime createdAt;
}