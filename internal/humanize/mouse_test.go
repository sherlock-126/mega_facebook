package humanize

import (
	"math"
	"testing"
)

func TestBezierCurve_StartsAndEnds(t *testing.T) {
	start := Point{100, 200}
	end := Point{500, 400}
	points := BezierCurve(start, end, 20)

	if points[0] != start {
		t.Fatalf("first point = %v, want %v", points[0], start)
	}
	if points[len(points)-1] != end {
		t.Fatalf("last point = %v, want %v", points[len(points)-1], end)
	}
}

func TestBezierCurve_PointCount(t *testing.T) {
	points := BezierCurve(Point{0, 0}, Point{100, 100}, 25)
	if len(points) != 25 {
		t.Fatalf("got %d points, want 25", len(points))
	}
}

func TestBezierCurve_StepsZero(t *testing.T) {
	points := BezierCurve(Point{0, 0}, Point{100, 100}, 0)
	if len(points) < 2 {
		t.Fatalf("got %d points, want at least 2", len(points))
	}
}

func TestBezierCurve_StepsNegative(t *testing.T) {
	points := BezierCurve(Point{0, 0}, Point{100, 100}, -5)
	if len(points) < 2 {
		t.Fatalf("got %d points, want at least 2", len(points))
	}
}

func TestBezierCurve_SameStartEnd(t *testing.T) {
	p := Point{50, 50}
	points := BezierCurve(p, p, 10)

	for i, pt := range points {
		// All points should be very close to the origin since control points
		// will also be at the same location (dist=0, offsets=0).
		if math.Abs(pt.X-p.X) > 1 || math.Abs(pt.Y-p.Y) > 1 {
			t.Fatalf("point[%d] = %v, expected near %v", i, pt, p)
		}
	}
}

func TestBezierCurve_Smoothness(t *testing.T) {
	// Verify that consecutive points don't jump wildly (basic smoothness check).
	start := Point{0, 0}
	end := Point{1000, 500}
	points := BezierCurve(start, end, 50)

	for i := 1; i < len(points); i++ {
		dx := points[i].X - points[i-1].X
		dy := points[i].Y - points[i-1].Y
		stepDist := math.Sqrt(dx*dx + dy*dy)
		// Each step should be reasonable — no single step should exceed
		// half the total distance.
		totalDist := math.Sqrt(1000*1000 + 500*500)
		if stepDist > totalDist/2 {
			t.Fatalf("step %d distance %f exceeds half of total %f", i, stepDist, totalDist)
		}
	}
}

func TestWithOvershoot_StartsAndEnds(t *testing.T) {
	start := Point{100, 200}
	end := Point{500, 400}
	points := WithOvershoot(start, end, 20)

	if points[0] != start {
		t.Fatalf("first point = %v, want %v", points[0], start)
	}
	if points[len(points)-1] != end {
		t.Fatalf("last point = %v, want %v", points[len(points)-1], end)
	}
}

func TestWithOvershoot_HasMultiplePoints(t *testing.T) {
	start := Point{0, 0}
	end := Point{500, 500}

	overshoot := WithOvershoot(start, end, 20)

	// Overshoot path should have at least the requested step count
	// (main path + correction path - 1 for junction dedup).
	if len(overshoot) < 3 {
		t.Fatalf("overshoot path has only %d points, expected at least 3", len(overshoot))
	}
}

func TestWithOvershoot_SameStartEnd(t *testing.T) {
	p := Point{50, 50}
	points := WithOvershoot(p, p, 10)

	if len(points) < 2 {
		t.Fatalf("got %d points, want at least 2", len(points))
	}
	if points[0] != p {
		t.Fatalf("first point = %v, want %v", points[0], p)
	}
	if points[len(points)-1] != p {
		t.Fatalf("last point = %v, want %v", points[len(points)-1], p)
	}
}

func TestWithOvershoot_OvershotPastTarget(t *testing.T) {
	// Verify that at least one intermediate point is beyond the target.
	start := Point{0, 0}
	end := Point{1000, 0}

	// Run multiple times since overshoot magnitude is random.
	overshotSeen := false
	for trial := 0; trial < 50; trial++ {
		points := WithOvershoot(start, end, 30)
		for _, p := range points {
			if p.X > end.X+1 { // past target
				overshotSeen = true
				break
			}
		}
		if overshotSeen {
			break
		}
	}
	if !overshotSeen {
		t.Fatal("expected at least one point past the target (overshoot)")
	}
}
