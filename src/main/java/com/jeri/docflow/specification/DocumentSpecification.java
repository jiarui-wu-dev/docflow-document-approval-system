package com.jeri.docflow.specification;

import com.jeri.docflow.dto.DocumentSearchRequest;
import com.jeri.docflow.entity.Document;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;

public class DocumentSpecification {

    public static Specification<Document> withFilters(DocumentSearchRequest request) {
        return (root, query, criteriaBuilder) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (request.getStatus() != null) {
                predicates.add(criteriaBuilder.equal(root.get("status"), request.getStatus()));
            }

            if (request.getTitle() != null && !request.getTitle().isBlank()) {
                predicates.add(
                        criteriaBuilder.like(
                                criteriaBuilder.lower(root.get("title")),
                                "%" + request.getTitle().toLowerCase() + "%"
                        )
                );
            }

            if (request.getSubmitterId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("submitter").get("id"), request.getSubmitterId()));
            }

            if (request.getReviewerId() != null) {
                predicates.add(criteriaBuilder.equal(root.get("reviewer").get("id"), request.getReviewerId()));
            }

            return criteriaBuilder.and(predicates.toArray(new Predicate[0]));
        };
    }
}