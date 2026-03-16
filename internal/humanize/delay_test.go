package humanize

import (
	"testing"
)

func TestClickDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := ClickDelay()
		ms := d.Milliseconds()
		if ms < int64(ClickDelayMin) || ms > int64(ClickDelayMax) {
			t.Fatalf("ClickDelay() = %dms, want [%d, %d]", ms, ClickDelayMin, ClickDelayMax)
		}
	}
}

func TestPageLoadDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := PageLoadDelay()
		ms := d.Milliseconds()
		if ms < int64(PageLoadDelayMin) || ms > int64(PageLoadDelayMax) {
			t.Fatalf("PageLoadDelay() = %dms, want [%d, %d]", ms, PageLoadDelayMin, PageLoadDelayMax)
		}
	}
}

func TestTypeDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := TypeDelay()
		ms := d.Milliseconds()
		if ms < int64(TypeDelayMin) || ms > int64(TypeDelayMax) {
			t.Fatalf("TypeDelay() = %dms, want [%d, %d]", ms, TypeDelayMin, TypeDelayMax)
		}
	}
}

func TestRandomDelay_Range(t *testing.T) {
	for i := 0; i < 1000; i++ {
		d := RandomDelay(200, 500)
		ms := d.Milliseconds()
		if ms < 200 || ms > 500 {
			t.Fatalf("RandomDelay(200, 500) = %dms, want [200, 500]", ms)
		}
	}
}

func TestRandomDelay_MinEqualsMax(t *testing.T) {
	for i := 0; i < 100; i++ {
		d := RandomDelay(300, 300)
		ms := d.Milliseconds()
		if ms != 300 {
			t.Fatalf("RandomDelay(300, 300) = %dms, want 300", ms)
		}
	}
}

func TestRandomDelay_SwappedMinMax(t *testing.T) {
	for i := 0; i < 100; i++ {
		d := RandomDelay(500, 200)
		ms := d.Milliseconds()
		if ms < 200 || ms > 500 {
			t.Fatalf("RandomDelay(500, 200) = %dms, want [200, 500]", ms)
		}
	}
}

func TestClickDelay_Randomness(t *testing.T) {
	values := make(map[int64]bool)
	for i := 0; i < 100; i++ {
		values[ClickDelay().Milliseconds()] = true
	}
	if len(values) < 2 {
		t.Fatal("ClickDelay() appears to return constant values")
	}
}

func TestPageLoadDelay_Randomness(t *testing.T) {
	values := make(map[int64]bool)
	for i := 0; i < 100; i++ {
		values[PageLoadDelay().Milliseconds()] = true
	}
	if len(values) < 2 {
		t.Fatal("PageLoadDelay() appears to return constant values")
	}
}

func TestTypeDelay_Randomness(t *testing.T) {
	values := make(map[int64]bool)
	for i := 0; i < 100; i++ {
		values[TypeDelay().Milliseconds()] = true
	}
	if len(values) < 2 {
		t.Fatal("TypeDelay() appears to return constant values")
	}
}
