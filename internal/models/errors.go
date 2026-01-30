package models

import "errors"

var (
	ErrFileNotFound = errors.New("file not found")
	ErrInvalidExt   = errors.New("invalid file extension")
	ErrSystemBusy   = errors.New("system is busy")
)
