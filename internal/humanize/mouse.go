package humanize

import (
	"math"
	"math/rand"
)

// Point represents a 2D coordinate (typically a screen position in pixels).
type Point struct {
	X, Y float64
}

// BezierCurve generates a smooth cubic Bezier curve path from start to end.
// Control points are randomized to create natural-looking mouse movement.
// Returns exactly `steps` points along the curve. If steps < 2, returns
// at least start and end.
func BezierCurve(start, end Point, steps int) []Point {
	if steps < 2 {
		steps = 2
	}

	// Generate two random control points between start and end
	// with perpendicular offsets for natural curvature.
	dx := end.X - start.X
	dy := end.Y - start.Y
	dist := math.Sqrt(dx*dx + dy*dy)

	// Perpendicular direction for control point offsets.
	var perpX, perpY float64
	if dist > 0 {
		perpX = -dy / dist
		perpY = dx / dist
	}

	// Control points offset perpendicular to the direct path.
	// Offset magnitude scales with distance for natural feel.
	offset1 := (rand.Float64()*0.4 - 0.2) * dist
	offset2 := (rand.Float64()*0.4 - 0.2) * dist

	cp1 := Point{
		X: start.X + dx*0.25 + perpX*offset1,
		Y: start.Y + dy*0.25 + perpY*offset1,
	}
	cp2 := Point{
		X: start.X + dx*0.75 + perpX*offset2,
		Y: start.Y + dy*0.75 + perpY*offset2,
	}

	points := make([]Point, steps)
	for i := 0; i < steps; i++ {
		t := float64(i) / float64(steps-1)
		points[i] = cubicBezier(start, cp1, cp2, end, t)
	}

	// Ensure exact start and end points.
	points[0] = start
	points[steps-1] = end

	return points
}

// WithOvershoot generates a Bezier curve path that overshoots the target
// and then corrects back, simulating natural human mouse movement.
// The returned path has more points than a direct BezierCurve call.
func WithOvershoot(start, end Point, steps int) []Point {
	if steps < 2 {
		steps = 2
	}

	// If start == end, no movement needed.
	dx := end.X - start.X
	dy := end.Y - start.Y
	dist := math.Sqrt(dx*dx + dy*dy)
	if dist < 1 {
		return []Point{start, end}
	}

	// Overshoot point: 5-15% past the target along the movement direction.
	overshootFactor := 1.0 + 0.05 + rand.Float64()*0.10
	overshoot := Point{
		X: start.X + dx*overshootFactor,
		Y: start.Y + dy*overshootFactor,
	}

	// Split steps: ~75% for the main move, ~25% for the correction.
	mainSteps := int(float64(steps) * 0.75)
	if mainSteps < 2 {
		mainSteps = 2
	}
	correctionSteps := steps - mainSteps
	if correctionSteps < 2 {
		correctionSteps = 2
	}

	// Main movement to overshoot point.
	mainPath := BezierCurve(start, overshoot, mainSteps)

	// Correction movement back to actual target.
	correctionPath := BezierCurve(overshoot, end, correctionSteps)

	// Combine paths, removing duplicate at junction.
	result := make([]Point, 0, len(mainPath)+len(correctionPath)-1)
	result = append(result, mainPath...)
	result = append(result, correctionPath[1:]...)

	return result
}

// cubicBezier evaluates a cubic Bezier curve at parameter t (0 to 1).
func cubicBezier(p0, p1, p2, p3 Point, t float64) Point {
	u := 1.0 - t
	return Point{
		X: u*u*u*p0.X + 3*u*u*t*p1.X + 3*u*t*t*p2.X + t*t*t*p3.X,
		Y: u*u*u*p0.Y + 3*u*u*t*p1.Y + 3*u*t*t*p2.Y + t*t*t*p3.Y,
	}
}
