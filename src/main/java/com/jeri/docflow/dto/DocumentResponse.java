package com.jeri.docflow.dto;

import com.jeri.docflow.enumtype.DocumentStatus;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class DocumentResponse {

    private Long id;
    private String title;
    private String description;
    private DocumentStatus status;
    private Long submitterId;
    private Long reviewerId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}