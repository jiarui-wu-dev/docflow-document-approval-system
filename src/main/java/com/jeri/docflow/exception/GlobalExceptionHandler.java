package com.jeri.docflow.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.HttpMediaTypeNotSupportedException;

import java.time.LocalDateTime;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler({MethodArgumentNotValidException.class, HttpMessageNotReadableException.class,
            MethodArgumentTypeMismatchException.class})
    public org.springframework.http.ResponseEntity<ErrorResponse> handleInvalidRequest(
            Exception ex, HttpServletRequest request) {
        return clientError(HttpStatus.BAD_REQUEST, "Invalid request: check required fields, values, and length limits", request);
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleUnsupportedMethod(
            HttpRequestMethodNotSupportedException ex, HttpServletRequest request) {
        return clientError(HttpStatus.METHOD_NOT_ALLOWED, "HTTP method not supported", request);
    }

    private org.springframework.http.ResponseEntity<ErrorResponse> clientError(
            HttpStatus status, String message, HttpServletRequest request) {
        var error = new ErrorResponse();
        error.setTimestamp(LocalDateTime.now());
        error.setStatus(status.value());
        error.setError(status.getReasonPhrase());
        error.setMessage(message);
        error.setPath(request.getRequestURI());
        return org.springframework.http.ResponseEntity.status(status).body(error);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleUnsupportedMediaType(
            HttpMediaTypeNotSupportedException ex, HttpServletRequest request) {
        return clientError(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Request body must use a supported content type", request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleMissingResource(
            NoResourceFoundException ex,
            HttpServletRequest request
    ) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(LocalDateTime.now());
        errorResponse.setStatus(HttpStatus.NOT_FOUND.value());
        errorResponse.setError(HttpStatus.NOT_FOUND.getReasonPhrase());
        errorResponse.setMessage("Endpoint not found");
        errorResponse.setPath(request.getRequestURI());
        return org.springframework.http.ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
    }

    @ExceptionHandler(BusinessException.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex,
            HttpServletRequest request
    ) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(LocalDateTime.now());
        errorResponse.setStatus(HttpStatus.BAD_REQUEST.value());
        errorResponse.setError(HttpStatus.BAD_REQUEST.getReasonPhrase());
        errorResponse.setMessage(ex.getMessage());
        errorResponse.setPath(request.getRequestURI());

        return new org.springframework.http.ResponseEntity<>(errorResponse, HttpStatus.BAD_REQUEST);
    }

    @ExceptionHandler(Exception.class)
    public org.springframework.http.ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex,
            HttpServletRequest request
    ) {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp(LocalDateTime.now());
        errorResponse.setStatus(HttpStatus.INTERNAL_SERVER_ERROR.value());
        errorResponse.setError(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());
        errorResponse.setMessage("Unexpected error occurred");
        errorResponse.setPath(request.getRequestURI());

        return new org.springframework.http.ResponseEntity<>(errorResponse, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
