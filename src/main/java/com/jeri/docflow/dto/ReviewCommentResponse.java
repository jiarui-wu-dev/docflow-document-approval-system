package com.jeri.docflow.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class ReviewCommentResponse {

    private Long id;
    private Long documentId;
    private Long reviewerId;
    private String content;
    private LocalDateTime createdAt;
}