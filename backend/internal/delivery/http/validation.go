package http

import (
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/user/split-mate/internal/domain"
)

var validate = validator.New()

func writeValidationError(w http.ResponseWriter, err error) {
	validationErrors, ok := err.(validator.ValidationErrors)
	if !ok {
		writeError(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data")
		return
	}
	var details []domain.ValidationError
	for _, ve := range validationErrors {
		details = append(details, domain.ValidationError{
			Field:   ve.Field(),
			Message: ve.Tag() + " validation failed",
		})
	}
	writeErrorWithDetails(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request data", details)
}
