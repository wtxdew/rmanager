package services

import (
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"

	"golang.org/x/image/draw"
)

// ProcessImage processes an image to fit the target device screen
// It centers and crops the image to match the aspect ratio, then scales to target dimensions
func ProcessImage(src io.Reader, targetWidth, targetHeight int) (image.Image, error) {
	img, _, err := image.Decode(src)
	if err != nil {
		return nil, err
	}

	srcBounds := img.Bounds()
	srcW, srcH := srcBounds.Dx(), srcBounds.Dy()

	// Calculate crop rectangle to maintain target aspect ratio
	var cropRect image.Rectangle
	if float64(srcW)/float64(srcH) > float64(targetWidth)/float64(targetHeight) {
		// Source is wider - crop width
		newW := srcH * targetWidth / targetHeight
		offset := (srcW - newW) / 2
		cropRect = image.Rect(offset, 0, offset+newW, srcH)
	} else {
		// Source is taller - crop height
		newH := srcW * targetHeight / targetWidth
		offset := (srcH - newH) / 2
		cropRect = image.Rect(0, offset, srcW, offset+newH)
	}

	// Scale to target dimensions using Catmull-Rom interpolation
	dst := image.NewRGBA(image.Rect(0, 0, targetWidth, targetHeight))
	draw.CatmullRom.Scale(dst, dst.Bounds(), img, cropRect, draw.Over, nil)

	return dst, nil
}
