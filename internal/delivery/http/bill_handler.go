package http

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gorilla/mux"
	"github.com/user/split-mate/internal/delivery/http/middleware"
	"github.com/user/split-mate/internal/domain"
	"github.com/user/split-mate/internal/usecase"
)

type BillHandler struct {
	BillUsecase usecase.BillUsecase
}

func NewBillHandler(bu usecase.BillUsecase) *BillHandler {
	return &BillHandler{BillUsecase: bu}
}

func (h *BillHandler) Create(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	var req domain.CreateBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := validate.Struct(req); err != nil {
		writeValidationError(w, err)
		return
	}

	bill, err := h.BillUsecase.Create(r.Context(), userID, &req)
	if err != nil {
		log.Printf("Create bill error: %v", err)
		if errors.Is(err, domain.ErrPremiumRequired) {
			writeError(w, http.StatusForbidden, "PREMIUM_REQUIRED", "Custom and percentage split are premium features")
			return
		}
		if errors.Is(err, domain.ErrBillLimitExceeded) {
			writeError(w, http.StatusTooManyRequests, "BILL_LIMIT_EXCEEDED", "Monthly bill limit reached. Upgrade to premium for unlimited bills.")
			return
		}
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusCreated, bill)
}

func (h *BillHandler) Fetch(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	if page < 1 {
		page = 1
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	if limit < 1 {
		limit = 20
	} else if limit > 100 {
		limit = 100
	}

	fromDate := r.URL.Query().Get("from_date")
	toDate := r.URL.Query().Get("to_date")

	resp, err := h.BillUsecase.Fetch(r.Context(), userID, page, limit, fromDate, toDate)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}

func (h *BillHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	vars := mux.Vars(r)
	billID := vars["id"]
	if billID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Bill ID is required")
		return
	}

	resp, err := h.BillUsecase.GetByID(r.Context(), userID, billID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "BILL_NOT_FOUND", "Bill not found")
			return
		}
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, resp)
}

func (h *BillHandler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	vars := mux.Vars(r)
	billID := vars["id"]
	if billID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Bill ID is required")
		return
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_INPUT", "Invalid request body")
		return
	}

	if err := h.BillUsecase.UpdateStatus(r.Context(), userID, billID, req.Status); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "BILL_NOT_FOUND", "Bill not found")
			return
		}
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, map[string]string{"status": req.Status})
}

func (h *BillHandler) MarkPersonPaid(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	vars := mux.Vars(r)
	billID := vars["id"]
	personID := vars["personId"]
	if billID == "" || personID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Bill ID and Person ID are required")
		return
	}

	bill, err := h.BillUsecase.MarkPersonPaid(r.Context(), userID, billID, personID)
	if err != nil {
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusOK, map[string]interface{}{"status": "paid", "completed": bill != nil})
}

func (h *BillHandler) Delete(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		writeError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Not authenticated")
		return
	}

	vars := mux.Vars(r)
	billID := vars["id"]
	if billID == "" {
		writeError(w, http.StatusBadRequest, "MISSING_ID", "Bill ID is required")
		return
	}

	err := h.BillUsecase.Delete(r.Context(), userID, billID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			writeError(w, http.StatusNotFound, "BILL_NOT_FOUND", "Bill not found")
			return
		}
		writeInternalError(w, err)
		return
	}

	writeSuccess(w, http.StatusNoContent, nil)
}

var allowedImageExts = map[string]bool{
	".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
}

const maxImageSize = 10 << 20

func validateImageFile(fileHeader *multipart.FileHeader) error {
	ext := filepath.Ext(fileHeader.Filename)
	if !allowedImageExts[ext] {
		return domain.ErrInvalidInput
	}
	if fileHeader.Size > maxImageSize {
		return domain.ErrInvalidInput
	}
	return nil
}

func (h *BillHandler) ProcessOCR(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	file, fileHeader, err := r.FormFile("image")
	if err != nil {
		file, fileHeader, err = r.FormFile("receipt")
	}
	if err != nil {
		writeError(w, http.StatusBadRequest, "INVALID_FILE", "Image file is required (field: image or receipt)")
		return
	}
	defer file.Close()

	if err := validateImageFile(fileHeader); err != nil {
		writeError(w, http.StatusUnprocessableEntity, "INVALID_FILE_FORMAT", "Unsupported image format or file too large (max 10MB, JPEG/PNG/WebP only)")
		return
	}

	imageBytes, err := io.ReadAll(file)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "FILE_READ_ERROR", "Failed to read image file")
		return
	}

	result, err := h.BillUsecase.ProcessOCR(r.Context(), userID, imageBytes)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "OCR_ERROR", err.Error())
		return
	}

	writeSuccess(w, http.StatusOK, result)
}
