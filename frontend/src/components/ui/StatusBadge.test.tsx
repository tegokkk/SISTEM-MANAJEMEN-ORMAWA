import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./StatusBadge";

describe("StatusBadge", () => {
  it("translates known domain statuses and keeps unknown statuses visible", () => {
    const { rerender } = render(<StatusBadge status="RUNNING" />);
    expect(screen.getByText("Berjalan")).toBeTruthy();

    rerender(<StatusBadge status="CUSTOM_STATUS" />);
    expect(screen.getByText("CUSTOM_STATUS")).toBeTruthy();
  });
});
