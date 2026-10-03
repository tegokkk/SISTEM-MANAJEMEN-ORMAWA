import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("guards page boundaries and requests the next page", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={1} totalPages={3} onPageChange={onPageChange} />);
    expect(screen.getByRole("button", { name: "Halaman sebelumnya" }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Halaman berikutnya" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
