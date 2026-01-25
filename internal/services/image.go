package services

import (
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"

	"golang.org/x/image/draw"
)

// Deprecated: Use frontend to crop and scale the image
// ProcessImage processes an image to fit the target device screen
// If the image already matches the target dimensions exactly, use it as-is
// Otherwise, scale it to exact dimensions (assumes frontend has already cropped)
func ProcessImage(src io.Reader, targetWidth, targetHeight int) (image.Image, error) {
	img, _, err := image.Decode(src)
	if err != nil {
		return nil, err
	}

	srcBounds := img.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	// If image is already the exact target size, return it directly
	if srcW == targetWidth && srcH == targetHeight {
		return img, nil
	}

	// Scale to exact target dimensions (frontend handles cropping)
	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, img.Bounds(), draw.Over, nil)

	return dst, nil
}
