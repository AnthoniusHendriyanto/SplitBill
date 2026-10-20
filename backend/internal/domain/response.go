package domain

type SuccessEnvelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

type ErrorEnvelope struct {
	Success bool        `json:"success"`
	Message string      `json:"message"`
	Error   ErrorDetail `json:"error"`
}

type ErrorDetail struct {
	Code    string      `json:"code"`
	Details interface{} `json:"details"`
}

func NewSuccess(data interface{}) *SuccessEnvelope {
	return &SuccessEnvelope{
		Success: true,
		Message: "Success",
		Data:    data,
	}
}

func NewError(code, message string, details interface{}) *ErrorEnvelope {
	return &ErrorEnvelope{
		Success: false,
		Message: message,
		Error: ErrorDetail{
			Code:    code,
			Details: details,
		},
	}
}
