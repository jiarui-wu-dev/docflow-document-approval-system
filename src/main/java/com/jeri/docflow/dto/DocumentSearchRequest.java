package com.jeri.docflow.dto;

import com.jeri.docflow.enumtype.DocumentStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class DocumentSearchRequest {

    private DocumentStatus status;
    private String title;
    private Long submitterId;

    private Long reviewerId;
}