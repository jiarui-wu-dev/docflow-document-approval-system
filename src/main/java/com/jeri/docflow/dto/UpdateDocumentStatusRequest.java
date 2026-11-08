package com.jeri.docflow.dto;

import com.jeri.docflow.enumtype.DocumentStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class UpdateDocumentStatusRequest {

    @NotNull
    private DocumentStatus status;


    @Size(max = 1000)
    private String remark;
}
