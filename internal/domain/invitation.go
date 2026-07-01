package domain

type Invitation struct {
	ID         string `json:"id"`
	FromUserID string `json:"from_user_id"`
	ToEmail    string `json:"to_email"`
	ToUserID   string `json:"to_user_id,omitempty"`
	Status     string `json:"status"`
	CreatedAt  string `json:"created_at"`
	UpdatedAt  string `json:"updated_at"`
}

type InvitationResponse struct {
	ID        string       `json:"id"`
	FromUser  UserResponse `json:"from_user"`
	ToEmail   string       `json:"to_email"`
	ToUser    *UserResponse `json:"to_user,omitempty"`
	Status    string       `json:"status"`
	CreatedAt string       `json:"created_at"`
}
