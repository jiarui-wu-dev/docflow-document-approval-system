package com.jeri.docflow.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateReviewCommentRequest {

    @NotBlank
    @Size(max = 2000)
    private String content;
}
